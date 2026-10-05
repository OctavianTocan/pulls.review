import type { PrCommit } from '@pulls.review/core/github'
import type { SourceRef } from '@pulls.review/core/types'

/** A contiguous run of a PR's commits, both ends inclusive; one commit when `from === to`. */
export interface CommitSelection {
  from: string
  to: string
}

const SHA = /^[0-9a-f]{7,40}$/i
const SHORT_SHA_LENGTH = 12

/**
 * Reads the `?commits=` query value: `<sha>` or `<from>..<to>`.
 * @param value The raw query value.
 * @returns The selection, or `undefined` when absent or malformed.
 */
export function parseCommitSelection(value: unknown): CommitSelection | undefined {
  if (typeof value !== 'string')
    return undefined
  const [from, to = from, ...rest] = value.trim().split('..')
  if (rest.length || !from || !SHA.test(from) || !SHA.test(to))
    return undefined
  return { from: from.toLowerCase(), to: to.toLowerCase() }
}

/**
 * The `?commits=` query value for a selection.
 * @param selection The selected commits.
 * @returns `<sha>` for one commit, `<from>..<to>` for a range.
 */
export function formatCommitSelection(selection: CommitSelection): string {
  return selection.from === selection.to ? selection.from : `${selection.from}..${selection.to}`
}

/**
 * The diff source showing exactly the selected commits.
 * @param owner Repository owner.
 * @param repo Repository name.
 * @param selection The selected commits.
 * @returns A single-commit ref, or a compare from the first commit's parent to the last commit.
 */
export function commitSelectionRef(owner: string, repo: string, selection: CommitSelection): Extract<SourceRef, { kind: 'github-commit' | 'github-compare' }> {
  if (selection.from === selection.to)
    return { kind: 'github-commit', owner, repo, sha: selection.from }
  return { kind: 'github-compare', owner, repo, base: `${selection.from}^`, head: selection.to }
}

function indexOfSha(commits: PrCommit[], sha: string): number {
  return commits.findIndex(commit => commit.oid.startsWith(sha))
}

/**
 * Where a selection sits in the PR's commit list.
 * @param commits The PR's commits, oldest first.
 * @param selection The selected commits.
 * @returns Inclusive indexes into `commits`, or `undefined` when either end is not among them.
 */
export function resolveCommitSelection(commits: PrCommit[], selection: CommitSelection): { start: number, end: number } | undefined {
  const a = indexOfSha(commits, selection.from)
  const b = indexOfSha(commits, selection.to)
  if (a < 0 || b < 0)
    return undefined
  return { start: Math.min(a, b), end: Math.max(a, b) }
}

/**
 * The selection spanning two positions in the PR's commit list, in either order.
 * @param commits The PR's commits, oldest first.
 * @param a One end's index.
 * @param b The other end's index; defaults to `a` for a single commit.
 * @returns The selection, with shas shortened for the URL.
 */
export function selectCommitRange(commits: PrCommit[], a: number, b = a): CommitSelection {
  const first = commits[Math.min(a, b)]!
  const last = commits[Math.max(a, b)]!
  return { from: first.oid.slice(0, SHORT_SHA_LENGTH), to: last.oid.slice(0, SHORT_SHA_LENGTH) }
}

/**
 * The selection of one commit.
 * @param oid The commit's sha.
 * @returns The selection, with the sha shortened for the URL.
 */
export function selectCommit(oid: string): CommitSelection {
  const sha = oid.slice(0, SHORT_SHA_LENGTH)
  return { from: sha, to: sha }
}

/**
 * The commits just before and after a selection, for stepping through them one at a time.
 * @param commits The PR's commits, oldest first.
 * @param selection The selected commits.
 * @returns Each neighbour as a single-commit selection; unset at either end or when the selection is not among `commits`.
 */
export function adjacentCommits(commits: PrCommit[], selection: CommitSelection): { previous?: CommitSelection, next?: CommitSelection } {
  const range = resolveCommitSelection(commits, selection)
  if (!range)
    return {}
  const before = commits[range.start - 1]
  const after = commits[range.end + 1]
  return {
    previous: before && selectCommit(before.oid),
    next: after && selectCommit(after.oid),
  }
}
