import type { Meta, StoryObj } from '@storybook/vue3-vite'
import empty from '../../fixtures/synthetic/empty-group.json'
import zeroFiles from '../../fixtures/synthetic/zero-files.json'
import PrHeader from './PrHeader.vue'

const meta: Meta<typeof PrHeader> = {
  title: 'Diff/PrHeader',
  component: PrHeader,
}
export default meta

type Story = StoryObj<typeof PrHeader>

export const Default: Story = {
  args: { meta: empty.diff.meta as any },
}

export const NoDescription: Story = {
  args: { meta: zeroFiles.diff.meta as any },
}
