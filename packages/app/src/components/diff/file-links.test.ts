import { describe, expect, it } from 'vitest'
import { githubBlobUrl, githubFileDiffUrl } from './file-links'

const HASH = 'e385bb3f39b10f9ee872d381ff0c6476e5a57c4a6f6eb74b8129b7a429fc02bc'

describe('githubBlobUrl', () => {
  it('encodes each path segment but keeps the slashes', () => {
    expect(githubBlobUrl('o', 'r', 'abc', 'src/a b.ts')).toBe('https://github.com/o/r/blob/abc/src/a%20b.ts')
  })
})

describe('githubFileDiffUrl', () => {
  it('anchors a PR link on its files tab', async () => {
    expect(await githubFileDiffUrl('https://github.com/o/r/pull/7', true, 'src/a b.ts')).toBe(`https://github.com/o/r/pull/7/files#diff-${HASH}`)
  })

  it('anchors a commit link on the page itself', async () => {
    expect(await githubFileDiffUrl('https://github.com/o/r/commit/abc', false, 'src/a b.ts')).toBe(`https://github.com/o/r/commit/abc#diff-${HASH}`)
  })
})
