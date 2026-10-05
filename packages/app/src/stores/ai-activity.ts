import type { AiActivity } from '@pulls.review/core/local-rpc'

export interface ActivityLog {
  /**
   * Takes in changed work-log entries.
   * @param activities - Entries new or updated since the last call.
   * @returns What the job is doing now: the newest running entry's title, else the newest entry's.
   */
  merge: (activities: AiActivity[]) => string | undefined
  clear: () => void
}

/**
 * A job's work log, merged by entry id as updates arrive.
 * @returns An empty log.
 */
export function createActivityLog(): ActivityLog {
  const entries = new Map<string, AiActivity>()
  return {
    merge(activities) {
      for (const activity of activities)
        entries.set(activity.id, activity)
      const newestFirst = [...entries.values()].sort((a, b) => b.startedAt - a.startedAt)
      return (newestFirst.find(entry => entry.status === 'running') ?? newestFirst[0])?.title
    },
    clear: () => entries.clear(),
  }
}

/**
 * Whether `error` is what an aborted run rejects with.
 * @param error - The rejection.
 * @returns `true` for an `AbortError`.
 */
export function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError'
}

/**
 * `error` as an `Error`.
 * @param error - Anything thrown.
 * @returns `error` itself when it is one, else an `Error` with its text.
 */
export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}
