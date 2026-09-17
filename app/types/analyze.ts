import type { PullRequestDiff } from './diff'
import * as v from 'valibot'

export const GroupSourceSchema = v.picklist([
  'none',
  'rule-based',
  'llm',
  'web-llm',
])
export type GroupSource = v.InferOutput<typeof GroupSourceSchema>

export const DiffCategorySchema = v.picklist([
  'code',
  'tests',
  'docs',
  'deps',
  'config',
  'generated',
  'other',
])
export type DiffCategory = v.InferOutput<typeof DiffCategorySchema>

/**
 * Leaf group shape (no further nesting), reused for both root groups and their children,
 * which structurally enforces the "max depth 2" decision rather than relying on convention.
 *
 * Field `description`s double as the llm adapter's field-level instructions - the model
 * sees them directly in the response schema (see `toModelSchema`), so `prompt.ts` only
 * needs high-level framing, not a restatement of these per-field rules.
 */
export const DiffGroupLeafSchema = v.object({
  key: v.pipe(v.string(), v.description('Stable, short, kebab-case-ish id, e.g. "docs" or "feature-a".')),
  label: v.pipe(v.string(), v.description('Short, human-readable display name for this group.')),
  summary: v.optional(v.pipe(v.string(), v.description('One or two sentence blurb about this group, rendered as Markdown.'))), // populated only when an llm/web-llm adapter has run
  filePaths: v.pipe(v.array(v.string()), v.description('File paths belonging directly to this group (not to a child). Every file path given to you MUST end up in exactly one group or child - never both, never omitted.')), // references into PullRequestDiff.files by path
})
export type DiffGroupLeaf = v.InferOutput<typeof DiffGroupLeafSchema>

export const DiffGroupSchema = v.object({
  ...DiffGroupLeafSchema.entries,
  children: v.optional(v.pipe(v.array(DiffGroupLeafSchema), v.description('One extra level of nesting, e.g. splitting a large group by sub-area. Children cannot have children of their own.'))), // depth capped at 2 total (root -> children)
})
export type DiffGroup = v.InferOutput<typeof DiffGroupSchema>

export const WalkthroughStepSchema = v.object({
  title: v.pipe(v.string(), v.description('Short title for this walkthrough step.')),
  narrative: v.pipe(v.string(), v.description('A few sentences narrating this step for a reviewer, rendered as Markdown.')),
  filePaths: v.pipe(v.array(v.string()), v.description('The file paths this step is about.')),
})
export type WalkthroughStep = v.InferOutput<typeof WalkthroughStepSchema>

export const GroupedResultSchema = v.object({
  source: GroupSourceSchema,
  overallSummary: v.optional(v.pipe(v.string(), v.description('Short paragraph summarizing the whole PR for a reviewer, rendered as Markdown.'))), // only when an 'llm' or 'web-llm' adapter has run
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
