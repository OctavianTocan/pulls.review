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
  /** The models (and their reasoning efforts) a CLI reports it can run. */
  aiModels: 'ai-models',
  /** Starts a prompt as a background job on the server; resolves to its id. */
  aiJobStart: 'ai-job-start',
  /** Long-polls a job for activity newer than a revision. */
  aiJobWait: 'ai-job-wait',
  aiJobCancel: 'ai-job-cancel',
  /** Jobs still running or recently finished, newest first. */
  aiJobList: 'ai-job-list',
} as const

/** The CLIs the server can run a model prompt through. */
export const LLM_ENGINES = ['claude-code', 'codex'] as const
export type LlmEngine = typeof LLM_ENGINES[number]

/** A model as its CLI describes it, never a hard-coded list. */
export interface CliModel {
  /** What `--model` takes. */
  id: string
  name: string
  description?: string
  /** Reasoning efforts the model accepts, lowest first; empty when it takes none. */
  efforts: string[]
  /** The effort the CLI uses when none is passed. */
  defaultEffort?: string
  /** The model the CLI runs when none is passed. */
  isDefault?: boolean
}

export interface CliModelCatalog {
  engine: LlmEngine
  models: CliModel[]
  /** The signed-in plan, e.g. `Claude Max`, when the CLI reports it. */
  account?: string
  /** The CLI's own version string. */
  version?: string
}

/** Token counts and cost exactly as the CLI reported them; fields it omits stay unset. */
export interface AiUsage {
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  reasoningTokens?: number
  /** USD; only Claude Code reports it. */
  costUsd?: number
  durationMs?: number
  /** The model that actually ran. */
  model?: string
}

export const AI_ACTIVITY_KINDS = ['status', 'thinking', 'text', 'tool'] as const
export type AiActivityKind = typeof AI_ACTIVITY_KINDS[number]
export type AiActivityStatus = 'running' | 'done' | 'failed'

/**
 * One entry of a job's work log. Entries update in place (a thinking block grows,
 * a tool call finishes), so readers merge them by `id`.
 */
export interface AiActivity {
  id: string
  kind: AiActivityKind
  /** One line saying what happened, e.g. `Read packages/core/src/index.ts`. */
  title: string
  /** The reasoning, answer or tool output so far. */
  text?: string
  /** The tool's own name, for `tool` entries. */
  tool?: string
  status: AiActivityStatus
  startedAt: number
  endedAt?: number
  /** The job revision this entry last changed at. */
  rev: number
}

/** A pull request (or compare/commit) the model may inspect through tools while it works. */
export interface AiPrContext {
  owner: string
  repo: string
  number?: number
  title?: string
  headSha: string
  baseSha?: string
  files: { path: string, previousPath?: string, status?: string, patch?: string }[]
}

export interface AiJobRequest {
  engine: LlmEngine
  model?: string
  effort?: string
  system: string
  prompt: string
  /** JSON Schema the final answer must match; the answer is then JSON text. */
  schema?: unknown
  /** What the job is for, shown in job lists, e.g. `Analyze antfu/pulls.review#62`. */
  label?: string
  /** Starting a job whose key matches one still running returns that job instead. */
  key?: string
  /** Lets the model read the PR's diffs and source through tools. */
  context?: AiPrContext
}

export const AI_JOB_STATUSES = ['running', 'done', 'failed', 'cancelled'] as const
export type AiJobStatus = typeof AI_JOB_STATUSES[number]

/** A job as of revision `rev`; `activities` holds only entries changed since the caller's `after`. */
export interface AiJobSnapshot {
  id: string
  label?: string
  key?: string
  engine: LlmEngine
  model?: string
  effort?: string
  status: AiJobStatus
  rev: number
  activities: AiActivity[]
  /** The final answer, once `done`. */
  result?: string
  error?: string
  usage?: AiUsage
  startedAt: number
  endedAt?: number
}

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
