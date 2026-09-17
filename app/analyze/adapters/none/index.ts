import type { AnalyzeAdapter, GroupedResult } from '../../../types/analyze'

export const NONE_SCHEMA_VERSION = 1

export const noneAdapter: AnalyzeAdapter = {
  id: 'none',
  available: true,
  async analyze(diff) {
    const result: GroupedResult = {
      source: 'none',
      groups: [{ key: 'all', label: 'All files', filePaths: diff.files.map(file => file.path) }],
      generatedAt: new Date().toISOString(),
      schemaVersion: NONE_SCHEMA_VERSION,
    }
    return result
  },
}
