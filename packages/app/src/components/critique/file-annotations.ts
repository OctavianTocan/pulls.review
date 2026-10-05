import type { CritiqueFinding, DiffHunk, DiffSide, FileChange, FileNote } from '@pulls.review/core/types'
import type { AskThread } from '../../stores/types'

/** The AI content shown under one line of a file's diff. */
export interface AiAnchor {
  side: DiffSide
  line: number
  findings: CritiqueFinding[]
  /** Hunk notes, as plain text. */
  notes: string[]
  threads: AskThread[]
}

/**
 * The line a note about `hunk` sits under: the last unchanged line before its first
 * change, or that change when the hunk opens with it.
 * @param hunk - The hunk.
 * @returns The anchor, or `undefined` for a hunk with no lines.
 */
export function hunkAnchor(hunk: DiffHunk): { side: DiffSide, line: number } | undefined {
  const body = hunk.patch.replace(/\n$/, '')
  if (!body)
    return
  let leading = 0
  for (const text of body.split('\n')) {
    const mark = text[0]
    // An empty line is context whose leading space was stripped.
    if (mark === ' ' || mark === undefined) {
      leading++
      continue
    }
    if (mark === '\\')
      continue
    if (leading > 0)
      break
    return mark === '-' ? { side: 'deletions', line: hunk.oldStart } : { side: 'additions', line: hunk.newStart }
  }
  return leading > 0 ? { side: 'additions', line: hunk.newStart + leading - 1 } : undefined
}

/**
 * The AI content of one file, grouped by the line it sits under.
 * @param file - The file.
 * @param sources - What to place; content about other files is ignored.
 * @param sources.findings - The shown critique's findings.
 * @param sources.note - The analysis note for the file.
 * @param sources.threads - The ask threads.
 * @returns One anchor per line with content, in no particular order.
 */
export function aiAnchors(file: FileChange, sources: { findings?: readonly CritiqueFinding[], note?: FileNote, threads?: readonly AskThread[] }): AiAnchor[] {
  const anchors = new Map<string, AiAnchor>()
  function anchorAt(side: DiffSide, line: number): AiAnchor {
    const key = `${side}-${line}`
    let anchor = anchors.get(key)
    if (!anchor) {
      anchor = { side, line, findings: [], notes: [], threads: [] }
      anchors.set(key, anchor)
    }
    return anchor
  }

  for (const finding of sources.findings ?? []) {
    if (finding.path === file.path)
      anchorAt(finding.side, finding.line).findings.push(finding)
  }
  if (sources.note?.path === file.path) {
    for (const { index, note } of sources.note.hunks ?? []) {
      const hunk = file.hunks[index]
      const at = hunk && hunkAnchor(hunk)
      if (at)
        anchorAt(at.side, at.line).notes.push(note)
    }
  }
  for (const thread of sources.threads ?? []) {
    if (thread.selection.path === file.path)
      anchorAt(thread.selection.side, thread.selection.endLine).threads.push(thread)
  }
  return [...anchors.values()]
}
