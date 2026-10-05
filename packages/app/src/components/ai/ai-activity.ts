import type { AgentMessage } from '@earendil-works/pi-agent-core'
import type { AiActivity, AiUsage } from '@pulls.review/core/local-rpc'
import type { Translate } from './ai-format'
import { formatClockDuration, verbKey } from './ai-format'

/** A work-log entry plus when this page last saw it change. */
export interface TrackedActivity extends AiActivity {
  /** Client clock, ms since the epoch. */
  seenAt: number
}

/** How long a running step may stay silent before the log calls it idle. */
export const IDLE_AFTER_MS = 30_000

/**
 * Merges a batch of work-log entries into the log.
 * @param log - The entries so far, in the order they first appeared.
 * @param incoming - New or changed entries; an entry replaces the one with its `id` only when its `rev` is newer.
 * @param now - When the batch arrived.
 * @returns A new log; unknown entries are appended.
 */
export function upsertActivities(log: readonly TrackedActivity[], incoming: readonly AiActivity[], now = Date.now()): TrackedActivity[] {
  const next = [...log]
  const indexById = new Map(next.map((activity, index) => [activity.id, index]))
  for (const activity of incoming) {
    const index = indexById.get(activity.id)
    if (index === undefined) {
      indexById.set(activity.id, next.length)
      next.push({ ...activity, seenAt: now })
    }
    else if (activity.rev > next[index]!.rev) {
      next[index] = { ...activity, seenAt: now }
    }
  }
  return next
}

export interface ActivityTiming {
  /** `idle`: silent for `IDLE_AFTER_MS` or more; `now`: changed within the last second. */
  state: 'idle' | 'now' | 'active'
  /** Time since the step last changed. */
  since: string
  /** Time since the step started. */
  elapsed: string
}

/**
 * How lively a running step is, for its "Active 4s ago · 38s elapsed" line.
 * @param activity - The step.
 * @param now - The current time, ms since the epoch.
 * @returns Nothing once the step has settled.
 */
export function activityTiming(activity: TrackedActivity, now: number): ActivityTiming | undefined {
  if (activity.status !== 'running')
    return undefined
  const idle = Math.max(0, now - activity.seenAt)
  return {
    state: idle >= IDLE_AFTER_MS ? 'idle' : idle < 1000 ? 'now' : 'active',
    since: formatClockDuration(idle),
    elapsed: formatClockDuration(now - activity.startedAt),
  }
}

export const TOOL_CATEGORIES = ['command', 'edit', 'read', 'search', 'other'] as const
export type ToolCategory = typeof TOOL_CATEGORIES[number]

// Codex reports the program a shell step ran (`cat`, `rg`, `git`) as its tool name.
const CATEGORY_BY_TOOL: Record<string, ToolCategory> = {
  read_source: 'read',
  read_file_diff: 'read',
  read_hunks: 'read',
  read_diffs: 'read',
  read: 'read',
  cat: 'read',
  sed: 'read',
  head: 'read',
  tail: 'read',
  nl: 'read',
  search_diff: 'search',
  search_source: 'search',
  web_search: 'search',
  find_files: 'search',
  search: 'search',
  grep: 'search',
  rg: 'search',
  find: 'search',
  glob: 'search',
  ls: 'search',
  list: 'search',
  list_files: 'search',
  bash: 'command',
  shell: 'command',
  run: 'command',
  exec: 'command',
  command: 'command',
  git: 'command',
  gh: 'command',
  pnpm: 'command',
  npm: 'command',
  npx: 'command',
  node: 'command',
  python: 'command',
  python3: 'command',
  make: 'command',
  jq: 'command',
  wc: 'command',
  edit: 'edit',
  write: 'edit',
  apply_patch: 'edit',
}

/**
 * What kind of work a tool does, for the "Ran 3 commands, Read 4 files" summary.
 * @param tool - The raw tool name as the engine reported it.
 * @returns `other` for tools that don't read, search, edit or run anything.
 */
export function toolCategory(tool: string | undefined): ToolCategory {
  return (tool && CATEGORY_BY_TOOL[tool.toLowerCase()]) || 'other'
}

/**
 * Counts a log's tool steps by kind.
 * @param activities - The log.
 * @returns One entry per kind that occurred, in `TOOL_CATEGORIES` order.
 */
export function summarizeTools(activities: readonly AiActivity[]): { category: ToolCategory, count: number }[] {
  const counts = new Map<ToolCategory, number>()
  for (const activity of activities) {
    if (activity.kind === 'tool') {
      const category = toolCategory(activity.tool)
      counts.set(category, (counts.get(category) ?? 0) + 1)
    }
  }
  return TOOL_CATEGORIES.filter(category => counts.has(category)).map(category => ({ category, count: counts.get(category)! }))
}

function textOf(content: readonly { type: string, text?: string }[]): string {
  return content.map(part => part.text ?? '').join('\n').trim()
}

function toolTitle(name: string, args: Record<string, unknown>, status: AiActivity['status'], translate: Translate): string {
  if (name === 'read_diffs') {
    const n = Array.isArray(args.paths) ? args.paths.length : 0
    return translate(verbKey('readFiles', status), { n }, n)
  }
  if (name === 'submit_grouping' || name === 'update_grouping')
    return translate(verbKey('organizing', status))
  return name
}

type AssistantPart = Extract<AgentMessage, { role: 'assistant' }>['content'][number]
type ToolResults = Map<string, { isError: boolean, text: string, timestamp: number }>

/** One assistant message part as a log entry; nothing for empty prose or thoughts. */
function partActivity(part: AssistantPart, base: Pick<TrackedActivity, 'id' | 'startedAt' | 'rev' | 'seenAt'>, streaming: boolean, live: boolean, results: ToolResults, translate: Translate): TrackedActivity | undefined {
  const status = streaming ? 'running' : 'done'
  if (part.type === 'thinking')
    return part.thinking.trim() ? { ...base, kind: 'thinking', title: translate(verbKey('thinking', status)), text: part.thinking, status } : undefined
  if (part.type === 'text')
    return part.text.trim() ? { ...base, kind: 'text', title: translate(verbKey('writing', status)), text: part.text, status } : undefined
  if (part.type !== 'toolCall')
    return undefined
  const result = results.get(part.id)
  const toolStatus = result ? (result.isError ? 'failed' : 'done') : live ? 'running' : 'done'
  return {
    ...base,
    kind: 'tool',
    tool: part.name,
    title: toolTitle(part.name, part.arguments, toolStatus, translate),
    text: result?.isError ? result.text : undefined,
    status: toolStatus,
    endedAt: result?.timestamp,
  }
}

/**
 * A work log read off an agent transcript, for engines that don't report one themselves.
 * @param messages - The transcript, oldest first.
 * @param live - Whether the run is still going; only then can steps be `running`.
 * @param translate - Words the step titles.
 * @param seenAt - Stamped on every entry as the time it last changed.
 * @returns One entry per thought, piece of prose and tool call.
 */
export function activitiesFromTranscript(messages: readonly AgentMessage[], live: boolean, translate: Translate, seenAt = Date.now()): TrackedActivity[] {
  const results: ToolResults = new Map()
  for (const message of messages) {
    if (message.role === 'toolResult')
      results.set(message.toolCallId, { isError: message.isError, text: textOf(message.content), timestamp: message.timestamp })
  }
  const lastAssistant = messages.findLastIndex(message => message.role === 'assistant')
  const log: TrackedActivity[] = []
  messages.forEach((message, index) => {
    if (message.role !== 'assistant')
      return
    const streaming = live && index === lastAssistant && message.stopReason === 'pending'
    message.content.forEach((part, partIndex) => {
      const base = { id: `${index}:${partIndex}`, startedAt: message.timestamp, rev: 0, seenAt }
      const activity = partActivity(part, base, streaming && partIndex === message.content.length - 1, live, results, translate)
      if (activity)
        log.push(activity)
    })
  })
  return log
}

/**
 * What a run consumed, totalled over a transcript's model replies.
 * @param messages - The transcript.
 * @returns Token counts and cost; zero counts are left out. Nothing when no model replied.
 */
export function usageFromTranscript(messages: readonly AgentMessage[]): AiUsage | undefined {
  let replied = false
  let model: string | undefined
  const total = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, cost: 0 }
  for (const message of messages) {
    if (message.role !== 'assistant')
      continue
    replied = true
    model = message.responseModel || message.model || model
    total.input += message.usage.input
    total.output += message.usage.output
    total.cacheRead += message.usage.cacheRead
    total.cacheWrite += message.usage.cacheWrite
    total.reasoning += message.usage.reasoning ?? 0
    total.cost += message.usage.cost.total
  }
  if (!replied)
    return undefined
  return {
    inputTokens: total.input || undefined,
    outputTokens: total.output || undefined,
    cacheReadTokens: total.cacheRead || undefined,
    cacheWriteTokens: total.cacheWrite || undefined,
    reasoningTokens: total.reasoning || undefined,
    costUsd: total.cost || undefined,
    model,
  }
}
