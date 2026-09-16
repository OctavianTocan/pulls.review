// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    unocss: true,
    formatters: true,
    pnpm: true,
    antislop: true,
    ignores: [
      // Vendored verbatim from @pierre/diffs's dist/style.js - see pierre-diffs-shadow.ts.
      'app/components/diff/pierre-diffs-core.css',
      // Captured verbatim from real GitHub PRs (titles/descriptions are someone else's
      // prose) - see scripts/capture-fixtures.ts.
      'app/fixtures/real/**',
    ],
  },
)
