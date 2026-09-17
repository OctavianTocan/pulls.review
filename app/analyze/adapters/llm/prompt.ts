import type { DiffsPayload, FileChange } from '../../../types/diff'
import picomatch from 'picomatch'
import { GENERATED_PATTERNS } from '../rule-based/rules'

const isGeneratedPath = picomatch(GENERATED_PATTERNS)

// Per-field rules (nesting depth, filePaths coverage, key/label style, summary
// length/Markdown, ...) live as `description`s on the response schema itself
// (see `types/analyze.ts`, `schema.ts`) - the model sees those directly, so this
// only needs to set the scene and give a shape example.
const GROUPING_RULES = `You are reviewing a GitHub pull request's diff. Group the changed
files into logical groups a reviewer would want to see, e.g. "a feature and its tests",
"docs", "generated/lockfiles", "config".`

export const SINGLE_PASS_SYSTEM_PROMPT = GROUPING_RULES

export const CHUNK_SYSTEM_PROMPT = `${GROUPING_RULES}

You are only seeing one part of a larger diff, split across multiple prompts for
context-length reasons - do not reference other parts you haven't seen.`

export const SYNTHESIS_SYSTEM_PROMPT = `You are given per-section summaries and the
resulting file groups for a GitHub pull request too large to review in one pass, but
none of the raw diff text.`

/** Renders a set of files as compact diff text for a prompt - the model-facing view of a patch. */
export function renderFilesAsText(files: FileChange[]): string {
  return files.map((file) => {
    const rename = file.previousPath ? ` (renamed from ${file.previousPath})` : ''
    const header = `### ${file.path}${rename} [${file.status}, +${file.additions}/-${file.deletions}]`
    if (file.isBinary)
      return `${header}\n(binary file, no diff shown)`
    // Lockfiles/build output are rarely worth reviewing line-by-line and can be huge -
    // omitting their diff body saves tokens without losing anything a reviewer needs.
    if (isGeneratedPath(file.path))
      return `${header}\n(generated file, diff omitted to save tokens)`
    const body = file.hunks.map(hunk => `${hunk.header}\n${hunk.patch}`).join('\n')
    return `${header}\n${body}`
  }).join('\n\n')
}

/**
 * Builds the model-facing prompt for a diff (or, from `analyzeChunked`, one chunk of
 * it - `files` defaults to the whole `diff.files` otherwise). `---DESCRIPTION---` and
 * `---CHANGES---` mark the sections so the model can tell PR prose from patch text.
 */
export function buildDiffPrompt(diff: DiffsPayload, files: FileChange[] = diff.files): string {
  const parts = [`PR title: ${diff.title}`]
  if (diff.url)
    parts.push(`PR link: ${diff.url}`)
  if (diff.description)
    parts.push(`---DESCRIPTION---\n${diff.description}`)
  parts.push(`---CHANGES---\n${renderFilesAsText(files)}`)
  return parts.join('\n\n')
}
