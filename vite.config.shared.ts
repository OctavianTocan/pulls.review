import { fileURLToPath } from 'node:url'

export const alias = {
  // Teleports to document.body, escaping the shadow root - see
  // app/embed/vue-afloat-noop.ts.
  'vue-afloat': fileURLToPath(new URL('./app/embed/vue-afloat-noop.ts', import.meta.url)),
  // TODO: alias Shiki used by pierre/diffs, by only include used themes, command grammar and the JS engine.
}
