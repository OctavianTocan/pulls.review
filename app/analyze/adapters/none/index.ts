import type { AnalyzeAdapter, GroupedResultCore } from '../../../types/analyze'
import { normalizeGroupedResult } from '../../../types/analyze'

export const NONE_SCHEMA_VERSION = 1

export const noneAdapter: AnalyzeAdapter = {
  id: 'none',
  available: true,
  async analyze(diff) {
    const core: GroupedResultCore = {
      groups: [{ key: 'all', label: 'All files', filePaths: diff.files.map(file => file.path) }],
      schemaVersion: NONE_SCHEMA_VERSION,
    }
    return normalizeGroupedResult('none', core)
  },
}
