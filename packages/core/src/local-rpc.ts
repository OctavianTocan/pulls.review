/**
 * The contract between the `pulls.review` devframe server (`packages/cli`) and the
 * `PR_LOCAL` app build: the devframe id, where it mounts, and its RPC function names.
 * Browser-safe; both sides import it so the names can't drift.
 */
export const LOCAL_DEVFRAME_ID = 'pulls.review'

/** Where a devframe hub mounts it (`/__<id>/`); standalone, it serves at `/`. */
export const LOCAL_HUB_BASE_PATH = '/__pulls.review/'

/** Bare names; devframe namespaces them as `pulls.review:<name>`. */
export const LOCAL_RPC = {
  /** Branches, tags, recent commits and the default branch, for the ref picker. */
  repoInfo: 'repo-info',
  sourceKey: 'source-key',
  sourceFetch: 'source-fetch',
  sourceFingerprint: 'source-fingerprint',
  sourceLoadFile: 'source-load-file',
  /** An unstorage driver over the server's cache directory. */
  storageGetItem: 'storage-get-item',
  storageSetItem: 'storage-set-item',
  storageRemoveItem: 'storage-remove-item',
  storageGetKeys: 'storage-get-keys',
  githubToken: 'github-token',
  /** The signed-in user's open pull requests, found through the `gh` CLI. */
  myPulls: 'my-pulls',
  /** One prompt through the server's Claude Code or Codex CLI. */
  llmRun: 'llm-run',
} as const

/** The CLIs the server can run a model prompt through. */
export const LLM_ENGINES = ['claude-code', 'codex'] as const

/** Why a pull request shows up for the signed-in user (`owned`: it sits in a repo they or their orgs own). */
export const MY_PULL_ROLES = ['review-requested', 'authored', 'involved', 'owned'] as const
export type MyPullRole = typeof MY_PULL_ROLES[number]

export interface MyPull {
  owner: string
  repo: string
  number: number
  title: string
  author: string
  isDraft: boolean
  updatedAt: string
  commentsCount: number
  labels: string[]
  state: 'open' | 'closed'
  role: MyPullRole
}

export const MY_PULL_STATES = ['open', 'closed'] as const
export type MyPullState = typeof MY_PULL_STATES[number]
