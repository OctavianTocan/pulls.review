// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    unocss: true,
    formatters: true,
    pnpm: true,
    antislop: true,
    ignores: [
      'app/components/diff/pierre-diffs-core.css',
      'test/fixtures/real/**',
      '**/__snapshots__/**',
    ],
  },
)
