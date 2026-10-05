import type { MyPull, MyPullsSnapshot, MyPullState } from '@pulls.review/core/local-rpc'
import type { Ref } from 'vue'
import { ref, watch } from 'vue'

/** Where the home page gets its list from. */
export interface MyPullsSource {
  /** The server's copy, possibly stale, without waiting on GitHub; `null` before its first fetch. */
  cached: (state: MyPullState) => Promise<MyPullsSnapshot | null>
  /** A list no older than a few seconds, waiting on GitHub when needed. */
  fresh: (state: MyPullState) => Promise<MyPull[]>
}

export interface MyPullsOptions {
  /** Keeps the last list per state on this device; `undefined` when storage is unavailable. */
  storage?: Pick<Storage, 'getItem' | 'setItem'>
  now?: () => number
  /** A server copy younger than this is shown without asking GitHub again. */
  freshForMs?: number
}

export interface MyPulls {
  /** The newest list known, `undefined` until any copy arrives. */
  pulls: Ref<MyPull[] | undefined>
  /** When that list was fetched from GitHub, in epoch milliseconds. */
  fetchedAt: Ref<number | undefined>
  /** A newer list is being fetched. */
  updating: Ref<boolean>
  /** Why the last update failed; the previous list stays in `pulls`. */
  error: Ref<string | undefined>
  /** Fetches a fresh list even when the current one is recent. */
  reload: () => Promise<void>
}

interface StoredPulls {
  pulls: MyPull[]
  fetchedAt: number
}

const STORAGE_PREFIX = 'pulls-review:my-pulls:v1:'

function readStored(storage: MyPullsOptions['storage'], state: MyPullState): StoredPulls | undefined {
  try {
    const raw = storage?.getItem(STORAGE_PREFIX + state)
    const parsed = raw ? JSON.parse(raw) as StoredPulls : undefined
    return Array.isArray(parsed?.pulls) && typeof parsed.fetchedAt === 'number' ? parsed : undefined
  }
  catch {
    return undefined
  }
}

function writeStored(storage: MyPullsOptions['storage'], state: MyPullState, value: StoredPulls) {
  try {
    storage?.setItem(STORAGE_PREFIX + state, JSON.stringify(value))
  }
  catch {}
}

/**
 * @returns `localStorage`, or `undefined` when the browser blocks it.
 */
export function deviceStorage(): MyPullsOptions['storage'] {
  try {
    return globalThis.localStorage
  }
  catch {
    return undefined
  }
}

/**
 * The home page's list for the selected state: the copy saved on this device shows at
 * once, then the server's cached copy, then a fresh one while `updating` is set.
 *
 * @param source The server to ask.
 * @param state The selected state; changing it shows that state's list.
 * @param options Storage and timing.
 * @returns The list and its sync status.
 */
export function useMyPulls(source: MyPullsSource, state: Ref<MyPullState>, options: MyPullsOptions = {}): MyPulls {
  const { storage, now = Date.now, freshForMs = 30_000 } = options
  const pulls = ref<MyPull[]>()
  const fetchedAt = ref<number>()
  const updating = ref(false)
  const error = ref<string>()
  let generation = 0

  async function load(force: boolean) {
    const current = ++generation
    const selected = state.value
    const isCurrent = () => current === generation
    const show = (value: StoredPulls) => {
      if (!isCurrent() || (fetchedAt.value !== undefined && value.fetchedAt < fetchedAt.value))
        return
      pulls.value = value.pulls
      fetchedAt.value = value.fetchedAt
      writeStored(storage, selected, value)
    }

    updating.value = true
    error.value = undefined
    try {
      const server = await source.cached(selected).catch(() => null)
      if (server)
        show(server)
      if (!force && server && !server.refreshing && now() - server.fetchedAt < freshForMs)
        return
      const list = await source.fresh(selected)
      show({ pulls: list, fetchedAt: now() })
    }
    catch (err) {
      if (isCurrent())
        error.value = err instanceof Error ? err.message : String(err)
    }
    finally {
      if (isCurrent())
        updating.value = false
    }
  }

  watch(state, (selected) => {
    const stored = readStored(storage, selected)
    pulls.value = stored?.pulls
    fetchedAt.value = stored?.fetchedAt
    void load(false)
  }, { immediate: true })

  return { pulls, fetchedAt, updating, error, reload: () => load(true) }
}
