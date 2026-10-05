import * as v from 'valibot'
import { FileNoteSchema, SubmittedGroupLeafSchema, withChildren } from '../../../types/analyze'

/**
 * Shape the model submits via `submit_grouping`: everything
 * `GroupedResult` needs except the fields the adapter itself owns (`source`,
 * `schemaVersion`, `generatedAt`).
 */
export const AnalysisSchema = v.object({
  overallSummary: v.pipe(v.string(), v.description('A short summary of the intention of the PR (why over what) for a reviewer who hasn\'t read it yet. Rendered as Markdown.')),
  groups: v.array(withChildren(SubmittedGroupLeafSchema)),
  files: v.optional(v.pipe(v.array(FileNoteSchema), v.description('One entry per changed file whose diff you have read, in manifest order. Skip generated, binary and omitted files, and files whose change is self-explanatory from the path alone.'))),
})
export type Analysis = v.InferOutput<typeof AnalysisSchema>
