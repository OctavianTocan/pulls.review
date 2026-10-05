import type { CliRunner } from '@pulls.review/core/llm'
import type { AiActivity, AiJobRequest, AiJobSnapshot, CliModelCatalog, LlmEngine } from '@pulls.review/core/local-rpc'
import type { LocalRpc } from './connection'
import { LOCAL_RPC } from '@pulls.review/core/local-rpc'

export interface FollowJobOptions {
  signal?: AbortSignal
  /** Receives entries changed since the last poll. */
  onActivity?: (activities: AiActivity[]) => void
  /** Receives every poll's snapshot, e.g. to show status and usage. */
  onSnapshot?: (snapshot: AiJobSnapshot) => void
}

/**
 * Follows a server job until it settles.
 * @param rpc - The local server connection.
 * @param id - The job to follow.
 * @param options - Abort signal and listeners; aborting stops following, it does not cancel the job.
 * @returns The settled job.
 */
export async function followAiJob(rpc: LocalRpc, id: string, options: FollowJobOptions = {}): Promise<AiJobSnapshot> {
  let after = 0
  for (;;) {
    if (options.signal?.aborted)
      throw new DOMException('Aborted', 'AbortError')
    const snapshot = await rpc.call(LOCAL_RPC.aiJobWait, { id, after }) as AiJobSnapshot
    after = snapshot.rev
    if (snapshot.activities.length)
      options.onActivity?.(snapshot.activities)
    options.onSnapshot?.(snapshot)
    if (snapshot.status !== 'running')
      return snapshot
  }
}

/**
 * Starts a job on the server.
 * @param rpc - The local server connection.
 * @param request - The prompt and engine settings.
 * @returns The job's id; a running job with the same `key` is reused.
 */
export async function startAiJob(rpc: LocalRpc, request: AiJobRequest): Promise<string> {
  return String(await rpc.call(LOCAL_RPC.aiJobStart, request))
}

/**
 * The jobs the server is running or recently finished.
 * @param rpc - The local server connection.
 * @returns Newest first, without their work logs.
 */
export async function listAiJobs(rpc: LocalRpc): Promise<AiJobSnapshot[]> {
  return await rpc.call(LOCAL_RPC.aiJobList) as AiJobSnapshot[]
}

/**
 * The models a CLI reports it can run.
 * @param rpc - The local server connection.
 * @param engine - Which CLI to ask.
 * @returns Its catalog, as the CLI itself described it.
 */
export async function listCliModels(rpc: LocalRpc, engine: LlmEngine): Promise<CliModelCatalog> {
  return await rpc.call(LOCAL_RPC.aiModels, { engine }) as CliModelCatalog
}

/**
 * A `CliRunner` that runs each prompt as a server job. Aborting cancels the job;
 * closing the tab does not, so a reload can pick the job back up by its `key`.
 * @param rpc - The local server connection.
 * @returns The runner to hand to `setCliRunner`.
 */
export function createJobRunner(rpc: LocalRpc): CliRunner {
  return async (request, hooks) => {
    const id = await startAiJob(rpc, request)
    const cancel = () => void rpc.call(LOCAL_RPC.aiJobCancel, { id }).catch(() => {})
    hooks?.signal?.addEventListener('abort', cancel, { once: true })
    try {
      const job = await followAiJob(rpc, id, { signal: hooks?.signal, onActivity: hooks?.onActivity })
      if (job.status !== 'done')
        throw new Error(job.error ?? (job.status === 'cancelled' ? 'Cancelled.' : 'The run failed.'))
      return { text: job.result ?? '', usage: job.usage }
    }
    finally {
      hooks?.signal?.removeEventListener('abort', cancel)
    }
  }
}
