import type { GroupedResult, GroupSource } from '../types/analyze'
import type { DiffsPayload } from '../types/diff'
import type { FetchDiffParams } from '../types/provider'
import type { DiffsStore } from './types'
import { computed, reactive, ref } from 'vue'
import { resolveAdapter } from '../analyze'
import { llmAdapter } from '../analyze/adapters/llm'
import { ruleBasedAdapter } from '../analyze/adapters/rule-based'
import { computeEntrySizeBytes, getEntry, putEntry, setAnalyzedResult, touchEntry } from '../cache/pr-cache'
import { getReviewed, setReviewed } from '../cache/review-cache'
import { getDefaultCacheStorage } from '../cache/storage'
import { resolveGroups } from '../components/diff/group-utils'
import { useProvider } from '../composables/useProvider'
import { fetchPullRequest } from '../providers/github/api'
import { layout } from '../state/layout'

/**
 * Creates a `DiffsStore` backed by real providers/cache/adapters - the isomorphic
 * counterpart to `createMockDiffsStore`. Works for both `github-pr` and `patch-text`
 * params, matching `FetchDiffParams`'s discriminated union.
 */
export function createDiffsStore(params: FetchDiffParams, opts: { token?: string, llm?: boolean, isEmbedded?: boolean } = {}): DiffsStore {
  const llmEnabled = opts.llm ?? true

  const diff = ref<DiffsPayload>()
  const analyzedBy = ref<Partial<Record<GroupSource, GroupedResult>>>({})
  const isLoading = ref(false)
  const error = ref<Error>()
  const isStale = ref(false)
  const analyzeMode = ref<GroupSource>(llmEnabled ? 'llm' : 'rule-based')
  const isAnalyzing = ref(false)
  const cacheKey = ref<string>()
  const reviewed = ref(new Set<string>())

  // Falls back to the always-instant rule-based grouping while the selected mode
  // (currently only `llm` can be in this state) hasn't been analyzed yet for this
  // diff, so the header/view never lose their data just from switching modes.
  const grouped = computed(() => analyzedBy.value[analyzeMode.value] ?? analyzedBy.value['rule-based'])
  const hasAiResult = computed(() => analyzedBy.value.llm !== undefined)
  const isSetup = computed(() => llmAdapter.available)
  const groups = computed(() => diff.value && grouped.value ? resolveGroups(grouped.value.groups, diff.value.files) : [])

  async function loadReviewed() {
    if (!diff.value)
      return
    const storage = await getDefaultCacheStorage()
    reviewed.value = await getReviewed(storage, diff.value.files.map(file => file.sha))
  }

  async function toggleReviewed(sha: string, isReviewed: boolean) {
    const storage = await getDefaultCacheStorage()
    await setReviewed(storage, sha, isReviewed)
    const next = new Set(reviewed.value)
    if (isReviewed)
      next.add(sha)
    else
      next.delete(sha)
    reviewed.value = next
  }

  async function runAnalysis(mode: GroupSource) {
    if (!diff.value)
      return
    isAnalyzing.value = true
    try {
      const result = await resolveAdapter(mode).analyze(diff.value)
      analyzedBy.value = { ...analyzedBy.value, [mode]: result }
      if (cacheKey.value) {
        const storage = await getDefaultCacheStorage()
        await setAnalyzedResult(storage, cacheKey.value, mode, result)
      }
    }
    finally {
      isAnalyzing.value = false
    }
  }

  async function setAnalyzeMode(mode: GroupSource) {
    analyzeMode.value = mode
    // `llm` is never auto-run - a paid/slow call must always be an explicit click
    // (the "(Re-)Analyze with AI" button), never a side effect of flipping a switch.
    if (mode !== 'llm' && analyzedBy.value[mode] === undefined)
      await runAnalysis(mode)
  }

  async function reanalyze() {
    await runAnalysis('llm')
    await setAnalyzeMode('llm')
  }

  async function analyzeAndStore(key: string, freshDiff: DiffsPayload) {
    const storage = await getDefaultCacheStorage()
    const result = await ruleBasedAdapter.analyze(freshDiff)
    diff.value = freshDiff
    cacheKey.value = key
    const freshAnalyzedBy = { 'rule-based': result }
    analyzedBy.value = freshAnalyzedBy
    await putEntry(storage, {
      key,
      diff: freshDiff,
      headSha: freshDiff.head?.sha ?? '',
      analyzedBy: freshAnalyzedBy,
      lastViewedAt: Date.now(),
      sizeBytes: computeEntrySizeBytes(freshDiff, freshAnalyzedBy),
    })
    await loadReviewed()
    // `llm` is never auto-run, even here - a paid/slow call must always be an explicit
    // click (the "(Re-)Analyze with AI" button), never a side effect of loading or
    // refreshing a diff. Only the free/instant modes re-run automatically.
    if (analyzeMode.value !== 'rule-based' && analyzeMode.value !== 'llm')
      await runAnalysis(analyzeMode.value)
  }

  async function fetchFresh() {
    const provider = useProvider(params.kind === 'github-pr' ? 'github' : 'paste')
    const freshDiff = await provider.fetchDiff(params, opts)
    const key = freshDiff.id // already `github:owner/repo#number` or `paste:<contentHash>`, matching pr-cache's key scheme
    await analyzeAndStore(key, freshDiff)
    return key
  }

  async function checkStaleness(cachedHeadSha: string) {
    if (params.kind !== 'github-pr')
      return
    try {
      const pr = await fetchPullRequest(params.owner, params.repo, params.number, opts.token)
      isStale.value = pr.head.sha !== cachedHeadSha
    }
    catch {
      // Non-fatal: the cached view still renders even if the cheap staleness check fails.
    }
  }

  async function load() {
    isLoading.value = true
    error.value = undefined
    isStale.value = false
    try {
      if (params.kind === 'github-pr') {
        const key = `github:${params.owner}/${params.repo}#${params.number}`
        const storage = await getDefaultCacheStorage()
        const cached = await getEntry(storage, key)
        if (cached) {
          diff.value = cached.diff
          cacheKey.value = key
          analyzedBy.value = cached.analyzedBy
          await touchEntry(storage, key)
          await loadReviewed()
          void checkStaleness(cached.headSha)
        }
        else {
          await fetchFresh()
        }
      }
      else {
        // A paste has no live source: parsing is cheap and local, so always run it, then
        // let the cache short-circuit re-analysis on a same-session revisit (e.g. a reload).
        const provider = useProvider('paste')
        const freshDiff = await provider.fetchDiff(params, opts)
        const key = freshDiff.id // already `github:owner/repo#number` or `paste:<contentHash>`, matching pr-cache's key scheme
        const storage = await getDefaultCacheStorage()
        const cached = await getEntry(storage, key)
        if (cached) {
          diff.value = cached.diff
          cacheKey.value = key
          analyzedBy.value = cached.analyzedBy
          await touchEntry(storage, key)
          await loadReviewed()
        }
        else {
          await analyzeAndStore(key, freshDiff)
        }
      }
    }
    catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
    }
    finally {
      isLoading.value = false
    }
  }

  async function refresh() {
    isLoading.value = true
    error.value = undefined
    try {
      await fetchFresh()
      isStale.value = false
    }
    catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
    }
    finally {
      isLoading.value = false
    }
  }

  const ui = reactive({
    layout,
    isEmbedded: opts.isEmbedded ?? false,
    setLayout: (mode: 'split' | 'unified') => { layout.value = mode },
  })

  return reactive({
    diff,
    grouped,
    isLoading,
    error,
    isStale,
    reviewed,
    groups,
    ui,
    llm: llmEnabled
      ? reactive({
          isSetup,
          isAnalyzing,
          hasAiResult,
          analyzeMode,
          setAnalyzeMode,
          reanalyze,
        })
      : undefined,
    load,
    refresh,
    toggleReviewed,
  }) as DiffsStore
}
