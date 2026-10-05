import type { AgentMessage } from '@earendil-works/pi-agent-core'
import type { CacheRepositories, LlmSession } from '@pulls.review/core/cache'
import type { AiActivity, AiJobSnapshot, AiUsage } from '@pulls.review/core/local-rpc'
import type { DiffsPayload, GroupedResult } from '@pulls.review/core/types'
import type { Ref } from 'vue'
import type { TrackedActivity } from '../components/ai/ai-activity'
import type { DiffsStoreLlm, LlmProgress } from './types'
import { resolveModel } from '@pulls.review/core/analyze'
import { LLM_ENGINES } from '@pulls.review/core/local-rpc'
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import { llmAdapter, runLlmAnalysis } from '../analyze/adapters/llm'
import { activitiesFromTranscript, upsertActivities, usageFromTranscript } from '../components/ai/ai-activity'
import { useLlmChat } from '../composables/useLlmChat'
import { t } from '../i18n'
import { describeProgress, localizeError } from '../i18n/core-messages'
import { listAiJobs } from '../local/ai-jobs'
import { getAiRpc } from '../local/ai-rpc'
import { settings } from '../state/settings'
import { analysisJobKey, analysisJobLabel, buildPrContext, runUsage } from './ai-job'

export interface LlmStoreOptions {
  cache: CacheRepositories
  diff: Ref<DiffsPayload | undefined>
  /** The analysis transcript the chat continues from; `createDiffsStore` owns it because it is loaded from and reset with the PR cache entry. */
  session: Ref<LlmSession | undefined>
  /** PR cache key of the loaded diff; unset until the diff loads. */
  getCacheKey: () => string | undefined
  /** Publishes a fresh AI result as `analyzedBy.llm`. */
  setResult: (result: GroupedResult) => void
  /** Switches the view onto the `llm` grouping once a run has finished. */
  showLlmResult: () => Promise<void>
}

function isCliEngine(engine: string | undefined): boolean {
  return (LLM_ENGINES as readonly string[]).includes(engine ?? '')
}

/**
 * The LLM sub-store behind `DiffsStore.llm` - analysis runs, their progress/error, and
 * follow-up chat. Only ever loaded by `createDiffsStore` via `import()` behind
 * `import.meta.env.PR_LLM`, so a build with the flag off ships none of it.
 */
export function createLlmStore(opts: LlmStoreOptions): DiffsStoreLlm {
  const isAnalyzing = ref(false)
  const progress = ref<LlmProgress>()
  const transcript = shallowRef<AgentMessage[]>([])
  const transcriptSeenAt = ref(0)
  const cliActivities = shallowRef<TrackedActivity[]>([])
  const error = ref<Error>()
  const engine = ref<string>()
  const startedAt = ref<number>()
  const endedAt = ref<number>()
  const jobUsage = shallowRef<AiUsage>()
  const cancelled = ref(false)
  const resumed = ref(false)
  const isSetup = computed(() => llmAdapter.available)
  let abortController: AbortController | undefined

  const activities = computed(() => isCliEngine(engine.value)
    ? cliActivities.value
    : activitiesFromTranscript(transcript.value, isAnalyzing.value, t, transcriptSeenAt.value))
  const usage = computed(() => jobUsage.value ?? usageFromTranscript(transcript.value))

  async function setSession(session: LlmSession) {
    opts.session.value = session
    const key = opts.getCacheKey()
    if (key)
      await opts.cache.diffs.setLlmSession(key, session)
  }

  async function setResult(result: GroupedResult) {
    opts.setResult(result)
    const key = opts.getCacheKey()
    if (key)
      await opts.cache.diffs.setAnalyzedResult(key, 'llm', result)
  }

  const chat = useLlmChat({
    diff: opts.diff,
    session: opts.session,
    onSessionChange: setSession,
    onGroupingUpdate: setResult,
  })

  // `cli-stream` hands over what the CLI reported minus reasoning tokens and wall time; the job list has all of it.
  async function loadJobUsage(match: (job: AiJobSnapshot) => boolean): Promise<AiUsage | undefined> {
    const rpc = getAiRpc()
    return rpc ? runUsage(await listAiJobs(rpc).catch(() => []), match) : undefined
  }

  async function run(resumeFrom?: AiJobSnapshot) {
    const currentDiff = opts.diff.value
    if (!currentDiff)
      return
    chat.stop()
    const resolved = resolveModel(settings.value.llm)
    const key = resolved && analysisJobKey(currentDiff, resolved)
    const label = analysisJobLabel(currentDiff)
    const runStartedAt = resumeFrom?.startedAt ?? Date.now()
    error.value = undefined
    transcript.value = []
    cliActivities.value = []
    jobUsage.value = undefined
    engine.value = resolved?.model.provider
    startedAt.value = runStartedAt
    endedAt.value = undefined
    cancelled.value = false
    resumed.value = resumeFrom !== undefined
    isAnalyzing.value = true
    const controller = new AbortController()
    abortController = controller
    const isCurrent = () => abortController === controller
    try {
      const { result, transcript: messages } = await runLlmAnalysis(currentDiff, {
        onProgress: next => progress.value = { step: next.step, message: describeProgress(next) },
        onTranscript: (next) => {
          transcript.value = next
          transcriptSeenAt.value = Date.now()
        },
        onActivity: (next: AiActivity[]) => {
          if (isCurrent())
            cliActivities.value = upsertActivities(cliActivities.value, next)
        },
        signal: controller.signal,
        context: buildPrContext(currentDiff),
        label,
        key,
      })
      if (controller.signal.aborted)
        return
      await setResult(result)
      await setSession({ messages, chatStartIndex: messages.length })
    }
    catch (err) {
      if (!controller.signal.aborted)
        error.value = localizeError(err)
    }
    finally {
      if (isCurrent()) {
        abortController = undefined
        cancelled.value = controller.signal.aborted
        endedAt.value = Date.now()
        if (isCliEngine(engine.value)) {
          void loadJobUsage(job => job.status !== 'running' && (job.key ? job.key === key : job.label === label) && job.startedAt >= runStartedAt - 1000)
            .then((found) => {
              if (startedAt.value === runStartedAt && !isAnalyzing.value)
                jobUsage.value = found
            })
        }
      }
      progress.value = undefined
      isAnalyzing.value = false
    }
    await opts.showLlmResult()
  }

  async function reanalyze() {
    await run()
  }

  const checkedJobKeys = new Set<string>()

  // A reload mid-run would otherwise leave the server's job unseen; rerunning with its key follows it instead.
  async function resumeRunningJob(diff: DiffsPayload) {
    const rpc = getAiRpc()
    const resolved = resolveModel(settings.value.llm)
    if (!rpc || !resolved || !isCliEngine(resolved.model.provider) || isAnalyzing.value)
      return
    const key = analysisJobKey(diff, resolved)
    if (checkedJobKeys.has(key))
      return
    checkedJobKeys.add(key)
    const jobs = await listAiJobs(rpc).catch(() => [])
    const job = jobs.find(candidate => candidate.status === 'running' && candidate.key === key)
    if (job && !isAnalyzing.value && opts.diff.value === diff)
      await run(job)
  }

  watch(opts.diff, (diff) => {
    if (diff)
      void resumeRunningJob(diff)
  }, { immediate: true })

  function abort() {
    chat.stop()
    abortController?.abort()
  }

  return reactive({
    isSetup,
    isAnalyzing,
    progress,
    transcript,
    error,
    activities,
    engine,
    startedAt,
    endedAt,
    usage,
    cancelled,
    resumed,
    reanalyze,
    chat: reactive(chat),
    abort,
  }) as DiffsStoreLlm
}
