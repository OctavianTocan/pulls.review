import { describe, expect, it, vi } from 'vitest'
import { createSwrCache } from './swr'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('createSwrCache', () => {
  it('shares one load between concurrent callers', async () => {
    const pending = deferred<string>()
    const load = vi.fn(() => pending.promise)
    const cache = createSwrCache(load)

    const a = cache.get('k', 1000)
    const b = cache.get('k', 1000)
    expect(cache.isRefreshing('k')).toBe(true)
    pending.resolve('v')
    expect((await a).value).toBe('v')
    expect((await b).value).toBe('v')
    expect(load).toHaveBeenCalledTimes(1)
    expect(cache.isRefreshing('k')).toBe(false)
  })

  it('answers from the cache while fresh and reloads once aged', async () => {
    let clock = 0
    let n = 0
    const cache = createSwrCache(async () => ++n, () => clock)

    expect((await cache.get('k', 100)).value).toBe(1)
    clock = 50
    expect((await cache.get('k', 100)).value).toBe(1)
    clock = 150
    expect((await cache.get('k', 100)).value).toBe(2)
  })

  it('returns the stale value at once and refreshes it in the background', async () => {
    let clock = 0
    const loads = [deferred<string>(), deferred<string>()]
    let call = 0
    const cache = createSwrCache(() => loads[call++].promise, () => clock)

    expect(cache.peekAndRevalidate('k', 100)).toBeUndefined()
    loads[0].resolve('old')
    await vi.waitFor(() => expect(cache.peek('k')?.value).toBe('old'))

    clock = 500
    expect(cache.peekAndRevalidate('k', 100)?.value).toBe('old')
    expect(cache.isRefreshing('k')).toBe(true)
    loads[1].resolve('new')
    await vi.waitFor(() => expect(cache.peek('k')).toEqual({ value: 'new', fetchedAt: 500 }))
  })

  it('keeps the previous value when a refresh fails', async () => {
    let clock = 0
    let fail = false
    const cache = createSwrCache(async () => {
      if (fail)
        throw new Error('offline')
      return 'ok'
    }, () => clock)

    await cache.get('k', 100)
    fail = true
    clock = 500
    await expect(cache.refresh('k')).rejects.toThrow('offline')
    expect(cache.peek('k')?.value).toBe('ok')
    // A background refresh swallows the failure.
    expect(cache.peekAndRevalidate('k', 100)?.value).toBe('ok')
  })
})
