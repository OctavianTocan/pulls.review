import type { FileChange } from '../../../../app/types/diff'
import { describe, expect, it } from 'vitest'
import { buildDiffPrompt } from '../../../../app/analyze/adapters/llm/prompt'

function file(path: string, patch: string, opts: Partial<FileChange> = {}): FileChange {
  return {
    path,
    status: 'modified',
    additions: 1,
    deletions: 0,
    isBinary: false,
    sha: path,
    hunks: [{ header: '@@ -1,1 +1,1 @@', oldStart: 1, oldLines: 1, newStart: 1, newLines: 1, patch }],
    ...opts,
  }
}

describe('buildDiffPrompt snapshot', () => {
  it('matches the snapshot for a representative diff', () => {
    const files = [
      file('src/factory.ts', '-export function factory() {}\n+export function factory(options: Options = {}) {}'),
      file('src/factory.test.ts', '+it(\'accepts options\', () => {\n+  expect(factory({})).toBeDefined()\n+})'),
      file('README.md', '+Also supports an `antislop` option.'),
    ]

    const prompt = buildDiffPrompt('Add antislop option', 'Adds an opt-in antislop factory option.', files)
    expect(prompt).toMatchSnapshot()
  })

  it('omits the description line entirely when there is none', () => {
    const files = [file('src/factory.ts', '+export function factory() {}')]
    const prompt = buildDiffPrompt('Add antislop option', undefined, files)
    expect(prompt).toMatchSnapshot()
  })
})
