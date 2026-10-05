import type { GithubClient } from './client'
import type { MergeMethod } from './overview'
import { asWrite } from './writes'

const MERGE_MUTATION = `
mutation MergePullRequest($id: ID!, $method: PullRequestMergeMethod!, $headline: String, $body: String, $expectedHeadOid: GitObjectID) {
  mergePullRequest(input: { pullRequestId: $id, mergeMethod: $method, commitHeadline: $headline, commitBody: $body, expectedHeadOid: $expectedHeadOid }) {
    pullRequest { id state }
  }
}`

const UPDATE_BRANCH_MUTATION = `
mutation UpdatePullRequestBranch($id: ID!, $method: PullRequestBranchUpdateMethod!, $expectedHeadOid: GitObjectID) {
  updatePullRequestBranch(input: { pullRequestId: $id, updateMethod: $method, expectedHeadOid: $expectedHeadOid }) {
    pullRequest { id headRefOid }
  }
}`

const STATE_MUTATIONS = {
  close: 'mutation ($id: ID!) { closePullRequest(input: { pullRequestId: $id }) { pullRequest { id } } }',
  reopen: 'mutation ($id: ID!) { reopenPullRequest(input: { pullRequestId: $id }) { pullRequest { id } } }',
  ready: 'mutation ($id: ID!) { markPullRequestReadyForReview(input: { pullRequestId: $id }) { pullRequest { id } } }',
  draft: 'mutation ($id: ID!) { convertPullRequestToDraft(input: { pullRequestId: $id }) { pullRequest { id } } }',
} as const

/** A state change that only needs the PR's node id. */
export type PullRequestStateChange = keyof typeof STATE_MUTATIONS

export interface MergePullRequestInput {
  /** The PR's GraphQL node id. */
  pullRequestId: string
  method: MergeMethod
  /** Merge commit title; omitted lets GitHub use the repository default. */
  title?: string
  /** Merge commit message; omitted lets GitHub use the repository default. */
  body?: string
  /** The head the viewer reviewed; GitHub refuses the merge if the branch moved since. */
  expectedHeadOid?: string
}

/**
 * Merges a pull request.
 * @param client A client whose token may write to the repository.
 * @param input What to merge and how.
 * @throws The `writeForbidden` diagnostic when the token may not merge; GitHub's own message otherwise.
 */
export async function mergePullRequest(client: GithubClient, input: MergePullRequestInput): Promise<void> {
  await asWrite(() => client.graphql(MERGE_MUTATION, {
    id: input.pullRequestId,
    method: input.method.toUpperCase(),
    headline: input.title ?? null,
    body: input.body ?? null,
    expectedHeadOid: input.expectedHeadOid ?? null,
  }))
}

/**
 * Closes, reopens, marks ready for review, or converts a pull request to a draft.
 * @param client A client whose token may write to the repository.
 * @param pullRequestId The PR's GraphQL node id.
 * @param change Which state change to make.
 * @throws The `writeForbidden` diagnostic when the token may not change the PR; GitHub's own message otherwise.
 */
export async function changePullRequestState(client: GithubClient, pullRequestId: string, change: PullRequestStateChange): Promise<void> {
  await asWrite(() => client.graphql(STATE_MUTATIONS[change], { id: pullRequestId }))
}

/**
 * Brings a PR's head branch up to date with its base.
 * @param client A client whose token may push to the head branch.
 * @param pullRequestId The PR's GraphQL node id.
 * @param options Update options.
 * @param options.method Merge the base in (default) or rebase onto it.
 * @param options.expectedHeadOid The head the viewer last saw; GitHub refuses the update if the branch moved since.
 * @throws The `writeForbidden` diagnostic when the token may not push; GitHub's own message otherwise.
 */
export async function updatePullRequestBranch(client: GithubClient, pullRequestId: string, options: { method?: 'merge' | 'rebase', expectedHeadOid?: string } = {}): Promise<void> {
  await asWrite(() => client.graphql(UPDATE_BRANCH_MUTATION, {
    id: pullRequestId,
    method: (options.method ?? 'merge').toUpperCase(),
    expectedHeadOid: options.expectedHeadOid ?? null,
  }))
}
