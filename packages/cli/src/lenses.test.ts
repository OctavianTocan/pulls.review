import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getLens, listLenses, parseSkill } from './lenses'

let skillsDir: string
const gatewayUrl = 'http://gateway.test/mcp'

function skill(name: string, text: string) {
  mkdirSync(join(skillsDir, name), { recursive: true })
  writeFileSync(join(skillsDir, name, 'SKILL.md'), text)
}

function rpcResponse(body: unknown) {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, ...body as object }), { status: 200 })
}

beforeEach(() => {
  skillsDir = mkdtempSync(join(tmpdir(), 'pulls-review-skills-'))
})

afterEach(() => {
  vi.unstubAllGlobals()
  rmSync(skillsDir, { recursive: true, force: true })
})

describe('parseSkill', () => {
  it('reads plain, quoted and folded fields and strips the frontmatter', () => {
    const { fields, body } = parseSkill('---\nname: sec\ndescription: >\n  Looks for\n  injection.\ntitle: "Security"\n---\n\n# Body\n')
    expect(fields).toEqual({ name: 'sec', description: 'Looks for injection.', title: 'Security' })
    expect(body).toBe('# Body')
    expect(parseSkill('No frontmatter.').body).toBe('No frontmatter.')
  })
})

describe('lenses from the gateway', () => {
  it('lists prompts across pages, sorted, and drops names that could not name a folder', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(rpcResponse({ result: { prompts: [{ name: 'security', description: 'Sec' }, { name: '../etc' }], nextCursor: 'c1' } }))
      .mockResolvedValueOnce(rpcResponse({ result: { prompts: [{ name: 'perf' }] } }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await listLenses({ gatewayUrl, skillsDir })).toEqual([{ name: 'perf', description: undefined }, { name: 'security', description: 'Sec' }])
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toMatchObject({ method: 'prompts/list', params: { cursor: 'c1' } })
  })

  it('returns a prompt\'s text without its frontmatter', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(rpcResponse({ result: { messages: [{ role: 'user', content: { type: 'text', text: '---\nname: security\n---\n\nCheck auth.' } }] } })))
    expect(await getLens('security', { gatewayUrl, skillsDir })).toBe('Check auth.')
  })
})

describe('lenses from the skills folder', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    skill('security', '---\nname: security\ndescription: Finds holes.\n---\nCheck auth.')
    skill('empty', 'no frontmatter')
    mkdirSync(join(skillsDir, 'not-a-skill'))
  })

  it('lists skill folders that hold a SKILL.md', async () => {
    expect(await listLenses({ gatewayUrl, skillsDir })).toEqual([{ name: 'empty', description: undefined }, { name: 'security', description: 'Finds holes.' }])
  })

  it('reads one skill by name and refuses names outside the folder', async () => {
    expect(await getLens('security', { gatewayUrl, skillsDir })).toBe('Check auth.')
    expect(await getLens('missing', { gatewayUrl, skillsDir })).toBeUndefined()
    expect(await getLens('../security', { gatewayUrl, skillsDir })).toBeUndefined()
  })

  it('falls back when the gateway does not know the name', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(rpcResponse({ error: { code: -32602, message: 'no skill called security' } })))
    expect(await getLens('security', { gatewayUrl, skillsDir })).toBe('Check auth.')
  })
})
