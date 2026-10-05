import type { DiffsPayload, FileChange } from '@pulls.review/core/types'
import { describe, expect, it } from 'vitest'
import { askSelectionOf, githubBlobUrl, lineRangeLabel } from './selection'

const file: FileChange = { path: 'src/new name.ts', previousPath: 'src/old.ts', status: 'renamed', additions: 1, deletions: 1, isBinary: false, sha: 's', hunks: [] }

function payload(ref: DiffsPayload['ref']): DiffsPayload {
  return { ref, title: 't', files: [file], base: { sha: 'base1', ref: 'main' }, head: { sha: 'head1', ref: 'feat' } }
}

describe('askSelectionOf', () => {
  it('keeps a range on one side', () => {
    expect(askSelectionOf({ path: 'a.ts', side: 'additions', line: 20, startLine: 10, startSide: 'additions' }))
      .toEqual({ path: 'a.ts', side: 'additions', startLine: 10, endLine: 20 })
  })

  it('turns a single line into a one-line range', () => {
    expect(askSelectionOf({ path: 'a.ts', side: 'deletions', line: 4 }))
      .toEqual({ path: 'a.ts', side: 'deletions', startLine: 4, endLine: 4 })
  })

  it('never starts after the end when the range crosses sides', () => {
    expect(askSelectionOf({ path: 'a.ts', side: 'additions', line: 5, startLine: 9, startSide: 'deletions' }))
      .toEqual({ path: 'a.ts', side: 'additions', startLine: 5, endLine: 5 })
  })
})

describe('lineRangeLabel', () => {
  it('labels one line and a range', () => {
    expect(lineRangeLabel({ path: 'a.ts', side: 'additions', startLine: 3, endLine: 3 })).toBe('a.ts:L3')
    expect(lineRangeLabel({ path: 'a.ts', side: 'additions', startLine: 10, endLine: 20 })).toBe('a.ts:L10-L20')
  })
})

describe('githubBlobUrl', () => {
  const pr = payload({ kind: 'github-pr', owner: 'o', repo: 'r', number: '1' })

  it('links added lines at the head', () => {
    expect(githubBlobUrl(pr, file, { path: file.path, side: 'additions', startLine: 10, endLine: 20 }))
      .toBe('https://github.com/o/r/blob/head1/src/new%20name.ts#L10-L20')
  })

  it('links removed lines at the base, under the old path', () => {
    expect(githubBlobUrl(pr, file, { path: file.path, side: 'deletions', startLine: 7, endLine: 7 }))
      .toBe('https://github.com/o/r/blob/base1/src/old.ts#L7')
  })

  it('has no link outside GitHub or without the commit', () => {
    expect(githubBlobUrl(payload({ kind: 'local', repo: '/r', target: '' }), file, { path: file.path, side: 'additions', startLine: 1, endLine: 1 })).toBeUndefined()
    expect(githubBlobUrl({ ...pr, head: undefined }, file, { path: file.path, side: 'additions', startLine: 1, endLine: 1 })).toBeUndefined()
  })
})
