import type { AiActivity, AiJobRequest, AiUsage } from '@pulls.review/core/local-rpc'

export interface AiJobHooks {
  signal?: AbortSignal
  /** Receives work-log entries as the CLI reports them; entries repeat as they update, merge by `id`. */
  onActivity?: (activities: AiActivity[]) => void
}

/**
 * Runs one prompt through the server's Claude Code or Codex CLI.
 *
 * @param _request The engine, model, prompts and optional schema and PR context.
 * @param _hooks An abort signal and a live work-log listener.
 * @returns The final answer and the usage the CLI reported.
 * @throws Always: this server cannot run AI jobs yet.
 */
export async function runAiJob(_request: AiJobRequest, _hooks?: AiJobHooks): Promise<{ text: string, usage?: AiUsage }> {
  throw new Error('AI jobs are not available on this server.')
}
