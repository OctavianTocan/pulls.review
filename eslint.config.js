// @ts-check
import antfu from '@antfu/eslint-config'
import nuxt from './.nuxt/eslint.config.mjs'

export default antfu(
  {
    unocss: true,
    formatters: true,
    pnpm: true,
    antislop: true,
    ignores: [
      // Vendored verbatim from @pierre/diffs's dist/style.js - see pierre-diffs-shadow.ts.
      'app/components/diff/pierre-diffs-core.css',
    ],
  },
)
  .append(nuxt())
