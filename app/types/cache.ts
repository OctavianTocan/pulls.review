import * as v from 'valibot'
import { GroupedResultSchema, GroupSourceSchema } from './analyze'
import { PullRequestDiffSchema } from './diff'

export const PrCacheEntrySchema = v.object({
  key: v.string(),
  diff: PullRequestDiffSchema, // raw normalized diff at headSha
  headSha: v.string(),
  analyzedBy: v.record(GroupSourceSchema, GroupedResultSchema), // keyed by adapter id; only 'rule-based' populated for now (a picklist-keyed record is naturally partial)
  lastViewedAt: v.number(), // for LRU
  sizeBytes: v.number(), // approx, for budget accounting
})
export type PrCacheEntry = v.InferOutput<typeof PrCacheEntrySchema>
