import * as v from 'valibot'
import { DiffGroupSchema, WalkthroughStepSchema } from '../../../types/analyze'

/**
 * Shape the model must return for a whole-diff (single-prompt) pass: everything
 * `GroupedResult` needs except the fields the adapter itself owns (`source`,
 * `schemaVersion`, `generatedAt`).
 */
export const AnalysisSchema = v.object({
  overallSummary: v.pipe(v.string(), v.description('A short paragraph summarizing the whole PR for a reviewer who hasn\'t read it yet. Rendered as Markdown.')),
  groups: v.array(DiffGroupSchema),
  walkthrough: v.optional(v.pipe(v.array(WalkthroughStepSchema), v.description('Optional ordered steps guiding a reviewer through the change, for a PR substantial enough to benefit from one. Omit for small/simple PRs.'))),
})
export type Analysis = v.InferOutput<typeof AnalysisSchema>

/**
 * Shape for one chunk of a large diff: groups scoped to that chunk's files only,
 * plus a short prose summary of just this chunk, fed into a final synthesis pass
 * instead of a diff-wide `overallSummary`/`walkthrough`.
 */
export const ChunkAnalysisSchema = v.object({
  summary: v.pipe(v.string(), v.description('A short paragraph summarizing just the files in this part of the diff.')),
  groups: v.array(DiffGroupSchema),
})
export type ChunkAnalysis = v.InferOutput<typeof ChunkAnalysisSchema>

/**
 * Shape for the final synthesis pass over chunk summaries (not raw diffs) once a
 * large diff has been split - produces the diff-wide narrative the per-chunk
 * passes couldn't, without re-sending any patch text.
 */
export const SynthesisSchema = v.object({
  overallSummary: v.pipe(v.string(), v.description('A short paragraph summarizing the whole PR for a reviewer, based only on the section summaries given. Rendered as Markdown.')),
  walkthrough: v.optional(v.pipe(v.array(WalkthroughStepSchema), v.description('Optional ordered steps guiding a reviewer through the change, for a PR substantial enough to benefit from one. Omit for small/simple PRs.'))),
})
export type Synthesis = v.InferOutput<typeof SynthesisSchema>
