import type { AnalyzeAdapter, DiffGroup, GroupedResult } from '../../../types/analyze'
import type { FileChange, PullRequestDiff } from '../../../types/diff'
import type { Analysis } from './schema'
import { generateText, Output } from 'ai'
import { ruleBasedAdapter } from '../rule-based'
import { chunkFiles } from './chunk'
import { mergeGroups } from './merge'
import { resolveLanguageModel } from './model'
import { buildDiffPrompt, CHUNK_SYSTEM_PROMPT, SINGLE_PASS_SYSTEM_PROMPT, SYNTHESIS_SYSTEM_PROMPT } from './prompt'
import { AnalysisSchema, ChunkAnalysisSchema, SynthesisSchema } from './schema'
import { toModelSchema } from './valibot-schema'

export const LLM_SCHEMA_VERSION = 1

async function analyzeWhole(diff: PullRequestDiff, model: NonNullable<ReturnType<typeof resolveLanguageModel>>): Promise<Analysis> {
  const { output } = await generateText({
    model,
    system: SINGLE_PASS_SYSTEM_PROMPT,
    prompt: buildDiffPrompt(diff.meta.title, diff.meta.description, diff.files),
    output: Output.object({ schema: toModelSchema(AnalysisSchema) }),
  })
  return output
}

async function analyzeChunked(diff: PullRequestDiff, model: NonNullable<ReturnType<typeof resolveLanguageModel>>, chunks: FileChange[][]): Promise<Analysis> {
  const chunkResults = await Promise.all(chunks.map(async (files, index) => {
    const { output } = await generateText({
      model,
      system: CHUNK_SYSTEM_PROMPT,
      prompt: `Part ${index + 1} of ${chunks.length}.\n\n${buildDiffPrompt(diff.meta.title, diff.meta.description, files)}`,
      output: Output.object({ schema: toModelSchema(ChunkAnalysisSchema) }),
    })
    return output
  }))

  const groups = mergeGroups(chunkResults.flatMap(result => result.groups))
  const { output: synthesis } = await generateText({
    model,
    system: SYNTHESIS_SYSTEM_PROMPT,
    prompt: `PR title: ${diff.meta.title}\n\nSection summaries:\n${
      chunkResults.map((result, index) => `${index + 1}. ${result.summary}`).join('\n')
    }\n\nResulting groups: ${groups.map(group => `"${group.label}" (${group.filePaths.length + (group.children?.reduce((n, c) => n + c.filePaths.length, 0) ?? 0)} files)`).join(', ')}`,
    output: Output.object({ schema: toModelSchema(SynthesisSchema) }),
  })

  return { overallSummary: synthesis.overallSummary, groups, walkthrough: synthesis.walkthrough }
}

/**
 * Drops any file path the model hallucinated (not in the diff) and any it duplicated
 * across groups (first group wins), then appends the diff's remaining, un-grouped
 * files as a catch-all group rather than silently dropping them from the view.
 */
function reconcile(diff: PullRequestDiff, analysis: Analysis): DiffGroup[] {
  const validPaths = new Set(diff.files.map(file => file.path))
  const seen = new Set<string>()
  const groups: DiffGroup[] = []

  for (const group of analysis.groups) {
    const filePaths = group.filePaths.filter(path => validPaths.has(path) && !seen.has(path))
    filePaths.forEach(path => seen.add(path))

    const children = group.children
      ?.map(child => ({
        ...child,
        filePaths: child.filePaths.filter((path) => {
          if (!validPaths.has(path) || seen.has(path))
            return false
          seen.add(path)
          return true
        }),
      }))
      .filter(child => child.filePaths.length > 0)

    if (filePaths.length === 0 && !children?.length)
      continue
    groups.push({ ...group, filePaths, children: children?.length ? children : undefined })
  }

  const leftover = diff.files.map(file => file.path).filter(path => !seen.has(path))
  if (leftover.length > 0)
    groups.push({ key: 'llm-unassigned', label: 'Other', filePaths: leftover })

  return groups
}

export const llmAdapter: AnalyzeAdapter = {
  id: 'llm',
  get available() {
    return resolveLanguageModel() !== undefined
  },
  async analyze(diff) {
    const model = resolveLanguageModel()
    if (!model)
      throw new Error('llm adapter is not configured: add a gateway token or a vendor API key in Settings')

    try {
      const chunks = chunkFiles(diff.files)
      const analysis = chunks.length <= 1
        ? await analyzeWhole(diff, model)
        : await analyzeChunked(diff, model, chunks)

      const result: GroupedResult = {
        source: 'llm',
        overallSummary: analysis.overallSummary,
        groups: reconcile(diff, analysis),
        walkthrough: analysis.walkthrough,
        generatedAt: new Date().toISOString(),
        schemaVersion: LLM_SCHEMA_VERSION,
      }
      return result
    }
    catch {
      // A network failure, a misconfigured endpoint, or a response that doesn't fit
      // the schema (bad JSON, wrong types, an invented category, ...) must never
      // crash the view - fall back to the always-available deterministic grouping.
      return ruleBasedAdapter.analyze(diff)
    }
  },
}
