/** A loaded value and when it was loaded. */
export interface SwrEntry<T> {
  value: T
  /** Epoch milliseconds. */
  fetchedAt: number
}

/** An in-memory stale-while-revalidate cache: concurrent loads of one key share a single call. */
export interface SwrCache<T> {
  /** The last value loaded for `key`, however old; `undefined` before the first load succeeds. */
  peek: (key: string) => SwrEntry<T> | undefined
  /** Whether a load of `key` is in flight. */
  isRefreshing: (key: string) => boolean
  /** Loads `key` again, joining a load already in flight; a failure keeps the previous value. */
  refresh: (key: string) => Promise<SwrEntry<T>>
  /** The cached value when it is younger than `maxAgeMs`, otherwise a fresh one. */
  get: (key: string, maxAgeMs: number) => Promise<SwrEntry<T>>
  /** The cached value without waiting; starts a background refresh when it is missing or older than `maxAgeMs`. */
  peekAndRevalidate: (key: string, maxAgeMs: number) => SwrEntry<T> | undefined
}

/**
 * @template T The cached value.
 * @param load Produces the current value for a key.
 * @param now The clock, replaceable in tests.
 * @returns An empty cache over `load`.
 */
export function createSwrCache<T>(load: (key: string) => Promise<T>, now: () => number = Date.now): SwrCache<T> {
  const entries = new Map<string, SwrEntry<T>>()
  const inflight = new Map<string, Promise<SwrEntry<T>>>()

  function refresh(key: string): Promise<SwrEntry<T>> {
    const running = inflight.get(key)
    if (running)
      return running
    const started = now()
    const task = load(key)
      .then((value) => {
        const entry = { value, fetchedAt: started }
        entries.set(key, entry)
        return entry
      })
      .finally(() => inflight.delete(key))
    inflight.set(key, task)
    return task
  }

  function isFresh(entry: SwrEntry<T> | undefined, maxAgeMs: number): entry is SwrEntry<T> {
    return entry !== undefined && now() - entry.fetchedAt < maxAgeMs
  }

  return {
    peek: key => entries.get(key),
    isRefreshing: key => inflight.has(key),
    refresh,
    async get(key, maxAgeMs) {
      const entry = entries.get(key)
      return isFresh(entry, maxAgeMs) ? entry : refresh(key)
    },
    peekAndRevalidate(key, maxAgeMs) {
      const entry = entries.get(key)
      if (!isFresh(entry, maxAgeMs))
        refresh(key).catch(() => {})
      return entry
    },
  }
}
