import type { AnalyzeAdapter, DiffCategory, DiffGroup, GroupedResult } from '../../../types/analyze'
import picomatch from 'picomatch'
import { defaultRules } from './rules'

const FALLBACK_CATEGORY: DiffCategory = 'code'
export const RULE_BASED_SCHEMA_VERSION = 1

const matchers = defaultRules.map(rule => ({
  category: rule.category,
  isMatch: rule.patterns
    ? picomatch(rule.patterns)
    : () => false,
}))

function categorize(path: string): DiffCategory {
  for (const { category, isMatch } of matchers) {
    if (isMatch(path))
      return category
  }
  return FALLBACK_CATEGORY
}

const CATEGORY_LABELS: Record<DiffCategory, string> = {
  code: 'Code',
  tests: 'Tests',
  docs: 'Docs',
  deps: 'Dependencies',
  config: 'Config',
  generated: 'Generated',
  other: 'Other',
}

// No LLM available: a plain, deterministic blurb per category rather than an empty
// summary field, so the UI always has something to show above a group's file tree.
const CATEGORY_SUMMARIES: Record<DiffCategory, string> = {
  code: 'Source changes.',
  tests: 'Test coverage for the change.',
  docs: 'Documentation updates.',
  deps: 'Dependency version changes.',
  config: 'Configuration changes.',
  generated: 'Generated or build output changes.',
  other: 'Other changes that don\'t fit an existing category.',
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
        group = {
          key: category,
          label: CATEGORY_LABELS[category],
          category,
          summary: CATEGORY_SUMMARIES[category],
          filePaths: [],
        }
        groupsByCategory.set(category, group)
      }
      group.filePaths.push(file.path)
    }

    const result: GroupedResult = {
      source: 'rule-based',
      groups: Array.from(groupsByCategory.values())
        .sort((a, b) => defaultRules.findIndex(rule => rule.category === a.key) - defaultRules.findIndex(rule => rule.category === b.key)),
      generatedAt: new Date().toISOString(),
      schemaVersion: RULE_BASED_SCHEMA_VERSION,
    }
    return result
  },
}
