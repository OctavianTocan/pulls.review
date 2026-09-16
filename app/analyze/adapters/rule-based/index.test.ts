import type { PullRequestDiff } from '../../../types/diff'
import { describe, expect, it } from 'vitest'
import { ruleBasedAdapter } from './index'

function file(path: string): PullRequestDiff['files'][number] {
  return { path, status: 'modified', additions: 1, deletions: 0, isBinary: false, sha: path, hunks: [] }
}

describe('ruleBasedAdapter', () => {
  it('groups files across multiple categories, flat (no nesting)', async () => {
    const diff: PullRequestDiff = {
      meta: { provider: 'github', id: 'github:o/r#1', title: 't', description: '' },
      files: [file('src/index.ts'), file('src/index.test.ts'), file('README.md'), file('package.json')],
    }
    const result = await ruleBasedAdapter.analyze(diff)

    expect(result.source).toBe('rule-based')
    expect(result.overallSummary).toBeUndefined()
    expect(result.walkthrough).toBeUndefined()
    for (const group of result.groups)
      expect(group.children).toBeUndefined()

    const byCategory = Object.fromEntries(result.groups.map(g => [g.category, g.filePaths]))
    expect(byCategory.code).toEqual(['src/index.ts'])
    expect(byCategory.tests).toEqual(['src/index.test.ts'])
    expect(byCategory.docs).toEqual(['README.md'])
    expect(byCategory.deps).toEqual(['package.json'])
  })

  it('falls back to the code category for anything unmatched', async () => {
    const diff: PullRequestDiff = {
      meta: { provider: 'github', id: 'github:o/r#1', title: 't', description: '' },
      files: [file('src/weird-file.xyz')],
    }
    const result = await ruleBasedAdapter.analyze(diff)
    expect(result.groups).toHaveLength(1)
    expect(result.groups[0]?.category).toBe('code')
  })

  it('is always available and needs no network', () => {
    expect(ruleBasedAdapter.available).toBe(true)
  })
})
