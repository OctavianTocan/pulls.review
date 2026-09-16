import type { StorybookConfig } from '@storybook/vue3-vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'

const config: StorybookConfig = {
  stories: ['../app/components/**/*.stories.ts'],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  async viteFinal(config) {
    config.plugins ??= []
    // @storybook/vue3-vite is meant to wire this up itself, but reliably fails to under
    // this combination of pnpm hoisting + Vite 8's rolldown build - a long-standing,
    // recurring upstream issue (storybookjs/storybook#28968, #20576, #26306).
    config.plugins.push(vue())
    config.plugins.push(UnoCSS())
    return config
  },
}

export default config
