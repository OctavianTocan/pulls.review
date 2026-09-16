import * as v from 'valibot'

export const FileChangeStatusSchema = v.picklist(['added', 'removed', 'modified', 'renamed', 'copied'])
export type FileChangeStatus = v.InferOutput<typeof FileChangeStatusSchema>

export const DiffHunkSchema = v.object({
  header: v.string(), // e.g. "@@ -1,5 +1,6 @@"
  oldStart: v.number(),
  oldLines: v.number(),
  newStart: v.number(),
  newLines: v.number(),
  patch: v.string(), // raw hunk text, lines prefixed +/-/space
})
export type DiffHunk = v.InferOutput<typeof DiffHunkSchema>

export const FileChangeSchema = v.object({
  path: v.string(),
  previousPath: v.optional(v.string()), // for renames
  status: FileChangeStatusSchema,
  additions: v.number(),
  deletions: v.number(),
  isBinary: v.boolean(),
  // Content-addressed hash: the git blob sha when known, else a computed SHA-256
  // of the patch text. Lets the cache tell which files actually changed between
  // two fetches without diffing patch text. See app/patch-parser for the rules.
  sha: v.string(),
  hunks: v.array(DiffHunkSchema), // empty if binary
})
export type FileChange = v.InferOutput<typeof FileChangeSchema>

export const PullRequestStateSchema = v.picklist(['open', 'closed', 'merged', 'draft'])
export type PullRequestState = v.InferOutput<typeof PullRequestStateSchema>

export const PullRequestMetaSchema = v.object({
  provider: v.picklist(['github', 'local', 'paste']),
  id: v.string(), // e.g. "github:owner/repo#123" or "paste:<contentHash>"
  title: v.string(), // "Pasted diff" default for paste, no PR title available
  description: v.string(), // raw markdown body; empty for paste
  author: v.optional(v.string()),
  // Absent for paste/local, which have no lifecycle of their own.
  state: v.optional(PullRequestStateSchema),
  // base/head refs+shas are only meaningful when the source actually has them
  // (github always does; a bare pasted patch usually doesn't unless a git diff
  // preamble is present, so these stay optional at the schema level).
  baseRef: v.optional(v.string()),
  headRef: v.optional(v.string()),
  baseSha: v.optional(v.string()),
  headSha: v.optional(v.string()),
  createdAt: v.optional(v.string()),
  updatedAt: v.optional(v.string()),
  url: v.optional(v.string()), // permalink to source, absent for local/paste
})
export type PullRequestMeta = v.InferOutput<typeof PullRequestMetaSchema>

/**
 * TODO: generate this, call it DiffsPayload, have top level id, title, provider, description?, url?, base?: { sha: string, ref: string }, head?: { sha: string, ref: string }, createdAt?, updatedAt?, and pullRequest?: PullRequestMeta
 * So the same payload can be used for different sources like GitHub, local diffs, or pasted diffs universally.
 *
 * We should have a component to consume this, and then we could have isomorphic handling for differnet routes.
 */
export const PullRequestDiffSchema = v.object({
  meta: PullRequestMetaSchema,
  files: v.array(FileChangeSchema),
})
export type PullRequestDiff = v.InferOutput<typeof PullRequestDiffSchema>
