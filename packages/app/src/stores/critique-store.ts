import type { ResolvedModel } from '@pulls.review/core/analyze'
import type { CacheRepositories } from '@pulls.review/core/cache'
import type { ReviewLens } from '@pulls.review/core/local-rpc'
import type { CritiqueFinding, CritiqueResult, CritiqueSeverity, DiffsPayload, ReviewDraftTarget } from '@pulls.review/core/types'
import type { Ref } from 'vue'
import type { LensSource } from '../local/lenses'
import type { CritiqueFocus, DiffsStoreCritique, DiffsStoreReviews } from './types'
import { resolveModel } from '@pulls.review/core/analyze'
import { critiqueReviewBody, findingCommentBody, isCliEngine, runCritique } from '@pulls.review/core/llm'
import { serializeRef } from '@pulls.review/core/types'
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import { t } from '../i18n'
import { settings } from '../state/settings'
import { createActivityLog, isAbortError, toError } from './ai-activity'

export interface CritiqueStoreOptions {
  cache: CacheRepositories
  /** The diff being reviewed; a new head or ref clears what was shown for the old one. */
  diff: Ref<DiffsPayload | undefined>
  /** Where findings are posted; `undefined` when the source takes no reviews. */
  getReviews: () => Pick<DiffsStoreReviews, 'canWrite' | 'postReview'> | undefined
  /** Where lenses come from; `undefined` offers none. */
  lenses?: LensSource
}

const SEVERITIES: CritiqueSeverity[] = ['bug', 'risk', 'nit']

/**
 * The cache variant a critique is saved under.
 * @param headSha - The reviewed commit.
 * @param resolved - The engine, model and effort it ran with.
 * @param lens - The lens it ran through; `undefined` for the general review.
 * @returns The variant key.
 */
export function critiqueVariant(headSha: string | undefined, resolved: ResolvedModel, lens: string | undefined): string {
  return [headSha ?? '', resolved.model.provider, resolved.model.id, resolved.effort ?? '', lens ?? ''].join(':')
}

function targetOf(finding: CritiqueFinding): ReviewDraftTarget {
  const { path, side, line, startLine } = finding
  return { path, side, line, ...(startLine !== undefined ? { startLine, startSide: side } : {}) }
}

function defaultSelection(result: CritiqueResult | undefined): Set<string> {
  return new Set(result?.findings.filter(finding => finding.severity !== 'nit').map(finding => finding.id))
}

/**
 * The AI review of one diff, run through the CLI engine the settings name.
 * @param opts - The cache, the diff and where to post and find lenses.
 * @returns The reactive critique store; `abort` stops following a running review.
 */
export function createCritiqueStore(opts: CritiqueStoreOptions): DiffsStoreCritique {
  const { cache, diff, getReviews, lenses } = opts
  const result = shallowRef<CritiqueResult>()
  const isRunning = ref(false)
  const error = ref<Error>()
  const activity = ref<string>()
  const lens = ref<string>()
  const severities = ref<CritiqueSeverity[]>([...SEVERITIES])
  const selected = ref(new Set<string>())
  const posted = ref(new Set<string>())
  const isPosting = ref(false)
  const postError = ref<Error>()
  const focused = ref<CritiqueFocus>()
  const startedAt = ref(0)
  const now = ref(0)
  const log = createActivityLog()
  let controller: AbortController | undefined
  let timer: ReturnType<typeof setInterval> | undefined
  let focusNonce = 0

  const available = computed(() => isCliEngine(resolveModel(settings.value.llm)?.model.provider ?? ''))
  const visibleFindings = computed(() => result.value?.findings.filter(finding => severities.value.includes(finding.severity)) ?? [])
  const toPost = computed(() => visibleFindings.value.filter(finding => selected.value.has(finding.id) && !posted.value.has(finding.id)))
  const canPost = computed(() => {
    const reviews = getReviews()
    return !!reviews?.canWrite && toPost.value.length > 0 && !isPosting.value && result.value?.headSha === diff.value?.head?.sha
  })
  const elapsed = computed(() => isRunning.value ? Math.max(0, Math.floor((now.value - startedAt.value) / 1000)) : 0)
  const defaultBody = computed(() => result.value ? critiqueReviewBody(result.value) : '')

  function show(next: CritiqueResult | undefined) {
    result.value = next
    lens.value = next?.lens
    selected.value = defaultSelection(next)
    posted.value = new Set()
    postError.value = undefined
  }

  function stopTimer() {
    clearInterval(timer)
    timer = undefined
  }

  function abort() {
    controller?.abort()
    controller = undefined
    isRunning.value = false
    activity.value = undefined
    stopTimer()
  }

  // A different diff or head makes the shown findings point at lines that may have moved.
  watch(() => diff.value && `${serializeRef(diff.value.ref)}@${diff.value.head?.sha ?? ''}`, async (subject) => {
    abort()
    error.value = undefined
    show(undefined)
    const loaded = diff.value
    if (!subject || !loaded)
      return
    const saved = await cache.critiques.latest(serializeRef(loaded.ref), loaded.head?.sha).catch(() => undefined)
    if (diff.value === loaded && !isRunning.value && !result.value)
      show(saved)
  }, { immediate: true })

  async function lensOf(name: string | undefined): Promise<{ name: string, instructions: string } | undefined> {
    if (!name)
      return undefined
    const instructions = await lenses?.get(name)
    if (!instructions)
      throw new Error(t('critique.lensMissing', { name }))
    return { name, instructions }
  }

  function startRunning(current: AbortController) {
    controller = current
    isRunning.value = true
    startedAt.value = now.value = Date.now()
    timer = setInterval(() => {
      now.value = Date.now()
    }, 1000)
    log.clear()
  }

  function stopRunning(current: AbortController) {
    if (controller !== current)
      return
    controller = undefined
    isRunning.value = false
    activity.value = undefined
    stopTimer()
  }

  async function run(options: { lens?: string, force?: boolean } = {}) {
    const loaded = diff.value
    const resolved = resolveModel(settings.value.llm)
    if (!loaded || !resolved || !isCliEngine(resolved.model.provider))
      return
    abort()
    error.value = undefined
    lens.value = options.lens
    const scope = serializeRef(loaded.ref)
    const variant = critiqueVariant(loaded.head?.sha, resolved, options.lens)
    const saved = options.force ? undefined : await cache.critiques.get(scope, variant).catch(() => undefined)
    if (saved) {
      if (diff.value === loaded)
        show(saved)
      return
    }

    const current = new AbortController()
    startRunning(current)
    try {
      const next = await runCritique(loaded, resolved, {
        lens: await lensOf(options.lens),
        signal: current.signal,
        onActivity: (activities) => {
          if (controller === current)
            activity.value = log.merge(activities)
        },
      })
      // Saved even when the view moved on, so the paid review is there on return.
      await cache.critiques.set(scope, variant, next).catch(() => {})
      if (controller === current && diff.value === loaded)
        show(next)
    }
    catch (err) {
      if (controller === current && !isAbortError(err))
        error.value = toError(err)
    }
    finally {
      stopRunning(current)
    }
  }

  async function post(body: string) {
    const reviews = getReviews()
    const findings = toPost.value
    if (!reviews || findings.length === 0 || isPosting.value)
      return
    isPosting.value = true
    postError.value = undefined
    try {
      await reviews.postReview(body, findings.map(finding => ({ target: targetOf(finding), body: findingCommentBody(finding) })))
      const ids = findings.map(finding => finding.id)
      posted.value = new Set([...posted.value, ...ids])
      const remaining = new Set(selected.value)
      ids.forEach(id => remaining.delete(id))
      selected.value = remaining
    }
    catch (err) {
      postError.value = toError(err)
    }
    finally {
      isPosting.value = false
    }
  }

  function setSelected(id: string, value: boolean) {
    const next = new Set(selected.value)
    value ? next.add(id) : next.delete(id)
    selected.value = next
  }

  function selectAll(value: boolean) {
    const next = new Set(selected.value)
    for (const finding of visibleFindings.value) {
      if (!posted.value.has(finding.id))
        value ? next.add(finding.id) : next.delete(finding.id)
    }
    selected.value = next
  }

  return reactive({
    available,
    hasLenses: !!lenses,
    result,
    isRunning,
    error,
    activity,
    elapsed,
    lens,
    severities,
    visibleFindings,
    selected,
    posted,
    toPost,
    canPost,
    isPosting,
    postError,
    defaultBody,
    focused,
    listLenses: async (): Promise<ReviewLens[]> => lenses ? await lenses.list() : [],
    run,
    abort,
    setSeverities: (next: CritiqueSeverity[]) => { severities.value = SEVERITIES.filter(severity => next.includes(severity)) },
    setSelected,
    selectAll,
    focus: (finding: CritiqueFinding) => { focused.value = { id: finding.id, path: finding.path, nonce: ++focusNonce } },
    post,
  }) as DiffsStoreCritique
}
