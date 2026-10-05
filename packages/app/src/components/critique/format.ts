import type { AiUsage } from '@pulls.review/core/local-rpc'

/**
 * A duration as `42s`, `5m23s` or `1h05m`.
 * @param seconds - Whole seconds.
 * @returns The compact text.
 */
export function formatSeconds(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  if (total < 60)
    return `${total}s`
  if (total < 3600)
    return `${Math.floor(total / 60)}m${String(total % 60).padStart(2, '0')}s`
  return `${Math.floor(total / 3600)}h${String(Math.floor(total % 3600 / 60)).padStart(2, '0')}m`
}

/**
 * A token count as `950`, `12.3k` or `1.2M`.
 * @param count - The number of tokens.
 * @returns The compact text.
 */
export function formatTokens(count: number): string {
  if (count < 1000)
    return String(count)
  if (count < 1_000_000)
    return `${(count / 1000).toFixed(count < 10_000 ? 1 : 0)}k`
  return `${(count / 1_000_000).toFixed(1)}M`
}

/**
 * What a run cost, as `$0.42 · 12k in / 1.2k out · 1m05s`; parts the CLI did not report are left out.
 * @param usage - The usage the CLI reported.
 * @returns The text, or `''` when nothing was reported.
 */
export function formatUsage(usage: AiUsage | undefined): string {
  if (!usage)
    return ''
  const parts: string[] = []
  if (usage.costUsd !== undefined)
    parts.push(`$${usage.costUsd.toFixed(usage.costUsd < 0.01 ? 4 : 2)}`)
  const input = (usage.inputTokens ?? 0) + (usage.cacheReadTokens ?? 0) + (usage.cacheWriteTokens ?? 0)
  if (input > 0 || usage.outputTokens !== undefined)
    parts.push(`${formatTokens(input)} in / ${formatTokens(usage.outputTokens ?? 0)} out`)
  if (usage.durationMs !== undefined)
    parts.push(formatSeconds(usage.durationMs / 1000))
  return parts.join(' · ')
}
