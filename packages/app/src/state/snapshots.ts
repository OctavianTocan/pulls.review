import type { PrCacheEntry } from '@pulls.review/core/cache'
import type { UseStore } from 'idb-keyval'
import { createStore, delMany, get, set } from 'idb-keyval'

/** What a PR page needs to render without asking the server. */
export type SnapshotEntry = Pick<PrCacheEntry, 'headSha' | 'diff' | 'analyzedBy' | 'llmSession' | 'changedSinceReviewed' | 'reviews' | 'sharedComment'>

export interface PrSnapshot {
  /** The diff cache key, e.g. `github:owner/repo#1`. */
  key: string
  entry: SnapshotEntry
  /** Shas of the files marked reviewed when it was saved. */
  reviewed: string[]
  savedAt: number
}

/** A device-local copy of recently opened PR pages, so reopening one renders at once and offline. */
export interface SnapshotStore {
  /**
   * @param key The diff cache key.
   * @returns The saved page, or `undefined` when there is none.
   */
  get: (key: string) => Promise<PrSnapshot | undefined>
  /**
   * @param key The diff cache key.
   * @returns The head commit the saved page shows, without reading the page itself.
   */
  headSha: (key: string) => Promise<string | undefined>
  /**
   * Saves a page, dropping the least recently saved ones beyond the store's limit.
   *
   * @param key The diff cache key.
   * @param entry The cache entry the page rendered.
   * @param reviewed Shas of the files marked reviewed.
   */
  put: (key: string, entry: SnapshotEntry, reviewed: Iterable<string>) => Promise<void>
}

export interface SnapshotStoreOptions {
  /** IndexedDB database to keep snapshots in. */
  dbName?: string
  /** Snapshots kept on disk. */
  max?: number
  /** Snapshots also kept in memory, for instant back-and-forth within a session. */
  memory?: number
  now?: () => number
}

type SnapshotIndex = Record<string, { headSha: string, savedAt: number }>

const INDEX_KEY = '__index__'

/**
 * @param options Where and how many snapshots to keep.
 * @returns A snapshot store over IndexedDB; reads and writes fail soft to "nothing saved".
 */
export function createSnapshotStore(options: SnapshotStoreOptions = {}): SnapshotStore {
  const { dbName = 'pulls-review-snapshots', max = 30, memory = 8, now = Date.now } = options
  let db: UseStore | undefined
  const store = () => db ??= createStore(dbName, 'snapshots')
  const recent = new Map<string, PrSnapshot>()
  let indexWrites = Promise.resolve()

  function remember(snapshot: PrSnapshot) {
    recent.delete(snapshot.key)
    recent.set(snapshot.key, snapshot)
    for (const key of recent.keys()) {
      if (recent.size <= memory)
        break
      recent.delete(key)
    }
  }

  async function readIndex(): Promise<SnapshotIndex> {
    return (await get<SnapshotIndex>(INDEX_KEY, store())) ?? {}
  }

  /** Runs index read-modify-writes one at a time. */
  function updateIndex(patch: (index: SnapshotIndex) => string[]): Promise<void> {
    indexWrites = indexWrites.then(async () => {
      const index = await readIndex()
      const evicted = patch(index)
      await set(INDEX_KEY, index, store())
      if (evicted.length)
        await delMany(evicted, store())
    }).catch(() => {})
    return indexWrites
  }

  return {
    async get(key) {
      const hit = recent.get(key)
      if (hit)
        return hit
      try {
        const snapshot = await get<PrSnapshot>(key, store())
        if (snapshot)
          remember(snapshot)
        return snapshot
      }
      catch {
        return undefined
      }
    },
    async headSha(key) {
      const hit = recent.get(key)
      if (hit)
        return hit.entry.headSha
      try {
        return (await readIndex())[key]?.headSha
      }
      catch {
        return undefined
      }
    },
    async put(key, entry, reviewed) {
      const snapshot: PrSnapshot = {
        key,
        entry: {
          headSha: entry.headSha,
          diff: entry.diff,
          analyzedBy: entry.analyzedBy,
          llmSession: entry.llmSession,
          changedSinceReviewed: entry.changedSinceReviewed,
          reviews: entry.reviews,
          sharedComment: entry.sharedComment,
        },
        reviewed: [...reviewed],
        savedAt: now(),
      }
      remember(snapshot)
      try {
        await set(key, snapshot, store())
      }
      catch {
        return
      }
      await updateIndex((index) => {
        index[key] = { headSha: entry.headSha, savedAt: snapshot.savedAt }
        const evicted = Object.entries(index)
          .sort(([, a], [, b]) => b.savedAt - a.savedAt)
          .slice(max)
          .map(([evictedKey]) => evictedKey)
        for (const evictedKey of evicted)
          delete index[evictedKey]
        return evicted
      })
    },
  }
}

let shared: SnapshotStore | undefined

/** The app's one snapshot store. */
export function prSnapshots(): SnapshotStore {
  return shared ??= createSnapshotStore()
}

/**
 * @param error What a load or refresh threw.
 * @returns Whether it means the server or GitHub could not be reached, rather than a real failure.
 */
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false)
    return true
  if (!(error instanceof Error))
    return false
  if (error.name === 'DevframeConnectionError')
    return true
  // `fetch` rejects with a bare TypeError when the request never got a response.
  return error instanceof TypeError && /fetch|network|load failed/i.test(error.message)
}
