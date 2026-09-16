import type { Ref } from 'vue'
import type { GroupedResult } from '../types/analyze'
import type { PullRequestDiff } from '../types/diff'
import type { FetchDiffParams } from '../types/provider'
import { ref } from 'vue'
import { ruleBasedAdapter } from '../analyze/adapters/rule-based'
import { computeEntrySizeBytes, getEntry, putEntry, touchEntry } from '../cache/pr-cache'
import { getDefaultCacheStorage } from '../cache/storage'
import { fetchPullRequest } from '../providers/github/api'
import { useProvider } from './useProvider'

export interface UsePullRequestReturn {
  diff: Ref<PullRequestDiff | undefined>
  grouped: Ref<GroupedResult | undefined>
  isLoading: Ref<boolean>
  error: Ref<Error | undefined>
  isStale: Ref<boolean>
  load: () => Promise<void>
  refresh: () => Promise<void>
}

export function usePullRequest(params: FetchDiffParams, opts: { token?: string } = {}): UsePullRequestReturn {
  const diff = ref<PullRequestDiff>()
  const grouped = ref<GroupedResult>()
  const isLoading = ref(false)
  const error = ref<Error>()
  const isStale = ref(false)

  async function analyzeAndStore(key: string, freshDiff: PullRequestDiff) {
    const storage = await getDefaultCacheStorage()
    const result = await ruleBasedAdapter.analyze(freshDiff)
    diff.value = freshDiff
    grouped.value = result
    const analyzedBy = { 'rule-based': result }
    await putEntry(storage, {
      key,
      diff: freshDiff,
      headSha: freshDiff.meta.head?.sha ?? '',
      analyzedBy,
      lastViewedAt: Date.now(),
      sizeBytes: computeEntrySizeBytes(freshDiff, analyzedBy),
    })
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
          grouped.value = cached.analyzedBy['rule-based']
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
          grouped.value = cached.analyzedBy['rule-based']
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

  return { diff, grouped, isLoading, error, isStale, load, refresh }
}
