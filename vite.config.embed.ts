import { fileURLToPath } from 'node:url'
import Vue from '@vitejs/plugin-vue'
import { createJiti } from 'jiti'
import { defineConfig } from 'vite'
import { alias as sharedAlias } from './vite.config.shared'

const jiti = createJiti(import.meta.url)

/**
 * Separate build target from `vite.config.ts`: a single self-contained IIFE bundle
 * defining the `<diffs-embed-panel>` custom element, for the userscript to `@require`.
 * See `app/embed/main.ts`. No `unocss/vite` plugin - its CSS is a pre-generated,
 * shadow-root-safe file instead (`build:embed:css`, see scripts/build-embed-css.ts).
 *
 * The Shiki aliases below are embed-only, layered on top of `vite.config.shared.ts`'s
 * (shared with the main site) - `inlineDynamicImports: true` (required so the
 * userscript's single `@require` has no further script-src fetches to make on
 * GitHub's CSP) forces a bundler to inline every dynamic import it can statically
 * discover regardless of whether a given diff's runtime path actually reaches it, so
 * anything genuinely unused (the WASM highlighter engine) or rarely needed (most of
 * shiki's ~240 language grammars) needs to be swapped out before bundling, not after.
 * Neither applies to the main site, which code-splits each language into its own
 * lazily-fetched chunk - only ever downloading what a given diff actually needs.
 */
export default defineConfig({
  plugins: [
    Vue(),
    {
      name: 'embed-plugin',
      async buildStart() {
        await (jiti.import('./scripts/build-embed-css') as Promise<typeof import('./scripts/build-embed-css')>)
          .then(m => m.buildEmbedCSS())
      },
      async buildEnd() {
        await (jiti.import('./scripts/build-userscript') as Promise<typeof import('./scripts/build-userscript')>)
          .then(m => m.buildUserscript())
      },
    },
  ],
  resolve: {
    alias: sharedAlias,
  },
  publicDir: false,
  build: {
    outDir: 'public/embed',
    emptyOutDir: false,
    rollupOptions: {
      input: fileURLToPath(new URL('./app/embed/main.ts', import.meta.url)),
      output: {
        format: 'iife',
        entryFileNames: 'diffs-embed.js',
        inlineDynamicImports: true,
      },
    },
  },
})
