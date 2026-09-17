import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { createJiti } from 'jiti'
import { defineConfig } from 'vite'
import { alias } from './vite.config.shared'

const jiti = createJiti(import.meta.url)

/**
 * Separate build target from `vite.config.ts`: a single self-contained IIFE bundle
 * defining the `<diffs-embed-panel>` custom element, for the userscript to `@require`.
 * See `app/embed/main.ts`. No `unocss/vite` plugin - its CSS is a pre-generated,
 * shadow-root-safe file instead (`build:embed:css`, see scripts/build-embed-css.ts).
 */
export default defineConfig({
  plugins: [
    vue(),
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
    alias,
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
