import type { AnalyzeAdapter, DiffCategory, DiffGroup, GroupedResult } from '../../../types/analyze'
import picomatch from 'picomatch'
import { defaultRules } from './rules'

const FALLBACK_CATEGORY: DiffCategory = 'code'
export const RULE_BASED_SCHEMA_VERSION = 1

const matchers = defaultRules.map(rule => ({ category: rule.category, isMatch: picomatch(rule.patterns) }))

function categorize(path: string): DiffCategory {
  for (const { category, isMatch } of matchers) {
    if (isMatch(path))
      return category
  }
  return FALLBACK_CATEGORY
}

export const ruleBasedAdapter: AnalyzeAdapter = {
  id: 'rule-based',
  available: true,
  async analyze(diff) {
    const groupsByCategory = new Map<DiffCategory, DiffGroup>()

    for (const file of diff.files) {
      const category = categorize(file.path)
      let group = groupsByCategory.get(category)
      if (!group) {
        group = { key: category, label: category, category, filePaths: [] }
        groupsByCategory.set(category, group)
      }
      group.filePaths.push(file.path)
    }

    const result: GroupedResult = {
      source: 'rule-based',
      groups: Array.from(groupsByCategory.values()),
      generatedAt: new Date().toISOString(),
      schemaVersion: RULE_BASED_SCHEMA_VERSION,
    }
    return result
  },
}
