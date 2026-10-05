import type { SnapshotEntry } from './snapshots'
import { createPasteSource } from '@pulls.review/core/paste'
import { describe, expect, it } from 'vitest'
import { createSnapshotStore, isNetworkError } from './snapshots'
import 'fake-indexeddb/auto'

let db = 0

const diff = await createPasteSource('diff --git a/a.ts b/a.ts\n--- a/a.ts\n+++ b/a.ts\n@@ -1 +1 @@\n-old\n+new\n').fetch()

function entry(headSha: string): SnapshotEntry {
  return {
    headSha,
    diff,
    analyzedBy: {},
    changedSinceReviewed: [],
  }
}

describe('createSnapshotStore', () => {
  it('reads back a saved page, also after the in-memory copy is gone', async () => {
    const dbName = `snapshots-${db++}`
    await createSnapshotStore({ dbName }).put('github:o/r#1', entry('aaa'), new Set(['f1']))

    const fresh = createSnapshotStore({ dbName })
    const snapshot = await fresh.get('github:o/r#1')
    expect(snapshot).toMatchObject({ key: 'github:o/r#1', reviewed: ['f1'], entry: { headSha: 'aaa' } })
    expect(await fresh.headSha('github:o/r#1')).toBe('aaa')
    expect(await fresh.get('github:o/r#2')).toBeUndefined()
  })

  it('keeps only the most recently saved pages', async () => {
    const dbName = `snapshots-${db++}`
    let clock = 0
    const store = createSnapshotStore({ dbName, max: 2, memory: 0, now: () => ++clock })
    await store.put('a', entry('1'), [])
    await store.put('b', entry('2'), [])
    await store.put('c', entry('3'), [])

    expect(await store.get('a')).toBeUndefined()
    expect(await store.headSha('a')).toBeUndefined()
    expect((await store.get('c'))?.entry.headSha).toBe('3')
  })

  it('replaces an older snapshot of the same page', async () => {
    const store = createSnapshotStore({ dbName: `snapshots-${db++}` })
    await store.put('a', entry('1'), [])
    await store.put('a', entry('2'), ['x'])
    expect(await store.get('a')).toMatchObject({ entry: { headSha: '2' }, reviewed: ['x'] })
  })
})

describe('isNetworkError', () => {
  it('recognizes an unreachable server or GitHub', () => {
    const lost = Object.assign(new Error('[devframe] Not connected to the devframe server'), { name: 'DevframeConnectionError' })
    expect(isNetworkError(lost)).toBe(true)
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true)
    expect(isNetworkError(new Error('Not Found'))).toBe(false)
    expect(isNetworkError('nope')).toBe(false)
  })
})
