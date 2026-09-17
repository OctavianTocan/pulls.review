import type { FileChange } from '../../../types/diff'

/**
 * Conservative per-prompt budget (~15k tokens at 4 chars/token), leaving headroom
 * in a 128k+ context window for the system prompt, schema, and response. Picked
 * empirically against a couple of real large PRs; revisit as models improve.
 */
export const DEFAULT_CHUNK_CHAR_BUDGET = 60_000

/** Rough size of a file's diff text for budgeting purposes - exact tokenization isn't worth it here. */
export function estimateFileChars(file: FileChange): number {
  return file.path.length + file.hunks.reduce((sum, hunk) => sum + hunk.header.length + hunk.patch.length, 0)
}

/**
 * Splits files into budget-sized chunks, in order, without splitting a single file's
 * patch across chunks - a file bigger than the whole budget still gets its own chunk.
 * Returns a single chunk (or none, for an empty diff) when everything fits.
 */
export function chunkFiles(files: FileChange[], budget = DEFAULT_CHUNK_CHAR_BUDGET): FileChange[][] {
  const chunks: FileChange[][] = []
  let current: FileChange[] = []
  let currentSize = 0

  for (const file of files) {
    const size = estimateFileChars(file)
    if (current.length > 0 && currentSize + size > budget) {
      chunks.push(current)
      current = []
      currentSize = 0
    }
    current.push(file)
    currentSize += size
  }
  if (current.length > 0)
    chunks.push(current)

  return chunks
}
