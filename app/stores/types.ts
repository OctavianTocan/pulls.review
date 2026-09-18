import type { GroupedResult, GroupSource } from '../types/analyze'
import type { DiffsPayload } from '../types/diff'

/**
 * LLM-specific analysis operations, isolated behind `DiffsStore.llm` so components can
 * gate the whole "AI" affordance on its presence rather than a separate boolean prop.
 * Owns operations only, not settings CRUD - API keys live in the app-wide
 * `settings.value.llm` singleton (`app/state/settings.ts`), edited by `SettingsPanel.vue`
 * independently of any one diff view.
 *
 * Built with `reactive()` (see `createDiffsStore`/`createMockDiffsStore`), like a Pinia
 * store - fields read directly (`store.llm.isSetup`), no `.value`.
 */
export interface DiffsStoreLlm {
  /** Whether a gateway token or vendor API key is configured (was `llmAvailable`). */
  readonly isSetup: boolean
  readonly isAnalyzing: boolean
  /** Whether the `llm` adapter has already produced a result for the current diff. */
  readonly hasAiResult: boolean
  readonly analyzeMode: GroupSource
  /** Switches the active grouping. `none`/`rule-based` analyze immediately (free, instant); `llm` only switches the view - call `reanalyze` to actually run it. */
  setAnalyzeMode: (mode: GroupSource) => Promise<void>
  reanalyze: () => Promise<void>
}

/**
 * One reactive store per loaded diff - created explicitly by `createDiffsStore` (real
 * data) or `createMockDiffsStore` (Storybook/tests), never a global singleton/registry.
 * Passed down as a single prop through the whole view tree; components call its methods
 * directly instead of emitting events that bubble back up to whoever created it.
 *
 * Built with `reactive()`, like a Pinia store - state fields read directly
 * (`store.diff`, `store.reviewed`), never as raw `Ref`s needing `.value`. That also
 * keeps it safe to pass through contexts that wrap values in their own `reactive()`
 * (e.g. Storybook args) without double-unwrapping.
 */
export interface DiffsStore {
  readonly diff: DiffsPayload | undefined
  readonly grouped: GroupedResult | undefined
  readonly isLoading: boolean
  readonly error: Error | undefined
  /** Only meaningful once `diff`/`grouped` are loaded - a source with no live origin (paste) just never sets this. */
  readonly isStale: boolean
  readonly reviewed: Set<string>
  /** `undefined` = LLM analysis isn't available in this environment (embed, or disabled). */
  readonly llm?: DiffsStoreLlm
  load: () => Promise<void>
  refresh: () => Promise<void>
  toggleReviewed: (sha: string, reviewed: boolean) => Promise<void>
}
