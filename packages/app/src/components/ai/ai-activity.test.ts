import type { AgentMessage } from '@earendil-works/pi-agent-core'
import type { AiActivity } from '@pulls.review/core/local-rpc'
import type { TrackedActivity } from './ai-activity'
import { fauxAssistantMessage, fauxText, fauxThinking, fauxToolCall } from '@earendil-works/pi-ai'
import { describe, expect, it } from 'vitest'
import { activitiesFromTranscript, activityTiming, summarizeTools, toolCategory, upsertActivities, usageFromTranscript } from './ai-activity'

function activity(patch: Partial<AiActivity> & { id: string }): AiActivity {
  return { kind: 'tool', title: patch.id, status: 'running', startedAt: 0, rev: 1, ...patch }
}

const translate = (key: string, named?: Record<string, unknown>) => named ? `${key}(${JSON.stringify(named)})` : key

describe('upsertActivities', () => {
  it('appends new entries in arrival order and replaces newer revisions in place', () => {
    const first = upsertActivities([], [activity({ id: 'a' }), activity({ id: 'b' })], 10)
    const next = upsertActivities(first, [activity({ id: 'a', rev: 3, status: 'done', title: 'Read a.ts' }), activity({ id: 'c', rev: 4 })], 20)
    expect(next.map(entry => [entry.id, entry.title, entry.seenAt])).toEqual([['a', 'Read a.ts', 20], ['b', 'b', 10], ['c', 'c', 20]])
  })

  it('ignores replays of revisions it already has', () => {
    const log = upsertActivities([], [activity({ id: 'a', rev: 5, title: 'new' })], 10)
    expect(upsertActivities(log, [activity({ id: 'a', rev: 2, title: 'old' })], 20)[0]).toMatchObject({ title: 'new', seenAt: 10 })
  })
})

describe('activityTiming', () => {
  const running: TrackedActivity = { ...activity({ id: 'a', startedAt: 0 }), seenAt: 34_000 }

  it('reports when the step last changed and how long it has run', () => {
    expect(activityTiming(running, 38_000)).toEqual({ state: 'active', since: '4s', elapsed: '38s' })
  })

  it('reads as active now within a second of a change', () => {
    expect(activityTiming(running, 34_500)?.state).toBe('now')
  })

  it('reads as idle after 30s of silence', () => {
    expect(activityTiming(running, 79_000)).toEqual({ state: 'idle', since: '45s', elapsed: '1m 19s' })
  })

  it('has nothing to say about settled steps', () => {
    expect(activityTiming({ ...running, status: 'done' }, 79_000)).toBeUndefined()
  })
})

describe('summarizeTools', () => {
  it('counts tool steps by kind in a fixed order and skips other kinds', () => {
    const log = [
      activity({ id: '1', tool: 'read_source' }),
      activity({ id: '2', tool: 'Bash' }),
      activity({ id: '3', tool: 'read_file_diff' }),
      activity({ id: '4', tool: 'search_diff' }),
      activity({ id: '5', tool: 'read_discussion' }),
      activity({ id: '6', kind: 'thinking' }),
    ]
    expect(summarizeTools(log)).toEqual([
      { category: 'command', count: 1 },
      { category: 'read', count: 2 },
      { category: 'search', count: 1 },
      { category: 'other', count: 1 },
    ])
  })

  it('treats unknown and missing tool names as other tools', () => {
    expect(toolCategory(undefined)).toBe('other')
    expect(toolCategory('StructuredOutput')).toBe('other')
  })
})

describe('activitiesFromTranscript', () => {
  const thinking = fauxAssistantMessage([fauxThinking('Look at the parser'), fauxToolCall('read_diffs', { paths: ['a.ts', 'b.ts'] }, { id: 'call-1' })], { stopReason: 'toolUse' })

  it('turns thoughts and tool calls into steps', () => {
    const log = activitiesFromTranscript([thinking], true, translate, 5)
    expect(log.map(entry => [entry.kind, entry.status, entry.title])).toEqual([
      ['thinking', 'done', 'ai.verb.thinking.past'],
      ['tool', 'running', 'ai.verb.readFiles.now({"n":2})'],
    ])
    expect(log[0]).toMatchObject({ text: 'Look at the parser', seenAt: 5 })
  })

  it('settles a tool call once its result arrives and carries a failure message', () => {
    const result: AgentMessage = { role: 'toolResult', toolCallId: 'call-1', toolName: 'read_diffs', content: [{ type: 'text', text: 'Unknown paths: b.ts' }], isError: true, timestamp: 9 }
    const tool = activitiesFromTranscript([thinking, result], true, translate)[1]
    expect(tool).toMatchObject({ status: 'failed', text: 'Unknown paths: b.ts', endedAt: 9, title: 'ai.verb.readFiles.past({"n":2})' })
  })

  it('marks the streaming tail of the last reply as running only while live', () => {
    const streaming = fauxAssistantMessage([fauxText('Grouping by feature')], { stopReason: 'pending' })
    expect(activitiesFromTranscript([streaming], true, translate)[0]).toMatchObject({ kind: 'text', status: 'running', title: 'ai.verb.writing.now' })
    expect(activitiesFromTranscript([streaming], false, translate)[0]?.status).toBe('done')
  })
})

describe('usageFromTranscript', () => {
  it('totals token counts and cost across replies and leaves zeros out', () => {
    const one = fauxAssistantMessage([fauxText('a')])
    one.usage = { input: 100, output: 20, cacheRead: 0, cacheWrite: 0, totalTokens: 120, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0.01 } }
    const two = fauxAssistantMessage([fauxText('b')])
    two.usage = { input: 50, output: 5, cacheRead: 1000, cacheWrite: 0, reasoning: 3, totalTokens: 1055, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0.002 } }
    two.model = 'claude-sonnet-5'
    expect(usageFromTranscript([one, two])).toEqual({
      inputTokens: 150,
      outputTokens: 25,
      cacheReadTokens: 1000,
      cacheWriteTokens: undefined,
      reasoningTokens: 3,
      costUsd: 0.012,
      model: 'claude-sonnet-5',
    })
  })

  it('has nothing to report before any reply', () => {
    expect(usageFromTranscript([{ role: 'user', content: 'hi', timestamp: 0 }])).toBeUndefined()
  })
})
