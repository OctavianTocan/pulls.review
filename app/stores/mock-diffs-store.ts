import type { GroupedResult, GroupSource } from '../types/analyze'
import type { DiffsPayload } from '../types/diff'
import type { DiffsStore } from './types'
import { computed, reactive, ref } from 'vue'

/**
 * In-memory `DiffsStore` for Storybook stories and tests: same interface as
 * `createDiffsStore`, but never touches cache/network/providers/adapters. `load`/
 * `refresh` are no-ops since the data is already seeded; `reanalyze` just flips
 * `hasAiResult` on rather than calling the real `llm` adapter.
 */
export function createMockDiffsStore(input: {
  diff?: DiffsPayload
  grouped?: GroupedResult
  reviewed?: Iterable<string>
  isLoading?: boolean
  error?: Error
  isStale?: boolean
  isSetup?: boolean
  llm?: boolean
}): DiffsStore {
  const llmEnabled = input.llm ?? true

  const diff = ref(input.diff)
  const grouped = ref(input.grouped)
  const isLoading = ref(input.isLoading ?? false)
  const error = ref(input.error)
  const isStale = ref(input.isStale ?? false)
  const reviewed = ref(new Set(input.reviewed ?? []))
  const analyzeMode = ref<GroupSource>(grouped.value?.source ?? (llmEnabled ? 'llm' : 'rule-based'))
  const isAnalyzing = ref(false)
  const hasAiResultOverride = ref(grouped.value?.source === 'llm')
  const isSetup = computed(() => input.isSetup ?? true)
  const hasAiResult = computed(() => hasAiResultOverride.value)

  async function load() {}
  async function refresh() {}

  async function toggleReviewed(sha: string, isReviewed: boolean) {
    const next = new Set(reviewed.value)
    if (isReviewed)
      next.add(sha)
    else
      next.delete(sha)
    reviewed.value = next
  }

  async function setAnalyzeMode(mode: GroupSource) {
    analyzeMode.value = mode
  }

  async function reanalyze() {
    hasAiResultOverride.value = true
    analyzeMode.value = 'llm'
  }

  return reactive({
    diff,
    grouped,
    isLoading,
    error,
    isStale,
    reviewed,
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
