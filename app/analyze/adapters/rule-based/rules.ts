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
  '**/Cargo.lock',
  '**/go.sum',
  '**/dist/**',
  '**/*.lock',
]

/**
 * Evaluated in order, first match wins - more specific patterns (docs, tests) come
 * before more general catch-alls (config, generated) so e.g. a doc file under
 * `.github/` still lands in `docs`, not `config`. Fallback category (no rule
 * matches, or no `patterns` at all - `code`/`other`) is 'code'.
 */
export const defaultRules: CategoryRule[] = [
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
    category: 'code',
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
    category: 'config',
    patterns: [
      '*.config.*',
      '.*rc',
      '.*rc.*',
      '.github/**',
      '.git*',
      '**/tsconfig*.json',
      '**/Dockerfile',
      '**/docker-compose*.y*ml',
      '**/.dockerignore',
      '**/Makefile',
    ],
  },
  // Manifests declare deps; their lockfiles are machine-generated output, not
  // something a reviewer edits by hand - see GENERATED_PATTERNS above.
  {
    category: 'deps',
    patterns: [
      '**/package.json',
      '**/pnpm-workspace.yaml',
      '**/Cargo.toml',
      '**/go.mod',
    ],
  },
  {
    category: 'generated',
    patterns: GENERATED_PATTERNS,
  },
  {
    category: 'other',
  },
]
