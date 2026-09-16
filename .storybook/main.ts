import type { StorybookConfig } from '@storybook/vue3-vite'
import UnoCSS from 'unocss/vite'

const config: StorybookConfig = {
  stories: ['../app/components/**/*.stories.ts'],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  async viteFinal(config) {
    config.plugins ??= []
    config.plugins.push(UnoCSS())
    return config
  },
}

export default config
