import type { Meta, StoryObj } from '@storybook/vue3-vite'
import partiallyReviewed from '../../../test/fixtures/synthetic/partially-reviewed.json'
import zeroFiles from '../../../test/fixtures/synthetic/zero-files.json'
import FileTree from './FileTree.vue'

const meta: Meta<typeof FileTree> = {
  title: 'Diff/FileTree',
  component: FileTree,
}
export default meta

type Story = StoryObj<typeof FileTree>

export const Default: Story = {
  args: { files: partiallyReviewed.diff.files as any, reviewed: new Set(partiallyReviewed.reviewedShas) },
}

export const Empty: Story = {
  args: { files: zeroFiles.diff.files as any, reviewed: new Set() },
}
