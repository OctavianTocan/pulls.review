import type { PullRequestDiff } from '../../../../app/types/diff'
import { describe, expect, it } from 'vitest'
import { ruleBasedAdapter } from '../../../../app/analyze/adapters/rule-based'

function file(path: string): PullRequestDiff['files'][number] {
  return { path, status: 'modified', additions: 1, deletions: 0, isBinary: false, sha: path, hunks: [] }
}

describe('ruleBasedAdapter output snapshot', () => {
  it('matches the snapshot for a representative diff', async () => {
    const diff: PullRequestDiff = {
      meta: { provider: 'github', id: 'github:o/r#1', title: 'Add antislop option', description: 'Adds an opt-in antislop factory option.' },
      files: [
        file('src/factory.ts'),
        file('src/factory.test.ts'),
        file('src/configs/antislop.ts'),
        file('README.md'),
        file('package.json'),
        file('pnpm-lock.yaml'),
      ],
    }
    const result = await ruleBasedAdapter.analyze(diff)
    // `generatedAt` is a timestamp - fixed to a constant so the snapshot is deterministic.
    expect({ ...result, generatedAt: '2026-01-01T00:00:00.000Z' }).toMatchSnapshot()
  })
})
