import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { LLM_ENGINES } from '@pulls.review/core/local-rpc'

export interface LlmRunRequest {
  engine: typeof LLM_ENGINES[number]
  model?: string
  effort?: string
  system: string
  prompt: string
  /** JSON Schema the answer must match; absent asks for prose. */
  schema?: unknown
}

const CLAUDE_TIMEOUT_MS = 300_000
const CODEX_TIMEOUT_MS = 600_000

interface Captured {
  stdout: string
  stderr: string
  exitCode: number | null
  timedOut: boolean
}

function capture(bin: string, args: string[], stdin: string, timeoutMs: number, cwd?: string): Promise<Captured> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { cwd, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, timeoutMs)
    child.stdout.on('data', chunk => stdout += chunk)
    child.stderr.on('data', chunk => stderr += chunk)
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error.message.includes('ENOENT') ? new Error(`\`${bin}\` was not found on PATH.`) : error)
    })
    child.on('close', (exitCode) => {
      clearTimeout(timer)
      resolve({ stdout, stderr, exitCode, timedOut })
    })
    child.stdin.on('error', () => {})
    child.stdin.end(stdin)
  })
}

function lastLine(text: string): string {
  return text.trim().split('\n').filter(line => line.trim()).at(-1)?.trim() ?? ''
}

type Schema = Record<string, unknown>

/** OpenAI's structured outputs accept only closed objects whose properties are all required, so optional ones become nullable. */
export function strictSchema(node: unknown): unknown {
  if (Array.isArray(node))
    return node.map(strictSchema)
  if (!node || typeof node !== 'object')
    return node
  const schema = Object.fromEntries(Object.entries(node as Schema).map(([key, value]) => [key, strictSchema(value)])) as Schema
  const properties = schema.properties as Record<string, Schema> | undefined
  if (schema.type !== 'object' || !properties)
    return schema
  const required = new Set(schema.required as string[] | undefined)
  const strict = Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, required.has(key) ? value : { anyOf: [value, { type: 'null' }] }]))
  return { ...schema, properties: strict, required: Object.keys(strict), additionalProperties: false }
}

/** Undoes the nullable optionals `strictSchema` introduced. */
export function dropNulls(value: unknown): unknown {
  if (Array.isArray(value))
    return value.map(dropNulls)
  if (!value || typeof value !== 'object')
    return value
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== null).map(([key, item]) => [key, dropNulls(item)]))
}

function failure(bin: string, result: Captured, timeoutMs: number, loginHint: string): Error {
  if (result.timedOut)
    return new Error(`${bin} did not answer within ${timeoutMs / 1000}s.`)
  const apiMessage = /"message":\s*"((?:[^"\\]|\\.)*)"/.exec(result.stderr)?.[1]
  const detail = apiMessage ?? (lastLine(result.stderr) || lastLine(result.stdout) || `${bin} exited ${result.exitCode}`)
  return new Error(/not logged in|not authenticated|unauthorized|401|invalid api key|please run.*login/i.test(detail) ? `${detail} ${loginHint}` : detail)
}

async function runClaude(request: LlmRunRequest): Promise<string> {
  const args = [
    '-p',
    '--output-format',
    'json',
    '--system-prompt',
    request.system,
    '--tools',
    '',
    '--setting-sources',
    '',
    '--strict-mcp-config',
    '--disable-slash-commands',
    '--no-session-persistence',
  ]
  if (request.model)
    args.push('--model', request.model)
  if (request.effort)
    args.push('--effort', request.effort)
  if (request.schema !== undefined)
    args.push('--json-schema', JSON.stringify(request.schema))

  const result = await capture('claude', args, request.prompt, CLAUDE_TIMEOUT_MS)
  if (result.timedOut || result.exitCode !== 0)
    throw failure('claude', result, CLAUDE_TIMEOUT_MS, 'Run `claude` once on the server to sign in.')

  let payload: { is_error?: boolean, result?: string, structured_output?: unknown }
  try {
    payload = JSON.parse(result.stdout)
  }
  catch {
    throw new Error('claude returned output that was not JSON.')
  }
  if (payload.is_error)
    throw new Error(payload.result ?? 'claude failed.')
  if (request.schema !== undefined && payload.structured_output !== undefined)
    return JSON.stringify(payload.structured_output)
  return payload.result?.trim() ?? ''
}

async function runCodex(request: LlmRunRequest): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'pulls-review-codex-'))
  try {
    const answerPath = join(dir, 'answer.txt')
    const args = [
      'exec',
      '--ephemeral',
      '--ignore-user-config',
      '--ignore-rules',
      '--skip-git-repo-check',
      '--sandbox',
      'read-only',
      '--color',
      'never',
      '--output-last-message',
      answerPath,
    ]
    if (request.model)
      args.push('--model', request.model)
    if (request.effort)
      args.push('-c', `model_reasoning_effort="${request.effort}"`)
    if (request.schema !== undefined) {
      const schemaPath = join(dir, 'schema.json')
      await writeFile(schemaPath, JSON.stringify(strictSchema(request.schema)))
      args.push('--output-schema', schemaPath)
    }
    args.push('-')

    const result = await capture('codex', args, `${request.system}\n\n${request.prompt}`, CODEX_TIMEOUT_MS, dir)
    if (result.timedOut || result.exitCode !== 0)
      throw failure('codex', result, CODEX_TIMEOUT_MS, 'Run `codex login` on the server to sign in.')
    const answer = (await readFile(answerPath, 'utf8').catch(() => '')).trim()
    return request.schema !== undefined && answer ? JSON.stringify(dropNulls(JSON.parse(answer))) : answer
  }
  finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

/**
 * Runs one prompt through the server's Claude Code or Codex CLI, reusing the account
 * either is already signed in with.
 *
 * @param request Engine, prompts and, for structured answers, the JSON Schema.
 * @returns The answer text; JSON text when `request.schema` was given.
 * @throws When the CLI is missing, signed out, times out or answers with nothing.
 */
export async function runLlm(request: LlmRunRequest): Promise<string> {
  const text = request.engine === 'codex' ? await runCodex(request) : await runClaude(request)
  if (!text)
    throw new Error(`${request.engine} returned an empty answer.`)
  return text
}
