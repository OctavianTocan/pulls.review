import type { Ref } from 'vue'
import type { GroupedResult, GroupSource } from '../types/analyze'
import type { PullRequestDiff } from '../types/diff'
import type { FetchDiffParams } from '../types/provider'
import { computed, ref } from 'vue'
import { resolveAdapter } from '../analyze'
import { llmAdapter } from '../analyze/adapters/llm'
import { ruleBasedAdapter } from '../analyze/adapters/rule-based'
import { computeEntrySizeBytes, getEntry, putEntry, setAnalyzedResult, touchEntry } from '../cache/pr-cache'
import { getDefaultCacheStorage } from '../cache/storage'
import { fetchPullRequest } from '../providers/github/api'
import { useProvider } from './useProvider'

export interface UsePullRequestReturn {
  diff: Ref<PullRequestDiff | undefined>
  grouped: Ref<GroupedResult | undefined>
  isLoading: Ref<boolean>
  error: Ref<Error | undefined>
  isStale: Ref<boolean>
  analyzeMode: Ref<GroupSource>
  isAnalyzing: Ref<boolean>
  /** Whether the `llm` adapter has a usable key/gateway token configured. */
  llmAvailable: Ref<boolean>
  /** Whether `llm` has already produced a result for the current diff. */
  hasAiResult: Ref<boolean>
  load: () => Promise<void>
  refresh: () => Promise<void>
  /** Switches the active grouping. `none`/`rule-based` analyze immediately (free, instant); `llm` only switches the view - call `reanalyzeWithAi` to actually run it. */
  setAnalyzeMode: (mode: GroupSource) => Promise<void>
  reanalyzeWithAi: () => Promise<void>
}

export function usePullRequest(params: FetchDiffParams, opts: { token?: string } = {}): UsePullRequestReturn {
  const diff = ref<PullRequestDiff>()
  const analyzedBy = ref<Partial<Record<GroupSource, GroupedResult>>>({})
  const isLoading = ref(false)
  const error = ref<Error>()
  const isStale = ref(false)
  const analyzeMode = ref<GroupSource>('rule-based')
  const isAnalyzing = ref(false)
  const cacheKey = ref<string>()

  // Falls back to the always-instant rule-based grouping while the selected mode
  // (currently only `llm` can be in this state) hasn't been analyzed yet for this
  // diff, so the header/view never lose their data just from switching modes.
  const grouped = computed(() => analyzedBy.value[analyzeMode.value] ?? analyzedBy.value['rule-based'])
  const llmAvailable = computed(() => llmAdapter.available)
  const hasAiResult = computed(() => analyzedBy.value.llm !== undefined)

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

  async function reanalyzeWithAi() {
    await runAnalysis('llm')
  }

  async function analyzeAndStore(key: string, freshDiff: PullRequestDiff) {
    const storage = await getDefaultCacheStorage()
    const result = await ruleBasedAdapter.analyze(freshDiff)
    diff.value = freshDiff
    cacheKey.value = key
    const freshAnalyzedBy = { 'rule-based': result }
    analyzedBy.value = freshAnalyzedBy
    await putEntry(storage, {
      key,
      diff: freshDiff,
      headSha: freshDiff.meta.head?.sha ?? '',
      analyzedBy: freshAnalyzedBy,
      lastViewedAt: Date.now(),
      sizeBytes: computeEntrySizeBytes(freshDiff, freshAnalyzedBy),
    })
    // A user-initiated refresh, not a silent one - safe to re-run the currently
    // selected mode (even `llm`) against the fresh diff right away.
    if (analyzeMode.value !== 'rule-based')
      await runAnalysis(analyzeMode.value)
  }

  async function fetchFresh() {
    const provider = useProvider(params.kind === 'github-pr' ? 'github' : 'paste')
    const freshDiff = await provider.fetchDiff(params, opts)
    const key = freshDiff.meta.id // already `github:owner/repo#number` or `paste:<contentHash>`, matching pr-cache's key scheme
    await analyzeAndStore(key, freshDiff)
    return key
  }

  async function checkStaleness(key: string, cachedHeadSha: string) {
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
          void checkStaleness(key, cached.headSha)
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
        const key = freshDiff.meta.id // already `github:owner/repo#number` or `paste:<contentHash>`, matching pr-cache's key scheme
        const storage = await getDefaultCacheStorage()
        const cached = await getEntry(storage, key)
        if (cached) {
          diff.value = cached.diff
          cacheKey.value = key
          analyzedBy.value = cached.analyzedBy
          await touchEntry(storage, key)
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

  return {
    diff,
    grouped,
    isLoading,
    error,
    isStale,
    analyzeMode,
    isAnalyzing,
    llmAvailable,
    hasAiResult,
    load,
    refresh,
    setAnalyzeMode,
    reanalyzeWithAi,
  }
}
