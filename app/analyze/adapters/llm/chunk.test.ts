import type { FileChange } from '../../../types/diff'
import { describe, expect, it } from 'vitest'
import { chunkFiles, estimateFileChars } from './chunk'

function file(path: string, patchLength: number): FileChange {
  return {
    path,
    status: 'modified',
    additions: 1,
    deletions: 0,
    isBinary: false,
    sha: path,
    hunks: [{ header: '@@ -1,1 +1,1 @@', oldStart: 1, oldLines: 1, newStart: 1, newLines: 1, patch: 'x'.repeat(patchLength) }],
  }
}

describe('chunkFiles', () => {
  it('returns no chunks for an empty diff', () => {
    expect(chunkFiles([])).toEqual([])
  })

  it('keeps everything in one chunk when it fits the budget', () => {
    const files = [file('a.ts', 10), file('b.ts', 10)]
    expect(chunkFiles(files, 1000)).toEqual([files])
  })

  it('splits into multiple chunks once the running size exceeds the budget', () => {
    const files = [file('a.ts', 40), file('b.ts', 40), file('c.ts', 40)]
    const chunks = chunkFiles(files, 50)
    expect(chunks).toHaveLength(3)
    expect(chunks.flat()).toEqual(files)
  })

  it('gives an oversized single file its own chunk rather than splitting it', () => {
    const files = [file('a.ts', 10), file('huge.ts', 1000), file('b.ts', 10)]
    const chunks = chunkFiles(files, 50)
    expect(chunks.some(chunk => chunk.length === 1 && chunk[0]?.path === 'huge.ts')).toBe(true)
    expect(chunks.flat()).toEqual(files)
  })
})

describe('estimateFileChars', () => {
  it('accounts for the path and every hunk header + patch', () => {
    const f = file('a.ts', 10)
    expect(estimateFileChars(f)).toBe('a.ts'.length + '@@ -1,1 +1,1 @@'.length + 10)
  })
})
