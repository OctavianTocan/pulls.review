import type { Meta, StoryObj } from '@storybook/vue3-vite'
import empty from '../../fixtures/synthetic/empty-group.json'
import zeroFiles from '../../fixtures/synthetic/zero-files.json'
import DiffsHeader from './DiffsHeader.vue'

const meta: Meta<typeof DiffsHeader> = {
  title: 'Diff/DiffsHeader',
  component: DiffsHeader,
  args: { groups: [] },
}
export default meta

type Story = StoryObj<typeof DiffsHeader>

export const Default: Story = {
  args: { meta: empty.diff.meta as any },
}

export const NoDescription: Story = {
  args: { meta: zeroFiles.diff.meta as any },
}
