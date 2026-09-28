import { fileURLToPath } from 'node:url'

export const alias = [
  {
    find: /^shiki\/wasm$/,
    replacement: fileURLToPath(new URL('./app/embed/shiki-wasm-noop.ts', import.meta.url)),
  },
  {
    find: /^shiki$/,
    replacement: fileURLToPath(new URL('./app/embed/shiki-langs-embed.ts', import.meta.url)),
  },
]
