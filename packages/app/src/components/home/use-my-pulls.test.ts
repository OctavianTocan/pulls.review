import type { MyPull, MyPullsSnapshot, MyPullState } from '@pulls.review/core/local-rpc'
import type { MyPullsSource } from './use-my-pulls'
import { describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useMyPulls } from './use-my-pulls'

function pull(number: number, state: MyPullState = 'open'): MyPull {
  return { owner: 'acme', repo: 'app', number, title: `PR ${number}`, author: 'octo', isDraft: false, updatedAt: '2026-10-01T00:00:00Z', commentsCount: 0, labels: [], state, role: 'authored' }
}

function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial))
  return { items, getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value) }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => [resolve, reject] = [res, rej])
  return { promise, resolve, reject }
}

const numbers = (pulls: MyPull[] | undefined) => pulls?.map(p => p.number)

describe('useMyPulls', () => {
  it('shows the device copy, then the server cache, then the fresh list', async () => {
    const storage = memoryStorage({ 'pulls-review:my-pulls:v1:open': JSON.stringify({ pulls: [pull(1)], fetchedAt: 100 }) })
    const cached = deferred<MyPullsSnapshot | null>()
    const fresh = deferred<MyPull[]>()
    const source: MyPullsSource = { cached: () => cached.promise, fresh: () => fresh.promise }

    const list = useMyPulls(source, ref('open'), { storage, now: () => 1_000_000 })
    expect(numbers(list.pulls.value)).toEqual([1])
    expect(list.updating.value).toBe(true)

    cached.resolve({ pulls: [pull(2)], fetchedAt: 200, refreshing: true })
    await vi.waitFor(() => expect(numbers(list.pulls.value)).toEqual([2]))

    fresh.resolve([pull(3)])
    await vi.waitFor(() => expect(list.updating.value).toBe(false))
    expect(numbers(list.pulls.value)).toEqual([3])
    expect(list.fetchedAt.value).toBe(1_000_000)
    expect(JSON.parse(storage.items.get('pulls-review:my-pulls:v1:open')!).pulls[0].number).toBe(3)
  })

  it('trusts a recent server copy until asked to reload', async () => {
    const fresh = vi.fn(async () => [pull(9)])
    const source: MyPullsSource = { cached: async () => ({ pulls: [pull(2)], fetchedAt: 990, refreshing: false }), fresh }

    const list = useMyPulls(source, ref('open'), { now: () => 1000 })
    await vi.waitFor(() => expect(list.updating.value).toBe(false))
    expect(numbers(list.pulls.value)).toEqual([2])
    expect(fresh).not.toHaveBeenCalled()

    await list.reload()
    expect(fresh).toHaveBeenCalledOnce()
    expect(numbers(list.pulls.value)).toEqual([9])
  })

  it('keeps the list on screen when an update fails', async () => {
    const source: MyPullsSource = { cached: async () => ({ pulls: [pull(2)], fetchedAt: 0, refreshing: false }), fresh: async () => Promise.reject(new Error('rate limited')) }

    const list = useMyPulls(source, ref('open'), { now: () => 60_000 })
    await vi.waitFor(() => expect(list.updating.value).toBe(false))
    expect(numbers(list.pulls.value)).toEqual([2])
    expect(list.error.value).toBe('rate limited')
  })

  it('drops answers for a state that is no longer selected', async () => {
    const slow = deferred<MyPull[]>()
    const source: MyPullsSource = {
      cached: async () => null,
      fresh: state => state === 'open' ? slow.promise : Promise.resolve([pull(5, 'closed')]),
    }
    const state = ref<MyPullState>('open')

    const list = useMyPulls(source, state)
    state.value = 'closed'
    await nextTick()
    await vi.waitFor(() => expect(numbers(list.pulls.value)).toEqual([5]))

    slow.resolve([pull(1)])
    await new Promise(resolve => setTimeout(resolve))
    expect(numbers(list.pulls.value)).toEqual([5])
    expect(list.updating.value).toBe(false)
  })
})
