import type { LocalRpc } from './connection'

let current: LocalRpc | undefined

/**
 * Hands the server connection to the AI job and model-catalog helpers.
 * @param rpc - The connection `installLocal` opened.
 */
export function setAiRpc(rpc: LocalRpc): void {
  current = rpc
}

/**
 * The server connection for AI jobs and model catalogs.
 * @returns Nothing outside a `PR_LOCAL` build, where models run in the browser.
 */
export function getAiRpc(): LocalRpc | undefined {
  return current
}
