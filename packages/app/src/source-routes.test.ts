import type { RoutableRef } from './source-routes'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { parentForRef, refFromRoute, routeForRef, routeFromGithubUrl, routes } from './source-routes'

const router = createRouter({ history: createMemoryHistory(), routes: routes(async () => ({})) })

describe('source routes', () => {
  it.each<RoutableRef>([
    { kind: 'github-pr', owner: 'antfu', repo: 'diffs', number: '12' },
    { kind: 'github-compare', owner: 'antfu', repo: 'diffs', base: 'main', head: 'feat/nested-branch' },
    { kind: 'github-compare', owner: 'antfu', repo: 'diffs', base: 'v1.0.0', head: 'a1b2c3d' },
    { kind: 'github-commit', owner: 'antfu', repo: 'diffs', sha: 'a1b2c3d4' },
  ])('round-trips a $kind ref through its route', (ref) => {
    expect(refFromRoute(router.resolve(routeForRef(ref)))).toEqual(ref)
    expect(parentForRef(ref)).toEqual({ route: '/antfu/diffs', label: 'antfu/diffs' })
  })

  it('does not take a non-numeric segment for a pull request', () => {
    expect(router.resolve('/antfu/diffs/main').name).toBeUndefined()
  })

  it.each([
    ['/antfu/diffs/pull/12/files', '/antfu/diffs/12'],
    ['/gh/antfu/diffs/12', '/antfu/diffs/12'],
    ['/gh/antfu/diffs/compare/main...feat/x', '/antfu/diffs/compare/main...feat/x'],
    ['/antfu/diffs/commits/a1b2c3d', '/antfu/diffs/commit/a1b2c3d'],
  ])('redirects %s to %s', async (from, to) => {
    const navigating = createRouter({ history: createMemoryHistory(), routes: routes(async () => ({})) })
    await navigating.push(from)
    expect(navigating.currentRoute.value.fullPath).toBe(to)
  })

  it('gives a paste no route and no parent', () => {
    expect(routeForRef({ kind: 'paste', hash: 'abc' })).toBeUndefined()
    expect(parentForRef({ kind: 'paste', hash: 'abc' })).toBeUndefined()
  })

  it('reads PR, compare, commit, repo and PR-list URLs from github.com', () => {
    expect(routeFromGithubUrl('https://github.com/antfu/diffs/pull/12/files')).toBe('/antfu/diffs/12')
    expect(routeFromGithubUrl('https://github.com/antfu/diffs/compare/main...feat/x')).toBe('/antfu/diffs/compare/main...feat/x')
    expect(routeFromGithubUrl('https://github.com/antfu/diffs/commit/a1b2c3d?diff=split')).toBe('/antfu/diffs/commit/a1b2c3d')
    expect(routeFromGithubUrl('github.com/antfu/diffs')).toBe('/antfu/diffs')
    expect(routeFromGithubUrl('https://github.com/antfu/diffs/pulls')).toBe('/antfu/diffs')
    expect(routeFromGithubUrl('https://github.com/antfu/diffs/compare/main')).toBeUndefined()
    expect(routeFromGithubUrl('https://example.com/antfu/diffs')).toBeUndefined()
  })
})
