import type { Message } from '@earendil-works/pi-ai'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCliStreamFn, flattenTranscript, setCliRunner } from './cli-stream'
import { resolveModel } from './model'
import { defaultLlmSettings } from './settings'

const resolved = resolveModel({ ...defaultLlmSettings, provider: 'claude-code' })!
const user = (text: string): Message => ({ role: 'user', content: text, timestamp: 0 })

function contextFor(messages: Message[], withSubmit: boolean) {
  const tools = withSubmit ? [{ name: 'submit_grouping', description: 'submit', parameters: { type: 'object' } }] : []
  return { messages: [{ role: 'system', content: 'be brief', toolsAdded: tools, timestamp: 0 }, ...messages] } as never
}

afterEach(() => setCliRunner(undefined))

describe('cli provider', () => {
  it('needs no key to resolve', () => {
    expect(resolved.apiKey).toBe('')
    expect(resolved.model.provider).toBe('claude-code')
  })

  it('replays tool history as text', () => {
    const text = flattenTranscript([user('hi'), { role: 'toolResult', toolCallId: '1', toolName: 'submit_grouping', content: [{ type: 'text', text: 'bad' }], isError: true, timestamp: 0 }])
    expect(text).toContain('<user>\nhi\n</user>')
    expect(text).toContain('<tool_result name="submit_grouping" error="true">\nbad')
  })

  it('answers a submit_grouping transcript with that tool call', async () => {
    const runner = vi.fn(async () => ({ text: '{"overallSummary":"s","groups":[]}', usage: { inputTokens: 10, outputTokens: 5, costUsd: 0.02 } }))
    setCliRunner(runner)
    const stream = await createCliStreamFn(resolved, 'claude-code')(resolved.model, contextFor([user('diff')], true))
    const message = await stream.result()
    expect(message.stopReason).toBe('toolUse')
    expect(message.content[0]).toMatchObject({ type: 'toolCall', name: 'submit_grouping', arguments: { overallSummary: 's' } })
    expect(runner).toHaveBeenCalledWith(expect.objectContaining({ engine: 'claude-code', schema: { type: 'object' } }), expect.anything())
    expect(message.usage).toMatchObject({ input: 10, output: 5, totalTokens: 15, cost: { total: 0.02 } })
  })

  it('answers chat with prose', async () => {
    setCliRunner(async () => ({ text: 'because' }))
    const stream = await createCliStreamFn(resolved, 'claude-code')(resolved.model, contextFor([user('why?')], false))
    const message = await stream.result()
    expect(message.stopReason).toBe('stop')
    expect(message.content).toEqual([{ type: 'text', text: 'because' }])
  })

  it('reports a missing runner as an error reply', async () => {
    const stream = await createCliStreamFn(resolved, 'codex')(resolved.model, contextFor([user('x')], false))
    const message = await stream.result()
    expect(message.stopReason).toBe('error')
    expect(message.errorMessage).toContain('server')
  })
})
