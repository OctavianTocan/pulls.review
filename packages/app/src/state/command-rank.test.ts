import { describe, expect, it } from 'vitest'
import { rank, rankItems, SCATTERED } from './command-rank'

describe('rank', () => {
  it('scores a match at the very start best', () => {
    expect(rank('open settings', 'open')).toBe(0)
  })

  it('prefers a word-start match over one inside a word', () => {
    const wordStart = rank('toggle dark mode', 'dark')!
    const inside = rank('toggle darkmode', 'mode')!
    expect(wordStart).toBeLessThan(inside)
    expect(wordStart).toBe(1_000 + 7)
  })

  it('treats path separators as word breaks', () => {
    expect(rank('src/components/app.vue', 'app')).toBe(1_000 + 15)
  })

  it('matches word initials after any substring match', () => {
    expect(rank('toggle dark mode', 'tdm')).toBe(100_000 + 12)
    expect(rank('toggle dark mode', 'tdm')!).toBeGreaterThan(rank('toggle dark mode', 'mode')!)
  })

  it('falls back to scattered characters, tighter spans first', () => {
    const tight = rank('abcxyz', 'acx')!
    expect(tight).toBe(SCATTERED + 3)
    expect(rank('aqqqqcqqqqx', 'acx')!).toBeGreaterThan(tight)
  })

  it('returns null when characters are missing or out of order', () => {
    expect(rank('settings', 'xyz')).toBeNull()
    expect(rank('abc', 'cba')).toBeNull()
  })

  it('requires every whitespace-separated term and keeps the worst score', () => {
    expect(rank('jump to src/app.ts', 'jump app')).toBe(rank('jump to src/app.ts', 'app'))
    expect(rank('jump to src/app.ts', 'jump nope')).toBeNull()
  })
})

describe('rankItems', () => {
  const items = ['Open settings', 'Toggle dark mode', 'Go to home', 'Jump to src/settings.ts']
  const self = (item: string) => item

  it('returns everything in order for an empty query', () => {
    expect(rankItems(items, '   ', self)).toEqual(items)
  })

  it('orders by score and drops non-matches', () => {
    expect(rankItems(items, 'settings', self)).toEqual(['Open settings', 'Jump to src/settings.ts'])
    expect(rankItems(items, 'go', self)[0]).toBe('Go to home')
  })

  it('is case-insensitive', () => {
    expect(rankItems(items, 'DARK', self)).toEqual(['Toggle dark mode'])
  })

  it('keeps input order for equal scores', () => {
    expect(rankItems(['b x', 'a x'], 'x', self)).toEqual(['b x', 'a x'])
  })
})
