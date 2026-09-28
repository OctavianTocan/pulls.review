import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createMockDiffsStore } from '../../stores/mock-diffs-store'
import DiffAnalyzeButton from './DiffAnalyzeButton.vue'

const meta: Meta<typeof DiffAnalyzeButton> = {
  title: 'Diff/DiffAnalyzeButton',
  component: DiffAnalyzeButton,
}
export default meta

type Story = StoryObj<typeof DiffAnalyzeButton>

export const NotConfigured: Story = {
  args: { llm: createMockDiffsStore({ isSetup: false }).llm! },
}

export const ReadyToAnalyze: Story = {
  args: { llm: createMockDiffsStore({ isSetup: true }).llm! },
}

export const Analyzing: Story = {
  args: {
    llm: createMockDiffsStore({
      isSetup: true,
      isAnalyzing: true,
      llmProgress: { step: 3, message: 'Reading 4 files: app/auth/session.ts, …' },
    }).llm!,
  },
}

export const Failed: Story = {
  args: {
    llm: createMockDiffsStore({
      isSetup: true,
      llmError: new Error('401 Unauthorized: invalid x-api-key'),
    }).llm!,
  },
}
