import picomatch from 'picomatch'
import { describe, expect, it } from 'vitest'
import { defaultRules } from './rules'

function categorize(path: string): string {
  for (const rule of defaultRules) {
    if (picomatch(rule.patterns)(path))
      return rule.category
  }
  return 'code'
}

describe('defaultRules', () => {
  it.each([
    ['src/foo.test.ts', 'tests'],
    ['src/__tests__/foo.ts', 'tests'],
    ['test/foo.ts', 'tests'],
    ['README.md', 'docs'],
    ['docs/guide.mdx', 'docs'],
    ['package.json', 'deps'],
    ['pnpm-lock.yaml', 'deps'],
    ['.eslintrc.json', 'config'],
    ['.github/workflows/ci.yml', 'config'],
    ['tsconfig.json', 'config'],
    ['Dockerfile', 'build'],
    // `config`'s `*.config.*` pattern is checked before `build`'s more specific
    // `vite.config.*`, so any `*.config.*` file lands in `config` first. First
    // match wins, per the rule order.
    ['vite.config.ts', 'config'],
    ['dist/bundle.js', 'generated'],
    ['schema.generated.ts', 'generated'],
    ['src/index.ts', 'code'],
  ])('categorizes %s as %s', (path, expected) => {
    expect(categorize(path)).toBe(expected)
  })
})
