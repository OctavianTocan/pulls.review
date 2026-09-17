import type { Meta, StoryObj } from '@storybook/vue3-vite'
import empty from '../../../test/fixtures/synthetic/empty-group.json'
import zeroFiles from '../../../test/fixtures/synthetic/zero-files.json'
import DiffsHeader from './DiffsHeader.vue'

const meta: Meta<typeof DiffsHeader> = {
  title: 'Diff/DiffsHeader',
  component: DiffsHeader,
  args: { groups: [], analyzeMode: 'rule-based', llmAvailable: true, hasAiResult: false },
}
export default meta

type Story = StoryObj<typeof DiffsHeader>

export const Default: Story = {
  args: { meta: empty.diff as any },
}

export const NoDescription: Story = {
  args: { meta: zeroFiles.diff as any },
}

export const AiNotConfigured: Story = {
  args: { meta: empty.diff as any, analyzeMode: 'llm', llmAvailable: false },
}

export const AiReady: Story = {
  args: { meta: empty.diff as any, analyzeMode: 'llm', llmAvailable: true, hasAiResult: true },
}
