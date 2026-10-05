import type { MyPull, MyPullRole } from '@pulls.review/core/local-rpc'

/** The home page's work queues, most actionable first; `all` is the unfiltered list. */
export const TRIAGE_QUEUES = ['needs-review', 'ci-failing', 'changes-requested', 'ready-to-merge', 'stale', 'all'] as const
export type TriageQueue = typeof TRIAGE_QUEUES[number]

/** A pull request with no activity for this many days counts as stale. */
export const STALE_AFTER_DAYS = 14
const DAY_MS = 24 * 60 * 60_000

export const ROLE_ORDER: MyPullRole[] = ['review-requested', 'authored', 'involved', 'owned']

/**
 * Whether a pull request belongs in a queue. `ready-to-merge` counts a head commit
 * without any checks as green, since nothing is blocking it.
 *
 * @param pull The pull request.
 * @param queue The queue to test.
 * @param now The current time in epoch milliseconds.
 * @returns `true` when it belongs.
 */
export function inQueue(pull: MyPull, queue: TriageQueue, now: number): boolean {
  switch (queue) {
    case 'needs-review':
      return pull.requestedFromMe ?? pull.role === 'review-requested'
    case 'ci-failing':
      return pull.checks === 'failure'
    case 'changes-requested':
      return pull.reviewDecision === 'changes-requested'
    case 'ready-to-merge':
      return !pull.isDraft
        && pull.reviewDecision === 'approved'
        && (pull.checks === 'success' || pull.checks === 'none')
        && pull.mergeable === 'mergeable'
    case 'stale':
      return now - Date.parse(pull.updatedAt) >= STALE_AFTER_DAYS * DAY_MS
    case 'all':
      return true
  }
}

/**
 * @param pulls The pull requests to count.
 * @param now The current time in epoch milliseconds.
 * @returns How many of them each queue holds.
 */
export function countQueues(pulls: MyPull[], now: number): Record<TriageQueue, number> {
  const counts = Object.fromEntries(TRIAGE_QUEUES.map(queue => [queue, 0])) as Record<TriageQueue, number>
  for (const pull of pulls) {
    for (const queue of TRIAGE_QUEUES) {
      if (inQueue(pull, queue, now))
        counts[queue]++
    }
  }
  return counts
}

/**
 * @param pull The pull request.
 * @param needle Lower-cased search text; empty matches everything.
 * @returns Whether its repo, title, author, number or a label contains the text.
 */
export function matchesSearch(pull: MyPull, needle: string): boolean {
  if (!needle)
    return true
  return [pull.owner, pull.repo, `${pull.owner}/${pull.repo}`, pull.title, pull.author, `#${pull.number}`, ...pull.labels]
    .some(text => text.toLowerCase().includes(needle))
}

export interface PullFilter {
  queue: TriageQueue
  role: MyPullRole | 'all'
  /** Lower-cased search text. */
  needle: string
}

export interface FilteredPulls {
  /** The pull requests every filter lets through. */
  pulls: MyPull[]
  /** Each queue's size under the current role and search. */
  queueCounts: Record<TriageQueue, number>
  /** Each role's size under the current queue and search; `all` included. */
  roleCounts: Record<MyPullRole | 'all', number>
}

/**
 * Applies the queue, role and search filters, counting each queue and role as if
 * only the other filters applied, so every count says what clicking it would show.
 *
 * @param pulls The full list.
 * @param filter The active filters.
 * @param now The current time in epoch milliseconds.
 * @returns The visible pull requests and the counts.
 */
export function filterPulls(pulls: MyPull[], filter: PullFilter, now: number): FilteredPulls {
  const searched = pulls.filter(pull => matchesSearch(pull, filter.needle))
  const inRole = filter.role === 'all' ? searched : searched.filter(pull => pull.role === filter.role)
  const inQueueOnly = searched.filter(pull => inQueue(pull, filter.queue, now))
  const roleCounts = Object.fromEntries([
    ['all', inQueueOnly.length],
    ...ROLE_ORDER.map(role => [role, inQueueOnly.filter(pull => pull.role === role).length]),
  ]) as Record<MyPullRole | 'all', number>
  return {
    pulls: inRole.filter(pull => inQueue(pull, filter.queue, now)),
    queueCounts: countQueues(inRole, now),
    roleCounts,
  }
}

export interface RepoGroup {
  name: string
  owner: string
  repo: string
  pulls: MyPull[]
}

/**
 * @param pulls Pull requests, newest activity first.
 * @returns Them grouped by repository, the repo with the most recent activity first; order inside a group is kept.
 */
export function groupByRepo(pulls: MyPull[]): RepoGroup[] {
  const groups = new Map<string, RepoGroup>()
  for (const pull of pulls) {
    const name = `${pull.owner}/${pull.repo}`
    let group = groups.get(name)
    if (!group)
      groups.set(name, group = { name, owner: pull.owner, repo: pull.repo, pulls: [] })
    group.pulls.push(pull)
  }
  return [...groups.values()]
}
