import type { ResolvedModel } from '@pulls.review/core/analyze'
import type { AiJobSnapshot, AiPrContext, AiUsage } from '@pulls.review/core/local-rpc'
import type { DiffsPayload } from '@pulls.review/core/types'
import { serializeRef } from '@pulls.review/core/types'

function headSha(diff: DiffsPayload): string | undefined {
  return diff.head?.sha ?? (diff.ref.kind === 'github-commit' ? diff.ref.sha : undefined)
}

/**
 * What a CLI engine may inspect through its PR tools while it works on this diff.
 * @param diff - The loaded diff.
 * @returns Every changed file with its hunks as one patch; nothing for diffs without a GitHub repository or head commit.
 */
export function buildPrContext(diff: DiffsPayload): AiPrContext | undefined {
  const { ref } = diff
  const head = headSha(diff)
  if (!head || (ref.kind !== 'github-pr' && ref.kind !== 'github-compare' && ref.kind !== 'github-commit'))
    return undefined
  const isPull = ref.kind === 'github-pr'
  return {
    owner: ref.owner,
    repo: ref.repo,
    number: isPull ? Number(ref.number) : undefined,
    title: isPull ? diff.title : undefined,
    headSha: head,
    baseSha: diff.base?.sha,
    files: diff.files.map(file => ({
      path: file.path,
      previousPath: file.previousPath,
      status: file.status,
      patch: file.hunks.length
        ? file.hunks.map(hunk => `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@\n${hunk.patch}`).join('\n')
        : undefined,
    })),
  }
}

/**
 * The job key of an analysis, equal for two runs only when they would do the same work.
 * @param diff - The diff being analyzed.
 * @param resolved - The engine, model and effort the run uses.
 * @returns e.g. `analyze:github:antfu/pulls.review#62@<sha>:claude-code:opus:high`.
 */
export function analysisJobKey(diff: DiffsPayload, resolved: ResolvedModel): string {
  return `analyze:${serializeRef(diff.ref)}@${headSha(diff) ?? ''}:${resolved.model.provider}:${resolved.model.id}:${resolved.effort ?? ''}`
}

const USAGE_COUNTS = ['inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'reasoningTokens', 'costUsd', 'durationMs'] as const

/**
 * What the server jobs of one run consumed together.
 * @param jobs - The run's jobs, newest first, as `listAiJobs` returns them.
 * @param match - Whether a job belongs to the run.
 * @returns Summed counts (a count stays unset when no job reported it) and the newest job's model; nothing when no job matched.
 */
export function runUsage(jobs: readonly AiJobSnapshot[], match: (job: AiJobSnapshot) => boolean): AiUsage | undefined {
  const usages = jobs.filter(job => job.usage && match(job)).map(job => job.usage!)
  if (!usages.length)
    return undefined
  const total: AiUsage = { model: usages.find(usage => usage.model)?.model }
  for (const usage of usages) {
    for (const count of USAGE_COUNTS) {
      if (usage[count] !== undefined)
        total[count] = (total[count] ?? 0) + usage[count]
    }
  }
  return total
}

/**
 * How an analysis is named in the server's job list.
 * @param diff - The diff being analyzed.
 * @returns e.g. `Analyze antfu/pulls.review#62`.
 */
export function analysisJobLabel(diff: DiffsPayload): string {
  const { ref } = diff
  return ref.kind === 'github-pr' ? `Analyze ${ref.owner}/${ref.repo}#${ref.number}` : `Analyze ${serializeRef(ref)}`
}
