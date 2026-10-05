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
