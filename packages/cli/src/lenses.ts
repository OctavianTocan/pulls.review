import type { ReviewLens } from '@pulls.review/core/local-rpc'
import { readdir, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { REVIEW_LENS_NAME } from '@pulls.review/core/local-rpc'

const DEFAULT_GATEWAY_URL = 'http://127.0.0.1:45819/mcp'
const GATEWAY_TIMEOUT_MS = 4_000
const MAX_PROMPT_PAGES = 10
const MAX_INSTRUCTIONS = 30_000

export interface LensSourceOptions {
  /** The agt gateway's MCP endpoint; skills are its prompts. */
  gatewayUrl?: string
  /** A folder of skill folders, each holding a `SKILL.md`, read when the gateway is unreachable. */
  skillsDir?: string
}

interface GatewayPrompt {
  name?: unknown
  description?: unknown
}

function gatewayUrlOf(options: LensSourceOptions): string {
  return options.gatewayUrl ?? process.env.PULLS_REVIEW_AGT_URL ?? DEFAULT_GATEWAY_URL
}

function skillsDirOf(options: LensSourceOptions): string {
  return options.skillsDir ?? join(homedir(), '.claude', 'skills')
}

async function gatewayCall(url: string, method: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'accept': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
  })
  if (!response.ok)
    throw new Error(`agt gateway answered ${response.status}`)
  const body = await response.json() as { result?: Record<string, unknown>, error?: { code?: number, message?: string } }
  if (body.error)
    throw new Error(body.error.message ?? 'agt gateway error')
  return body.result ?? {}
}

/**
 * Splits a SKILL.md into its frontmatter fields and its body.
 * @param text - The file's content.
 * @returns The top-level frontmatter fields as plain strings, and the trimmed body.
 */
export function parseSkill(text: string): { fields: Record<string, string>, body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text)
  if (!match)
    return { fields: {}, body: text.trim() }
  const fields: Record<string, string> = {}
  const lines = match[1]!.split(/\r?\n/)
  for (let index = 0; index < lines.length; index++) {
    const field = /^([\w-]+):(.*)$/.exec(lines[index]!)
    if (!field)
      continue
    let value = field[2]!.trim()
    if (/^[|>][+-]?$/.test(value) || value === '') {
      const continued: string[] = []
      while (index + 1 < lines.length && /^\s+\S/.test(lines[index + 1]!))
        continued.push(lines[++index]!.trim())
      value = continued.join(' ')
    }
    fields[field[1]!] = value.replace(/^(["'])([\s\S]*)\1$/, '$2')
  }
  return { fields, body: text.slice(match[0].length).trim() }
}

function lensOf(prompt: GatewayPrompt): ReviewLens | undefined {
  if (typeof prompt.name !== 'string' || !REVIEW_LENS_NAME.test(prompt.name))
    return undefined
  return { name: prompt.name, description: typeof prompt.description === 'string' ? prompt.description : undefined }
}

async function gatewayLenses(url: string): Promise<ReviewLens[]> {
  const lenses: ReviewLens[] = []
  let cursor: string | undefined
  for (let page = 0; page < MAX_PROMPT_PAGES; page++) {
    const result = await gatewayCall(url, 'prompts/list', cursor ? { cursor } : {})
    lenses.push(...((result.prompts ?? []) as GatewayPrompt[]).map(lensOf).filter(lens => lens !== undefined))
    cursor = typeof result.nextCursor === 'string' ? result.nextCursor : undefined
    if (!cursor)
      break
  }
  return lenses
}

async function localLenses(dir: string): Promise<ReviewLens[]> {
  const entries = await readdir(dir).catch(() => [] as string[])
  const lenses = await Promise.all(entries.filter(entry => REVIEW_LENS_NAME.test(entry)).map(async (entry) => {
    const text = await readFile(join(dir, entry, 'SKILL.md'), 'utf8').catch(() => undefined)
    if (text === undefined)
      return undefined
    return { name: entry, description: parseSkill(text).fields.description || undefined }
  }))
  return lenses.filter(lens => lens !== undefined)
}

/**
 * The skills a review can be run through: the agt gateway's prompts, else the local Claude skills folder.
 * @param options - Where to look; defaults to the local gateway and `~/.claude/skills`.
 * @returns The lenses sorted by name; empty when neither source has any.
 */
export async function listLenses(options: LensSourceOptions = {}): Promise<ReviewLens[]> {
  const lenses = await gatewayLenses(gatewayUrlOf(options)).catch(() => localLenses(skillsDirOf(options)))
  return lenses.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * One skill's instructions, without its frontmatter.
 * @param name - The skill's name, as `listLenses` returned it.
 * @param options - Where to look; defaults to the local gateway and `~/.claude/skills`.
 * @returns The instructions, or `undefined` when no skill has that name.
 */
export async function getLens(name: string, options: LensSourceOptions = {}): Promise<string | undefined> {
  if (!REVIEW_LENS_NAME.test(name))
    return undefined
  let text: string | undefined
  try {
    const result = await gatewayCall(gatewayUrlOf(options), 'prompts/get', { name })
    const messages = (result.messages ?? []) as { content?: { type?: string, text?: unknown } }[]
    text = messages.map(message => typeof message.content?.text === 'string' ? message.content.text : '').join('\n\n')
  }
  catch {
    text = await readFile(join(skillsDirOf(options), name, 'SKILL.md'), 'utf8').catch(() => undefined)
  }
  if (text === undefined)
    return undefined
  const body = parseSkill(text).body
  if (!body)
    return undefined
  return body.length > MAX_INSTRUCTIONS ? `${body.slice(0, MAX_INSTRUCTIONS)}\n[truncated]` : body
}
