import type { PrPayload } from './pr-tools'
import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { createInterface } from 'node:readline'
import { callPrTool, prTools } from './pr-tools'

const PROTOCOL_VERSION = '2025-06-18'

interface Request {
  jsonrpc: '2.0'
  id?: number | string
  method: string
  params?: Record<string, unknown>
}

const payloadPath = process.argv[2]
if (!payloadPath) {
  process.stderr.write('pr-server needs the path of a payload file.\n')
  process.exit(2)
}

const payload = JSON.parse(await readFile(payloadPath, 'utf8')) as PrPayload

function send(message: unknown): void {
  process.stdout.write(`${JSON.stringify(message)}\n`)
}

async function handle(request: Request): Promise<void> {
  const { id, method, params } = request
  const reply = (result: unknown) => id !== undefined && send({ jsonrpc: '2.0', id, result })
  switch (method) {
    case 'initialize':
      return void reply({
        protocolVersion: typeof params?.protocolVersion === 'string' ? params.protocolVersion : PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: 'pr', version: '1.0.0' },
      })
    case 'ping':
      return void reply({})
    case 'tools/list':
      return void reply({ tools: prTools(payload) })
    case 'tools/call':
      try {
        const text = await callPrTool(payload, String(params?.name ?? ''), (params?.arguments ?? {}) as Record<string, unknown>)
        return void reply({ content: [{ type: 'text', text }] })
      }
      catch (error) {
        return void reply({ content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }], isError: true })
      }
    default:
      // Notifications carry no id and expect no answer.
      if (id !== undefined)
        send({ jsonrpc: '2.0', id, error: { code: -32601, message: `unsupported method ${method}` } })
  }
}

createInterface({ input: process.stdin })
  .on('line', (line) => {
    if (!line.trim())
      return
    try {
      void handle(JSON.parse(line) as Request)
    }
    catch {}
  })
  .on('close', () => process.exit(0))
