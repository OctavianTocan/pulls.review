import * as v from 'valibot'
import { DiffGroupSchema } from '../../../types/analyze'

/**
 * Shape the model must return for a whole-diff (single-prompt) pass: everything
 * `GroupedResult` needs except the fields the adapter itself owns (`source`,
 * `schemaVersion`, `generatedAt`).
 */
export const AnalysisSchema = v.object({
  overallSummary: v.pipe(v.string(), v.description('A short summary of the intention of the PR (why over what) for a reviewer who hasn\'t read it yet. Rendered as Markdown.')),
  groups: v.array(DiffGroupSchema),
})
export type Analysis = v.InferOutput<typeof AnalysisSchema>

/**
 * Shape for one chunk of a large diff: groups scoped to that chunk's files only,
 * plus a short prose summary of just this chunk, fed into a final synthesis pass
 * instead of a diff-wide `overallSummary`.
 */
export const ChunkAnalysisSchema = v.object({
  summary: v.pipe(v.string(), v.description('A short summary of the intention of this part of the PR (why over what) for a reviewer who hasn\'t read it yet. Rendered as Markdown.')),
  groups: v.array(DiffGroupSchema),
})
export type ChunkAnalysis = v.InferOutput<typeof ChunkAnalysisSchema>

/**
 * Shape for the final synthesis pass over chunk summaries (not raw diffs) once a
 * large diff has been split - produces the diff-wide `overallSummary` the per-chunk
 * passes couldn't, without re-sending any patch text.
 */
export const SynthesisSchema = v.object({
  overallSummary: v.pipe(v.string(), v.description('A short paragraph summarizing the whole PR for a reviewer, based only on the section summaries given. Rendered as Markdown.')),
})
export type Synthesis = v.InferOutput<typeof SynthesisSchema>
