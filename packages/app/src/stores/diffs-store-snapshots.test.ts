import type { CacheRepositories, PrCacheEntry } from '@pulls.review/core/cache'
import type { PrSnapshot, SnapshotStore } from '../state/snapshots'
import { createCacheRepositories } from '@pulls.review/core/cache'
import { createPasteSource } from '@pulls.review/core/paste'
import { createStorage } from 'unstorage'
import memoryDriver from 'unstorage/drivers/memory'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDiffsStore } from './diffs-store'

const PATCH_TEXT = `diff --git a/a.ts b/a.ts\nindex 000..111 100644\n--- a/a.ts\n+++ b/a.ts\n@@ -1 +1 @@\n-old\n+new\n`

let cache: CacheRepositories
let key: string
let entry: PrCacheEntry

function memorySnapshots(initial?: PrSnapshot): SnapshotStore & { saved: Map<string, PrSnapshot> } {
  const saved = new Map(initial ? [[initial.key, initial]] : [])
  return {
    saved,
    get: async k => saved.get(k),
    headSha: async k => saved.get(k)?.entry.headSha,
    put: async (k, e, reviewed) => void saved.set(k, { key: k, entry: e, reviewed: [...reviewed], savedAt: 0 }),
  }
}

/** The cache with `diffs.get` replaced. */
function withGet(get: () => Promise<PrCacheEntry | undefined>): CacheRepositories {
  return { ...cache, diffs: { ...cache.diffs, get } }
}

beforeEach(async () => {
  cache = createCacheRepositories(createStorage({ driver: memoryDriver() }))
  const source = createPasteSource(PATCH_TEXT)
  await createDiffsStore(source, { cache }).load()
  key = await source.key()
  entry = (await cache.diffs.get(key))!
})

describe('createDiffsStore with snapshots', () => {
  it('renders the snapshot before the cache answers, then switches to the newer cache entry', async () => {
    let answer!: (value: PrCacheEntry) => void
    const pending = new Promise<PrCacheEntry>(resolve => answer = resolve)
    const snapshots = memorySnapshots({ key, entry: { ...entry, headSha: 'old' }, reviewed: [entry.diff.files[0]!.sha], savedAt: 0 })
    const store = createDiffsStore(createPasteSource(PATCH_TEXT), { cache: withGet(() => pending), snapshots })

    const loading = store.load()
    await vi.waitFor(() => expect(store.isLoading).toBe(false))
    expect(store.diff?.files).toHaveLength(1)
    expect(store.reviewed.size).toBe(1)

    answer({ ...entry, analyzedBy: { 'web-llm': { source: 'web-llm', groups: [] } as never } })
    await loading
    expect(store.aiResult?.source).toBe('web-llm')
    expect(store.reviewed.size).toBe(0)
    expect(snapshots.saved.get(key)?.entry.headSha).toBe(entry.headSha)
  })

  it('keeps the snapshot on screen when the server cannot be reached', async () => {
    const lost = Object.assign(new Error('[devframe] Not connected to the devframe server'), { name: 'DevframeConnectionError' })
    const store = createDiffsStore(createPasteSource(PATCH_TEXT), {
      cache: withGet(() => Promise.reject(lost)),
      snapshots: memorySnapshots({ key, entry, reviewed: [], savedAt: 0 }),
    })

    await store.load()
    expect(store.diff?.files).toHaveLength(1)
    expect(store.error).toBeUndefined()
    expect(store.isOffline).toBe(true)
  })

  it('still reports the failure when there is no snapshot to show', async () => {
    const store = createDiffsStore(createPasteSource(PATCH_TEXT), {
      cache: withGet(() => Promise.reject(new Error('boom'))),
      snapshots: memorySnapshots(),
    })

    await store.load()
    expect(store.error?.message).toBe('boom')
    expect(store.isOffline).toBe(false)
  })

  it('saves a snapshot of a page loaded from the cache', async () => {
    const snapshots = memorySnapshots()
    await createDiffsStore(createPasteSource(PATCH_TEXT), { cache, snapshots }).load()
    expect(snapshots.saved.get(key)?.entry.headSha).toBe(entry.headSha)
  })
})
