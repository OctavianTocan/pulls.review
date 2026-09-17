import { fileURLToPath } from 'node:url'

export const alias = [
  // Teleports to document.body, escaping the shadow root - see
  // app/embed/vue-afloat-noop.ts.
  {
    find: /^vue-afloat$/,
    replacement: fileURLToPath(new URL('./app/embed/vue-afloat-noop.ts', import.meta.url)),
  },
  {
    find: /^shiki\/wasm$/,
    replacement: fileURLToPath(new URL('./app/embed/shiki-wasm-noop.ts', import.meta.url)),
  },
  {
    find: /^shiki$/,
    replacement: fileURLToPath(new URL('./app/embed/shiki-langs-embed.ts', import.meta.url)),
  },
]
