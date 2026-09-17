import type { Meta, StoryObj } from '@storybook/vue3-vite'
import real from '../../../test/fixtures/real/small.json'
import partiallyReviewed from '../../../test/fixtures/synthetic/partially-reviewed.json'
import zeroFiles from '../../../test/fixtures/synthetic/zero-files.json'
import DiffsPage from './DiffsPage.vue'

const meta: Meta<typeof DiffsPage> = {
  title: 'Diff/DiffsPage',
  component: DiffsPage,
  args: { layout: 'unified' },
}
export default meta

type Story = StoryObj<typeof DiffsPage>

export const Synthetic: Story = {
  args: {
    diff: partiallyReviewed.diff as any,
    grouped: partiallyReviewed.grouped as any,
    reviewed: new Set(partiallyReviewed.reviewedShas),
  },
}

export const RealPullRequest: Story = {
  args: {
    diff: real.diff as any,
    grouped: real.grouped as any,
    reviewed: new Set(),
  },
}

export const ZeroFiles: Story = {
  args: {
    diff: zeroFiles.diff as any,
    grouped: zeroFiles.grouped as any,
    reviewed: new Set(),
  },
}
