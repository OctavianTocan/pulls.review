import type { PrCommit } from '@pulls.review/core/github'
import { describe, expect, it } from 'vitest'
import { adjacentCommits, commitSelectionRef, formatCommitSelection, parseCommitSelection, resolveCommitSelection, selectCommit, selectCommitRange } from './commit-selection'

function commit(oid: string): PrCommit {
  return { oid, abbreviatedOid: oid.slice(0, 7), headline: oid, body: '', committedDate: '2026-01-01T00:00:00Z', url: '', author: {} }
}

const commits = ['aaaaaaa1111111111', 'bbbbbbb2222222222', 'ccccccc3333333333'].map(commit)

describe('parseCommitSelection', () => {
  it('reads a single sha', () => {
    expect(parseCommitSelection('ABCDEF0')).toEqual({ from: 'abcdef0', to: 'abcdef0' })
  })

  it('reads a range', () => {
    expect(parseCommitSelection('aaaaaaa..bbbbbbb')).toEqual({ from: 'aaaaaaa', to: 'bbbbbbb' })
  })

  it.each([undefined, '', 'abc', 'zzzzzzz', 'aaaaaaa..', 'aaaaaaa..bbbbbbb..ccccccc', ['aaaaaaa']])('rejects %j', (value) => {
    expect(parseCommitSelection(value)).toBeUndefined()
  })
})

describe('formatCommitSelection', () => {
  it('round-trips with parse', () => {
    for (const value of ['abcdef0', 'aaaaaaa..bbbbbbb'])
      expect(formatCommitSelection(parseCommitSelection(value)!)).toBe(value)
  })
})

describe('commitSelectionRef', () => {
  it('uses the commit source for one commit', () => {
    expect(commitSelectionRef('o', 'r', { from: 'abc1234', to: 'abc1234' })).toEqual({ kind: 'github-commit', owner: 'o', repo: 'r', sha: 'abc1234' })
  })

  it('compares from the first commit\'s parent for a range', () => {
    expect(commitSelectionRef('o', 'r', { from: 'aaaaaaa', to: 'ccccccc' })).toEqual({ kind: 'github-compare', owner: 'o', repo: 'r', base: 'aaaaaaa^', head: 'ccccccc' })
  })
})

describe('resolveCommitSelection', () => {
  it('finds both ends by prefix', () => {
    expect(resolveCommitSelection(commits, { from: 'aaaaaaa', to: 'ccccccc' })).toEqual({ start: 0, end: 2 })
  })

  it('normalizes a reversed range', () => {
    expect(resolveCommitSelection(commits, { from: 'ccccccc', to: 'bbbbbbb' })).toEqual({ start: 1, end: 2 })
  })

  it('is undefined when an end is unknown', () => {
    expect(resolveCommitSelection(commits, { from: 'aaaaaaa', to: 'ddddddd' })).toBeUndefined()
  })
})

describe('selectCommit / selectCommitRange', () => {
  it('shortens to a stable prefix', () => {
    expect(selectCommit(commits[0]!.oid)).toEqual({ from: 'aaaaaaa11111', to: 'aaaaaaa11111' })
  })

  it('orders a range oldest first', () => {
    expect(selectCommitRange(commits, 2, 0)).toEqual({ from: 'aaaaaaa11111', to: 'ccccccc33333' })
    expect(selectCommitRange(commits, 1)).toEqual(selectCommit(commits[1]!.oid))
  })
})

describe('adjacentCommits', () => {
  it('steps around a single commit', () => {
    expect(adjacentCommits(commits, selectCommit(commits[1]!.oid))).toEqual({
      previous: selectCommit(commits[0]!.oid),
      next: selectCommit(commits[2]!.oid),
    })
  })

  it('has no previous at the oldest and no next at the newest', () => {
    expect(adjacentCommits(commits, selectCommit(commits[0]!.oid)).previous).toBeUndefined()
    expect(adjacentCommits(commits, selectCommit(commits[2]!.oid)).next).toBeUndefined()
  })

  it('steps out of a range from its ends', () => {
    expect(adjacentCommits(commits, { from: 'bbbbbbb', to: 'ccccccc' })).toEqual({ previous: selectCommit(commits[0]!.oid), next: undefined })
  })

  it('is empty for an unknown selection', () => {
    expect(adjacentCommits(commits, { from: 'ddddddd', to: 'ddddddd' })).toEqual({})
  })
})
