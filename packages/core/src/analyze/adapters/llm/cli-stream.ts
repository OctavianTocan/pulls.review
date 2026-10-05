import type { StreamFn } from '@earendil-works/pi-agent-core'
import type { AssistantMessage, JsonObject, Message, Model, Api, Tool } from '@earendil-works/pi-ai'
import type { ResolvedModel } from './model'
import { createAssistantMessageEventStream, getCurrentSystemPrompt, getCurrentTools } from '@earendil-works/pi-ai'
import { LLM_ENGINES } from '../../../local-rpc'

export type CliEngine = typeof LLM_ENGINES[number]

export interface CliRunRequest {
  engine: CliEngine
  model?: string
  system: string
  prompt: string
  /** JSON Schema the answer must match; absent asks for prose. */
  schema?: unknown
}

/** Runs one prompt through a server-side CLI; installed by the local build, which owns the RPC connection. */
export type CliRunner = (request: CliRunRequest) => Promise<string>

let runner: CliRunner | undefined

export function setCliRunner(next: CliRunner | undefined): void {
  runner = next
}

export function isCliEngine(value: string): value is CliEngine {
  return (LLM_ENGINES as readonly string[]).includes(value)
}

const CHAT_LIMITS = 'You cannot change the grouping or read more files from here: answer from the diffs already shown above.'

function textOf(content: string | readonly { type: string, text?: string }[]): string {
  if (typeof content === 'string')
    return content
  return content.map(part => part.type === 'text' ? part.text ?? '' : `[${part.type}]`).join('')
}

/** The CLIs take one prompt, not a tool-calling transcript, so the history is replayed as text. */
export function flattenTranscript(messages: readonly Message[]): string {
  const parts: string[] = []
  for (const message of messages) {
    if (message.role === 'user') {
      parts.push(`<user>\n${textOf(message.content)}\n</user>`)
    }
    else if (message.role === 'assistant') {
      const body = message.content.map((block) => {
        if (block.type === 'text')
          return block.text
        if (block.type === 'toolCall')
          return `[called ${block.name} with ${JSON.stringify(block.arguments)}]`
        return ''
      }).filter(Boolean).join('\n')
      if (body)
        parts.push(`<assistant>\n${body}\n</assistant>`)
    }
    else if (message.role === 'toolResult') {
      parts.push(`<tool_result name="${message.toolName}"${message.isError ? ' error="true"' : ''}>\n${textOf(message.content)}\n</tool_result>`)
    }
  }
  return parts.join('\n\n')
}

const ZERO_USAGE = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }

function emptyMessage(model: Model<Api>): AssistantMessage {
  return { role: 'assistant', content: [], api: model.api, provider: model.provider, model: model.id, usage: ZERO_USAGE, stopReason: 'stop', timestamp: Date.now() }
}

/**
 * A pi stream function backed by Claude Code or Codex on the server. A `submit_grouping`
 * tool in the transcript is answered with a structured run and returned as that tool call,
 * so the agent loop, its validation retries and the transcript UI work unchanged.
 */
export function createCliStreamFn(resolved: ResolvedModel, engine: CliEngine): StreamFn {
  return (model, context, options) => {
    const stream = createAssistantMessageEventStream()
    void (async () => {
      const message = emptyMessage(model)
      stream.push({ type: 'start', partial: message })
      try {
        if (!runner)
          throw new Error('Claude Code and Codex run on the pulls.review server; this build has none.')
        const tools: Tool[] = getCurrentTools(context.messages)
        const submit = tools.find(tool => tool.name === 'submit_grouping')
        const system = getCurrentSystemPrompt(context.messages)
        const history = flattenTranscript(context.messages)
        const asked = submit
          ? { system, prompt: `${history}\n\nAnswer with the arguments for submit_grouping only, as JSON.`, schema: submit.parameters as unknown }
          : { system: `${system}\n\n${CHAT_LIMITS}`, prompt: history }
        const text = await runner({ engine, model: resolved.model.id, ...asked })
        if (options?.signal?.aborted)
          throw new DOMException('Aborted', 'AbortError')

        if (submit) {
          const args = JSON.parse(text) as JsonObject
          const toolCall = { type: 'toolCall' as const, id: `cli-${Date.now()}`, name: submit.name, arguments: args }
          message.content.push(toolCall)
          message.stopReason = 'toolUse'
          stream.push({ type: 'toolcall_start', contentIndex: 0, partial: message })
          stream.push({ type: 'toolcall_end', contentIndex: 0, toolCall, partial: message })
          stream.push({ type: 'done', reason: 'toolUse', message })
        }
        else {
          message.content.push({ type: 'text', text })
          stream.push({ type: 'text_start', contentIndex: 0, partial: message })
          stream.push({ type: 'text_delta', contentIndex: 0, delta: text, partial: message })
          stream.push({ type: 'text_end', contentIndex: 0, content: text, partial: message })
          stream.push({ type: 'done', reason: 'stop', message })
        }
      }
      catch (error) {
        const aborted = options?.signal?.aborted
        message.stopReason = aborted ? 'aborted' : 'error'
        message.errorMessage = error instanceof Error ? error.message : String(error)
        stream.push({ type: 'error', reason: aborted ? 'aborted' : 'error', error: message })
      }
    })()
    return stream
  }
}
