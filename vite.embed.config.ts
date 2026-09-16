import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

/**
 * Separate build target from `vite.config.ts`: a single self-contained IIFE bundle
 * defining the `<diffs-embed-panel>` custom element, for the userscript to `@require`.
 * See `app/embed/main.ts`. No `unocss/vite` plugin - its CSS is a pre-generated,
 * shadow-root-safe file instead (`build:embed:css`, see scripts/build-embed-css.ts).
 */
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      // Teleports to document.body, escaping the shadow root - see
      // app/embed/vue-afloat-noop.ts.
      'vue-afloat': fileURLToPath(new URL('./app/embed/vue-afloat-noop.ts', import.meta.url)),
    },
  },
  // Nothing to serve verbatim for this build, and its outDir sits inside the main
  // build's publicDir - disable the public-dir copy so it doesn't duplicate into itself.
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
