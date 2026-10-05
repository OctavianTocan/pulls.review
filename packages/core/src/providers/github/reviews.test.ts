import { afterEach, describe, expect, it, vi } from 'vitest'
import { staticCredentials } from '../../types/source'
import { createGithubClient } from './client'
import { createGithubReviewsApi } from './reviews'

const comments = [
  { target: { path: 'a.ts', side: 'additions' as const, line: 4, startLine: 2, startSide: 'additions' as const }, body: 'Range' },
  { target: { path: 'a.ts', side: 'deletions' as const, line: 7 }, body: 'Removed' },
]

function api() {
  return createGithubReviewsApi(createGithubClient(staticCredentials('token')), { owner: 'o', repo: 'r', number: '1' })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('postReview', () => {
  it('posts one COMMENT review holding every comment', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await api().postReview({ headSha: 'h', body: 'Summary', comments })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://api.github.com/repos/o/r/pulls/1/reviews')
    expect(JSON.parse(init.body)).toEqual({
      commit_id: 'h',
      event: 'COMMENT',
      body: 'Summary',
      comments: [
        { path: 'a.ts', body: 'Range', side: 'RIGHT', line: 4, start_line: 2, start_side: 'RIGHT' },
        { path: 'a.ts', body: 'Removed', side: 'LEFT', line: 7 },
      ],
    })
  })

  it('adds the comments to a pending review and submits it', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ data: {} }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await api().postReview({ headSha: 'h', body: 'Summary', comments, pendingReview: { id: 9, nodeId: 'PRR_9' } })

    const urls = fetchMock.mock.calls.map(([url]) => url)
    expect(urls).toEqual([
      'https://api.github.com/graphql',
      'https://api.github.com/graphql',
      'https://api.github.com/repos/o/r/pulls/1/reviews/9/events',
    ])
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).variables).toMatchObject({ reviewId: 'PRR_9', path: 'a.ts', line: 4, side: 'RIGHT', startLine: 2 })
    expect(JSON.parse(fetchMock.mock.calls[2]![1].body)).toEqual({ event: 'COMMENT', body: 'Summary' })
  })
})
