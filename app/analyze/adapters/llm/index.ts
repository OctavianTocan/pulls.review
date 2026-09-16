import type { AnalyzeAdapter } from '../../../types/analyze'

/**
 * TODO(phase: llm-integration): Vercel AI SDK, preferring AI Gateway with vendor-key
 * fallback (OpenAI-compatible + Anthropic). Populates overallSummary, per-group
 * summary, and walkthrough. available = true once a key/gateway token is configured
 * in Settings. Stub for now:
 */
export const llmAdapter: AnalyzeAdapter = {
  id: 'llm',
  available: false,
  analyze: () => { throw new Error('llm adapter not implemented yet') },
}
