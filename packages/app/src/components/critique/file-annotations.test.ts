import type { CritiqueFinding, DiffHunk, FileChange } from '@pulls.review/core/types'
import type { AskThread } from '../../stores/types'
import { describe, expect, it } from 'vitest'
import { aiAnchors, hunkAnchor } from './file-annotations'

function hunk(oldStart: number, newStart: number, lines: string[]): DiffHunk {
  return { header: `@@ -${oldStart} +${newStart} @@`, oldStart, oldLines: 0, newStart, newLines: 0, patch: `${lines.join('\n')}\n` }
}

function finding(id: string, path: string, line: number, side: CritiqueFinding['side'] = 'additions'): CritiqueFinding {
  return { id, path, side, line, severity: 'bug', title: id, body: id }
}

function thread(id: string, path: string, endLine: number): AskThread {
  return { id, selection: { path, side: 'additions', startLine: 1, endLine }, label: id, turns: [], isAsking: false }
}

describe('hunkAnchor', () => {
  it('sits under the last unchanged line before the first change', () => {
    expect(hunkAnchor(hunk(10, 12, [' a', ' b', '-c', '+d']))).toEqual({ side: 'additions', line: 13 })
  })

  it('sits under the opening change when there is no leading context', () => {
    expect(hunkAnchor(hunk(10, 12, ['+a', ' b']))).toEqual({ side: 'additions', line: 12 })
    expect(hunkAnchor(hunk(10, 12, ['-a', '+b']))).toEqual({ side: 'deletions', line: 10 })
  })

  it('counts a stripped empty context line', () => {
    expect(hunkAnchor(hunk(1, 1, [' a', '', '+b']))).toEqual({ side: 'additions', line: 2 })
  })

  it('has no anchor for an empty hunk', () => {
    expect(hunkAnchor(hunk(1, 1, []))).toBeUndefined()
  })
})

describe('aiAnchors', () => {
  const file: FileChange = { path: 'a.ts', status: 'modified', additions: 1, deletions: 1, isBinary: false, sha: 's', hunks: [hunk(1, 1, ['+x']), hunk(20, 20, [' y', '-z'])] }

  it('groups findings, hunk notes and threads of this file by line', () => {
    const anchors = aiAnchors(file, {
      findings: [finding('f1', 'a.ts', 1), finding('f2', 'b.ts', 1), finding('f3', 'a.ts', 1)],
      note: { path: 'a.ts', summary: 's', hunks: [{ index: 0, note: 'first' }, { index: 1, note: 'second' }, { index: 7, note: 'gone' }] },
      threads: [thread('t1', 'a.ts', 20), thread('t2', 'b.ts', 20)],
    })
    expect(anchors).toEqual([
      { side: 'additions', line: 1, findings: [expect.objectContaining({ id: 'f1' }), expect.objectContaining({ id: 'f3' })], notes: ['first'], threads: [] },
      { side: 'additions', line: 20, findings: [], notes: ['second'], threads: [expect.objectContaining({ id: 't1' })] },
    ])
  })

  it('ignores a note about another file', () => {
    expect(aiAnchors(file, { note: { path: 'b.ts', summary: 's', hunks: [{ index: 0, note: 'n' }] } })).toEqual([])
  })
})
