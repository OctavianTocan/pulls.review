import type { DiffCategory } from '../../../types/analyze'

export interface CategoryRule {
  category: DiffCategory
  patterns: string[]
}

/** Evaluated in order, first match wins. Fallback category (no rule matches) is 'code'. */
export const defaultRules: CategoryRule[] = [
  { category: 'tests', patterns: ['**/*.test.*', '**/*.spec.*', '**/__tests__/**', '**/test/**'] },
  { category: 'docs', patterns: ['**/*.md', '**/*.mdx', 'docs/**', 'README*'] },
  { category: 'deps', patterns: ['package.json', 'pnpm-lock.yaml', 'yarn.lock', 'package-lock.json', 'pnpm-workspace.yaml'] },
  { category: 'config', patterns: ['*.config.*', '.*rc', '.*rc.*', '.github/**', 'tsconfig*.json'] },
  { category: 'build', patterns: ['Dockerfile', 'vite.config.*', 'rollup.config.*', 'esbuild.config.*'] },
  { category: 'generated', patterns: ['**/*.generated.*', '**/dist/**', '**/*.lock'] },
]
