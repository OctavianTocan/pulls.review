import type { MyPull } from '@pulls.review/core/local-rpc'
import { describe, expect, it } from 'vitest'
import { countQueues, filterPulls, groupByRepo, inQueue, STALE_AFTER_DAYS } from './triage'

const NOW = Date.parse('2026-10-05T12:00:00Z')

function pull(overrides: Partial<MyPull> = {}): MyPull {
  return {
    owner: 'acme',
    repo: 'app',
    number: 1,
    title: 'Fix the thing',
    author: 'octo',
    isDraft: false,
    updatedAt: '2026-10-05T00:00:00Z',
    commentsCount: 0,
    labels: [],
    state: 'open',
    role: 'authored',
    ...overrides,
  }
}

describe('inQueue', () => {
  it('needs my review: a pending request, falling back to the role', () => {
    expect(inQueue(pull({ requestedFromMe: true }), 'needs-review', NOW)).toBe(true)
    expect(inQueue(pull({ role: 'review-requested', requestedFromMe: false }), 'needs-review', NOW)).toBe(false)
    expect(inQueue(pull({ role: 'review-requested' }), 'needs-review', NOW)).toBe(true)
  })

  it('ci failing and changes requested', () => {
    expect(inQueue(pull({ checks: 'failure' }), 'ci-failing', NOW)).toBe(true)
    expect(inQueue(pull({ checks: 'pending' }), 'ci-failing', NOW)).toBe(false)
    expect(inQueue(pull({ reviewDecision: 'changes-requested' }), 'changes-requested', NOW)).toBe(true)
  })

  it('ready to merge: approved, green or no checks, mergeable, not a draft', () => {
    const ready = pull({ reviewDecision: 'approved', checks: 'success', mergeable: 'mergeable' })
    expect(inQueue(ready, 'ready-to-merge', NOW)).toBe(true)
    expect(inQueue({ ...ready, checks: 'none' }, 'ready-to-merge', NOW)).toBe(true)
    expect(inQueue({ ...ready, checks: 'pending' }, 'ready-to-merge', NOW)).toBe(false)
    expect(inQueue({ ...ready, mergeable: 'conflicting' }, 'ready-to-merge', NOW)).toBe(false)
    expect(inQueue({ ...ready, mergeable: 'unknown' }, 'ready-to-merge', NOW)).toBe(false)
    expect(inQueue({ ...ready, isDraft: true }, 'ready-to-merge', NOW)).toBe(false)
    expect(inQueue({ ...ready, reviewDecision: undefined }, 'ready-to-merge', NOW)).toBe(false)
  })

  it('stale after two weeks without activity', () => {
    const at = (days: number) => new Date(NOW - days * 24 * 60 * 60_000).toISOString()
    expect(inQueue(pull({ updatedAt: at(STALE_AFTER_DAYS) }), 'stale', NOW)).toBe(true)
    expect(inQueue(pull({ updatedAt: at(STALE_AFTER_DAYS - 1) }), 'stale', NOW)).toBe(false)
  })
})

describe('counting and filtering', () => {
  const pulls = [
    pull({ number: 1, role: 'review-requested', requestedFromMe: true, checks: 'failure' }),
    pull({ number: 2, role: 'authored', checks: 'failure', title: 'Docs' }),
    pull({ number: 3, role: 'authored', reviewDecision: 'approved', checks: 'success', mergeable: 'mergeable', repo: 'site' }),
  ]

  it('counts every queue', () => {
    expect(countQueues(pulls, NOW)).toEqual({ 'needs-review': 1, 'ci-failing': 2, 'changes-requested': 0, 'ready-to-merge': 1, 'stale': 0, 'all': 3 })
  })

  it('counts queues under the role and roles under the queue', () => {
    const result = filterPulls(pulls, { queue: 'ci-failing', role: 'authored', needle: '' }, NOW)
    expect(result.pulls.map(p => p.number)).toEqual([2])
    expect(result.queueCounts['ci-failing']).toBe(1)
    expect(result.queueCounts['ready-to-merge']).toBe(1)
    expect(result.roleCounts).toEqual({ 'all': 2, 'review-requested': 1, 'authored': 1, 'involved': 0, 'owned': 0 })
  })

  it('applies the search to everything', () => {
    const result = filterPulls(pulls, { queue: 'all', role: 'all', needle: 'docs' }, NOW)
    expect(result.pulls.map(p => p.number)).toEqual([2])
    expect(result.queueCounts.all).toBe(1)
    expect(filterPulls(pulls, { queue: 'all', role: 'all', needle: 'acme/site' }, NOW).pulls.map(p => p.number)).toEqual([3])
  })

  it('groups by repository in order of first appearance', () => {
    expect(groupByRepo(pulls).map(group => [group.name, group.pulls.map(p => p.number)])).toEqual([['acme/app', [1, 2]], ['acme/site', [3]]])
  })
})
