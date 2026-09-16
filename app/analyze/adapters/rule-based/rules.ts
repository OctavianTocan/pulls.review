import type { DiffCategory } from '../../../types/analyze'

export interface CategoryRule {
  category: DiffCategory
  patterns?: string[]
}

/**
 * Generated/lockfile-style output - shared with `noisy-files.ts`, which collapses
 * these by default in the diff view, so the two "this file is noise" notions
 * (grouping category vs. default-collapsed) can't drift apart.
 */
export const GENERATED_PATTERNS = [
  '**/*.generated.*',
  '**/pnpm-lock.yaml',
  '**/yarn.lock',
  '**/package-lock.json',
  '**/dist/**',
  '**/*.lock',
]

/** Evaluated in order, first match wins. Fallback category (no rule matches) is 'code'. */
export const defaultRules: CategoryRule[] = [
  {
    category: 'code',
  },
  {
    category: 'config',
    patterns: [
      '*.config.*',
      '**/package.json',
      '**/pnpm-workspace.yaml',
      '.*rc',
      '.*rc.*',
      '.github/**',
      '.git*',
      '**/tsconfig*.json',
      '**/Dockerfile',
    ],
  },
  {
    category: 'docs',
    patterns: [
      '**/*.md',
      '**/*.mdx',
      '**/*.mdc',
      '**/docs/**',
      '**/README*',
    ],
  },
  {
    category: 'tests',
    patterns: [
      '**/*.test.*',
      '**/*.spec.*',
      '**/__tests__/**',
      '**/test/**',
      '**/tests/**',
    ],
  },
  {
    category: 'generated',
    patterns: GENERATED_PATTERNS,
  },
]
