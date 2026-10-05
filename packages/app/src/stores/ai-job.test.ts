import type { ResolvedModel } from '@pulls.review/core/analyze'
import type { AiJobSnapshot } from '@pulls.review/core/local-rpc'
import type { DiffsPayload, FileChange } from '@pulls.review/core/types'
import { describe, expect, it } from 'vitest'
import { analysisJobKey, analysisJobLabel, buildPrContext, runUsage } from './ai-job'

function file(patch: Partial<FileChange> & { path: string }): FileChange {
  return { status: 'modified', additions: 1, deletions: 1, isBinary: false, sha: patch.path, hunks: [], ...patch }
}

const pull: DiffsPayload = {
  ref: { kind: 'github-pr', owner: 'antfu', repo: 'pulls.review', number: '62' },
  title: 'Speed up the dashboard',
  base: { sha: 'base1', ref: 'main' },
  head: { sha: 'head1', ref: 'feat' },
  files: [
    file({
      path: 'src/a.ts',
      hunks: [
        { header: '@@ -1,2 +1,2 @@ function a', oldStart: 1, oldLines: 2, newStart: 1, newLines: 2, patch: '-old\n+new\n same' },
        { header: '@@ -10 +10 @@', oldStart: 10, oldLines: 1, newStart: 10, newLines: 1, patch: '-x\n+y' },
      ],
    }),
    file({ path: 'logo.png', status: 'added', isBinary: true }),
    file({ path: 'src/b.ts', previousPath: 'src/old-b.ts', status: 'renamed' }),
  ],
}

describe('buildPrContext', () => {
  it('describes a pull request with every file and its hunks as one patch', () => {
    expect(buildPrContext(pull)).toEqual({
      owner: 'antfu',
      repo: 'pulls.review',
      number: 62,
      title: 'Speed up the dashboard',
      headSha: 'head1',
      baseSha: 'base1',
      files: [
        { path: 'src/a.ts', previousPath: undefined, status: 'modified', patch: '@@ -1,2 +1,2 @@\n-old\n+new\n same\n@@ -10,1 +10,1 @@\n-x\n+y' },
        { path: 'logo.png', previousPath: undefined, status: 'added', patch: undefined },
        { path: 'src/b.ts', previousPath: 'src/old-b.ts', status: 'renamed', patch: undefined },
      ],
    })
  })

  it('leaves out the number and title for commits and takes the head from the ref', () => {
    const context = buildPrContext({ ...pull, ref: { kind: 'github-commit', owner: 'antfu', repo: 'pulls.review', sha: 'c0ffee' }, head: undefined })
    expect(context).toMatchObject({ headSha: 'c0ffee', number: undefined, title: undefined })
  })

  it('has nothing to offer for pasted diffs', () => {
    expect(buildPrContext({ ...pull, ref: { kind: 'paste', hash: 'abc' } })).toBeUndefined()
  })
})

describe('analysisJobKey', () => {
  const resolved = { model: { provider: 'claude-code', id: 'opus' }, apiKey: '', effort: 'high' } as ResolvedModel

  it('changes with the head commit, engine, model and effort', () => {
    expect(analysisJobKey(pull, resolved)).toBe('analyze:github:antfu/pulls.review#62@head1:claude-code:opus:high')
    expect(analysisJobKey(pull, { ...resolved, effort: undefined })).toBe('analyze:github:antfu/pulls.review#62@head1:claude-code:opus:')
  })
})

describe('analysisJobLabel', () => {
  it('names pull requests the way GitHub does', () => {
    expect(analysisJobLabel(pull)).toBe('Analyze antfu/pulls.review#62')
    expect(analysisJobLabel({ ...pull, ref: { kind: 'paste', hash: 'abc' } })).toBe('Analyze paste:abc')
  })
})

describe('runUsage', () => {
  function job(id: string, usage?: AiJobSnapshot['usage']): AiJobSnapshot {
    return { id, engine: 'codex', status: 'done', rev: 1, activities: [], startedAt: 0, usage }
  }

  it('sums the counts of matching jobs and keeps the newest model', () => {
    const jobs = [
      job('b', { inputTokens: 10, outputTokens: 2, durationMs: 1000, model: 'gpt-5.6-sol' }),
      job('other', { inputTokens: 999 }),
      job('a', { inputTokens: 5, reasoningTokens: 7, durationMs: 500, model: 'gpt-5.5' }),
    ]
    expect(runUsage(jobs, candidate => candidate.id !== 'other')).toEqual({
      model: 'gpt-5.6-sol',
      inputTokens: 15,
      outputTokens: 2,
      reasoningTokens: 7,
      durationMs: 1500,
    })
  })

  it('leaves cost unset when no job reported one', () => {
    expect(runUsage([job('a', { inputTokens: 1 })], () => true)?.costUsd).toBeUndefined()
  })

  it('has nothing when no job matched or reported usage', () => {
    expect(runUsage([job('a')], () => true)).toBeUndefined()
  })
})
