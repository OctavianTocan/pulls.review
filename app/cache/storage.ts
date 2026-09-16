import type { Driver } from 'unstorage'
import { createStorage } from 'unstorage'

export type CacheStorage = ReturnType<typeof createStorage>

let instance: CacheStorage | undefined

/**
 * Single `unstorage` instance shared by `pr-cache.ts`/`review-cache.ts` via key
 * prefixes (`pr:*`, `review:*`) rather than separate stores; `unstorage` is flat
 * key-value. Runtime uses the `indexedDB` driver; `createCacheStorage(driver)`
 * lets tests inject the `memory` driver instead against identical call sites.
 */
export function createCacheStorage(driver: Driver): CacheStorage {
  return createStorage({ driver })
}

export async function getDefaultCacheStorage(): Promise<CacheStorage> {
  if (!instance) {
    const { default: indexedDbDriver } = await import('unstorage/drivers/indexedb')
    instance = createCacheStorage(indexedDbDriver({ base: 'diffs-cache' }))
  }
  return instance
}
