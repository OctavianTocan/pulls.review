import type { Ref } from 'vue'
import type { PullRequestDiff, PullRequestState } from '../types/diff'
import { onUnmounted, ref, watchEffect } from 'vue'

export interface PrNavContext {
  title: string
  url?: string
  state?: PullRequestState
  reviewedCount: number
  totalFiles: number
  additions: number
  deletions: number
}

// Module-level singleton (not a prop/slot): AppHeader lives in the layout, outside the
// page that actually has PR data, so a page publishes its summary here and it's cleared
// on unmount - the simplest way to feed the sticky nav bar without threading PR state
// through the layout.
const context = ref<PrNavContext>()

export function usePrNavContext(): Ref<PrNavContext | undefined> {
  return context
}

/** Called from a page (not DiffView itself, which stays a pure props-in component) to keep the sticky nav bar in sync with its `diff`/`reviewed` state, for as long as that page is mounted. */
export function useSyncPrNavContext(diff: Ref<PullRequestDiff | undefined>, reviewed: Ref<Set<string>>): void {
  watchEffect(() => {
    if (!diff.value) {
      context.value = undefined
      return
    }
    const files = diff.value.files
    context.value = {
      title: diff.value.meta.title,
      url: diff.value.meta.url,
      state: diff.value.meta.state,
      reviewedCount: files.filter(file => reviewed.value.has(file.sha)).length,
      totalFiles: files.length,
      additions: files.reduce((sum, file) => sum + file.additions, 0),
      deletions: files.reduce((sum, file) => sum + file.deletions, 0),
    }
  })

  onUnmounted(() => {
    context.value = undefined
  })
}
