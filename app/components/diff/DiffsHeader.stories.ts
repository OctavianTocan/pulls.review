import type { Meta, StoryObj } from '@storybook/vue3-vite'
import empty from '../../../test/fixtures/synthetic/empty-group.json'
import zeroFiles from '../../../test/fixtures/synthetic/zero-files.json'
import { createMockDiffsStore } from '../../stores/mock-diffs-store'
import DiffsHeader from './DiffsHeader.vue'

const meta: Meta<typeof DiffsHeader> = {
  title: 'Diff/DiffsHeader',
  component: DiffsHeader,
  args: {
    groups: [],
    groupsVisable: [],
    scrollY: 0,
    reviewedCount: 0,
    totalFiles: 0,
    additions: 0,
    deletions: 0,
    store: createMockDiffsStore({ isSetup: true }),
  },
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
  args: { meta: empty.diff as any, store: createMockDiffsStore({ isSetup: false }) },
}

export const AiReady: Story = {
  args: { meta: empty.diff as any, store: createMockDiffsStore({ isSetup: true, grouped: { source: 'llm' } as any }) },
}
