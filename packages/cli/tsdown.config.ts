import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'devframe': 'src/devframe.ts',
    'pr-server': 'src/ai/pr-server.ts',
  },
  platform: 'node',
  dts: false,
})
