import type { AnalyzeAdapter, GroupSource } from '../types/analyze'
import { resolveAdapter } from '../analyze'

export function useAnalyzeAdapter(id: GroupSource): AnalyzeAdapter {
  return resolveAdapter(id)
}
