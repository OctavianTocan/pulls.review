import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { usePrNavContext } from '../composables/usePrNavContext'
import AppHeader from './AppHeader.vue'

const meta: Meta<typeof AppHeader> = {
  title: 'Layout/AppHeader',
  component: AppHeader,
}
export default meta

type Story = StoryObj<typeof AppHeader>

export const Default: Story = {}

export const WithPullRequestContext: Story = {
  render: () => ({
    components: { AppHeader },
    setup() {
      usePrNavContext().value = {
        title: 'fix(runtime-vapor): assign to exposed refs through template refs',
        url: 'https://github.com/vuejs/core/pull/15522',
        state: 'open',
        reviewedCount: 1,
        totalFiles: 2,
        additions: 55,
        deletions: 1,
      }
    },
    template: '<AppHeader />',
  }),
}

export const MergedPullRequest: Story = {
  render: () => ({
    components: { AppHeader },
    setup() {
      usePrNavContext().value = {
        title: 'feat: add antislop option',
        url: 'https://github.com/antfu/eslint-config/pull/861',
        state: 'merged',
        reviewedCount: 18,
        totalFiles: 18,
        additions: 130,
        deletions: 0,
      }
    },
    template: '<AppHeader />',
  }),
}
