import type { GithubPullRequestFileJson, GithubPullRequestJson } from './api'
import { describe, expect, it, vi } from 'vitest'
import { normalizePullRequest } from './normalize'

const PR_JSON: GithubPullRequestJson = {
  title: 'Add feature',
  body: 'Some description',
  user: { login: 'antfu' },
  base: { ref: 'main', sha: 'base123' },
  head: { ref: 'feature', sha: 'head456' },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  html_url: 'https://github.com/owner/repo/pull/1',
}

describe('normalizePullRequest', () => {
  it('normalizes metadata and a file with an inline patch', async () => {
    const files: GithubPullRequestFileJson[] = [
      {
        filename: 'src/foo.ts',
        status: 'modified',
        additions: 1,
        deletions: 1,
        sha: 'abc123',
        patch: '@@ -1,2 +1,2 @@\n context\n-old\n+new',
      },
    ]
    const diff = await normalizePullRequest('owner', 'repo', '1', PR_JSON, files, async () => '')

    expect(diff.meta).toMatchObject({
      provider: 'github',
      id: 'github:owner/repo#1',
      title: 'Add feature',
      author: 'antfu',
      baseRef: 'main',
      headRef: 'feature',
    })
    expect(diff.files).toHaveLength(1)
    expect(diff.files[0]).toMatchObject({ path: 'src/foo.ts', status: 'modified', sha: 'abc123', isBinary: false })
    expect(diff.files[0]!.hunks).toHaveLength(1)
  })

  it('marks a renamed file with previousPath', async () => {
    const files: GithubPullRequestFileJson[] = [
      {
        filename: 'src/new-name.ts',
        previous_filename: 'src/old-name.ts',
        status: 'renamed',
        additions: 0,
        deletions: 0,
        sha: 'def456',
        patch: undefined,
      },
    ]
    const diff = await normalizePullRequest('owner', 'repo', '1', PR_JSON, files, async () => '')
    expect(diff.files[0]).toMatchObject({ status: 'renamed', previousPath: 'src/old-name.ts', path: 'src/new-name.ts' })
  })

  it('falls back to the raw diff text when `patch` is omitted (large diff)', async () => {
    const files: GithubPullRequestFileJson[] = [
      {
        filename: 'src/huge.ts',
        status: 'modified',
        additions: 500,
        deletions: 10,
        sha: 'ghi789',
      },
    ]
    const fallbackText = 'diff --git a/src/huge.ts b/src/huge.ts\n'
      + 'index 0000000..ghi789 100644\n'
      + '--- a/src/huge.ts\n'
      + '+++ b/src/huge.ts\n'
      + '@@ -1,1 +1,1 @@\n'
      + '-old\n'
      + '+new\n'
    const loadFallback = vi.fn(async () => fallbackText)
    const diff = await normalizePullRequest('owner', 'repo', '1', PR_JSON, files, loadFallback)

    expect(loadFallback).toHaveBeenCalledOnce()
    expect(diff.files[0]).toMatchObject({ path: 'src/huge.ts', sha: 'ghi789', isBinary: false, additions: 500, deletions: 10 })
    expect(diff.files[0]!.hunks).toHaveLength(1)
  })

  it('detects a binary file via the fallback diff text', async () => {
    const files: GithubPullRequestFileJson[] = [
      {
        filename: 'assets/logo.png',
        status: 'modified',
        additions: 0,
        deletions: 0,
        sha: 'jkl012',
      },
    ]
    const fallbackText = 'diff --git a/assets/logo.png b/assets/logo.png\n'
      + 'index aaa..jkl012 100644\n'
      + 'Binary files a/assets/logo.png and b/assets/logo.png differ\n'
    const diff = await normalizePullRequest('owner', 'repo', '1', PR_JSON, files, async () => fallbackText)

    expect(diff.files[0]).toMatchObject({ path: 'assets/logo.png', isBinary: true })
  })

  it('only fetches the fallback diff text once even with multiple omitted-patch files', async () => {
    const files: GithubPullRequestFileJson[] = [
      { filename: 'a.ts', status: 'modified', additions: 1, deletions: 0, sha: 'a1' },
      { filename: 'b.ts', status: 'modified', additions: 1, deletions: 0, sha: 'b1' },
    ]
    const fallbackText = [
      'diff --git a/a.ts b/a.ts\nindex 0..a1 100644\n--- a/a.ts\n+++ b/a.ts\n@@ -0,0 +1,1 @@\n+a\n',
      'diff --git a/b.ts b/b.ts\nindex 0..b1 100644\n--- a/b.ts\n+++ b/b.ts\n@@ -0,0 +1,1 @@\n+b\n',
    ].join('')
    const loadFallback = vi.fn(async () => fallbackText)
    await normalizePullRequest('owner', 'repo', '1', PR_JSON, files, loadFallback)
    expect(loadFallback).toHaveBeenCalledOnce()
  })
})
