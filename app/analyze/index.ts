import type { AnalyzeAdapter, GroupSource } from '../types/analyze'
import { llmAdapter } from './adapters/llm'
import { noneAdapter } from './adapters/none'
import { ruleBasedAdapter } from './adapters/rule-based'
import { webLlmAdapter } from './adapters/web-llm'

const registry: Record<GroupSource, AnalyzeAdapter> = {
  'none': noneAdapter,
  'rule-based': ruleBasedAdapter,
  'llm': llmAdapter,
  'web-llm': webLlmAdapter,
}

export function resolveAdapter(id: GroupSource): AnalyzeAdapter {
  return registry[id]
}
