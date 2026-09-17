import type { FileChange } from '../../../types/diff'

const GROUPING_RULES = `You are reviewing a GitHub pull request's diff. Group the changed files into
logical groups a reviewer would want to see, e.g. "a feature and its tests", "docs",
"generated/lockfiles", "config". A group may optionally have "children" for one extra
level of nesting (e.g. splitting a large feature by sub-area) - children cannot have
children of their own. Every file path given to you MUST appear in exactly one group,
either directly in "filePaths" or in exactly one child's "filePaths", never both and
never omitted. Use short, stable, kebab-case-ish "key"s and human-readable "label"s.
Keep every "summary" to one or two sentences.`

export const SINGLE_PASS_SYSTEM_PROMPT = `${GROUPING_RULES}

Also write:
- "overallSummary": a short paragraph summarizing the whole PR for a reviewer who
  hasn't read it yet.
- "walkthrough": optional ordered narrative steps (title + a few sentences + the
  file paths each step is about) guiding a reviewer through the change, when the PR
  is substantial enough to benefit from one. Omit it for small/simple PRs.`

export const CHUNK_SYSTEM_PROMPT = `${GROUPING_RULES}

You are only seeing one part of a larger diff, split across multiple prompts for
context-length reasons - do not reference other parts you haven't seen. Also write
"summary": a short paragraph summarizing just the files in this part.`

export const SYNTHESIS_SYSTEM_PROMPT = `You are given per-section summaries and the
resulting file groups for a GitHub pull request too large to review in one pass, but
none of the raw diff text. Write:
- "overallSummary": a short paragraph summarizing the whole PR for a reviewer, based
  only on the section summaries given.
- "walkthrough": optional ordered narrative steps (title + a few sentences + the
  file paths each step is about) guiding a reviewer through the change, when the PR
  is substantial enough to benefit from one. Omit it for small/simple PRs.`

/** Renders a set of files as compact diff text for a prompt - the model-facing view of a patch. */
export function renderFilesAsText(files: FileChange[]): string {
  return files.map((file) => {
    const rename = file.previousPath ? ` (renamed from ${file.previousPath})` : ''
    const header = `### ${file.path}${rename} [${file.status}, +${file.additions}/-${file.deletions}]`
    if (file.isBinary)
      return `${header}\n(binary file, no diff shown)`
    const body = file.hunks.map(hunk => `${hunk.header}\n${hunk.patch}`).join('\n')
    return `${header}\n${body}`
  }).join('\n\n')
}

export function buildDiffPrompt(title: string, description: string | undefined, files: FileChange[]): string {
  return `PR title: ${title}\n${description ? `PR description: ${description}\n` : ''}\n${renderFilesAsText(files)}`
}
