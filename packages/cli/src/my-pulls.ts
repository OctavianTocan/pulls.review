import type { MyPull, MyPullRole, MyPullState } from '@pulls.review/core/local-rpc'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const FIELDS = 'number,title,repository,author,updatedAt,isDraft,commentsCount,labels'
const LIMIT = '100'

interface SearchHit {
  number: number
  title: string
  repository: { nameWithOwner: string }
  author: { login: string } | null
  updatedAt: string
  isDraft: boolean
  commentsCount: number
  labels: { name: string }[]
}

const run = promisify(execFile)

async function gh(args: string[]): Promise<string> {
  return (await run('gh', args, { maxBuffer: 16 * 1024 * 1024 })).stdout
}

async function search(role: MyPullRole, state: MyPullState, filters: string[]): Promise<MyPull[]> {
  const stdout = await gh(['search', 'prs', ...filters, '--state', state, '--limit', LIMIT, '--json', FIELDS])
  return (JSON.parse(stdout) as SearchHit[]).map((hit) => {
    const [owner, repo] = hit.repository.nameWithOwner.split('/')
    return {
      owner,
      repo,
      number: hit.number,
      title: hit.title,
      author: hit.author?.login ?? 'ghost',
      isDraft: hit.isDraft,
      updatedAt: hit.updatedAt,
      commentsCount: hit.commentsCount,
      labels: hit.labels.map(label => label.name),
      state,
      role,
    }
  })
}

/** The signed-in user and every org they belong to, whose repos count as "theirs". */
async function ownerLogins(): Promise<string[]> {
  const [login, orgs] = await Promise.all([gh(['api', 'user', '--jq', '.login']), gh(['api', 'user/orgs', '--jq', '.[].login'])])
  return [login.trim(), ...orgs.split('\n').map(org => org.trim())].filter(Boolean)
}

/**
 * Pull requests across every repository the signed-in `gh` user touches: review requests,
 * their own, ones they take part in, and anything opened in repos they or their orgs own.
 *
 * @param state Whether to list open or closed (including merged) pull requests.
 * @returns Deduplicated matches, each tagged with its most specific role, newest activity first.
 * @throws When `gh` is missing or not signed in.
 */
export async function listMyPulls(state: MyPullState): Promise<MyPull[]> {
  const owners = (await ownerLogins()).flatMap(login => ['--owner', login])
  const batches = await Promise.all([
    search('review-requested', state, ['--review-requested', '@me']),
    search('authored', state, ['--author', '@me']),
    search('involved', state, ['--involves', '@me']),
    search('owned', state, owners),
  ])
  const seen = new Map<string, MyPull>()
  for (const pull of batches.flat()) {
    const key = `${pull.owner}/${pull.repo}#${pull.number}`
    if (!seen.has(key))
      seen.set(key, pull)
  }
  return [...seen.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}
