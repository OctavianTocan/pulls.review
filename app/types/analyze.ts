import type { PullRequestDiff } from './diff'
import * as v from 'valibot'

export const GroupSourceSchema = v.picklist(['none', 'rule-based', 'llm', 'web-llm'])
export type GroupSource = v.InferOutput<typeof GroupSourceSchema>

export const DiffCategorySchema = v.picklist(['code', 'tests', 'docs', 'deps', 'config', 'generated', 'other'])
export type DiffCategory = v.InferOutput<typeof DiffCategorySchema>

/**
 * Leaf group shape (no further nesting), reused for both root groups and their children,
 * which structurally enforces the "max depth 2" decision rather than relying on convention.
 */
export const DiffGroupLeafSchema = v.object({
  key: v.string(), // stable id, e.g. "docs/featureA" or "tests"
  label: v.string(), // display label (LLM can override; rule-based = category name)
  category: v.optional(DiffCategorySchema), // present for rule-based; LLM groups may omit or map loosely
  summary: v.optional(v.string()), // per-group blurb, populated only when an llm/web-llm adapter has run
  filePaths: v.array(v.string()), // references into PullRequestDiff.files by path
})
export type DiffGroupLeaf = v.InferOutput<typeof DiffGroupLeafSchema>

export const DiffGroupSchema = v.object({
  ...DiffGroupLeafSchema.entries,
  children: v.optional(v.array(DiffGroupLeafSchema)), // depth capped at 2 total (root -> children)
})
export type DiffGroup = v.InferOutput<typeof DiffGroupSchema>

export const WalkthroughStepSchema = v.object({
  title: v.string(),
  narrative: v.string(),
  filePaths: v.array(v.string()), // hunks/files this step refers to
})
export type WalkthroughStep = v.InferOutput<typeof WalkthroughStepSchema>

export const GroupedResultSchema = v.object({
  source: GroupSourceSchema,
  overallSummary: v.optional(v.string()), // only when an 'llm' or 'web-llm' adapter has run
  groups: v.array(DiffGroupSchema),
  walkthrough: v.optional(v.array(WalkthroughStepSchema)), // only when an llm/web-llm adapter has run; absent for rule-based
  generatedAt: v.string(),
  schemaVersion: v.number(), // bump on breaking shape changes, used for cache invalidation
})
export type GroupedResult = v.InferOutput<typeof GroupedResultSchema>

export interface AnalyzeAdapter {
  readonly id: GroupSource // 'none' | 'rule-based' | 'llm' | 'web-llm'
  readonly available: boolean // none/rule-based: always true; llm: true once a key is configured; web-llm: true once a local model is loaded
  analyze: (diff: PullRequestDiff) => Promise<GroupedResult>
}
