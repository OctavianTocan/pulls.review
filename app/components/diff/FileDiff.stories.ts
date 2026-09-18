import type { Meta, StoryObj } from '@storybook/vue3-vite'
import binaryFile from '../../../test/fixtures/synthetic/binary-file.json'
import hugeFile from '../../../test/fixtures/synthetic/huge-file.json'
import partiallyReviewed from '../../../test/fixtures/synthetic/partially-reviewed.json'
import renamedFile from '../../../test/fixtures/synthetic/renamed-file.json'
import { createMockDiffsStore } from '../../stores/mock-diffs-store'
import FileDiff from './FileDiff.vue'

const meta: Meta<typeof FileDiff> = {
  title: 'Diff/FileDiff',
  component: FileDiff,
  args: { layout: 'unified', store: createMockDiffsStore({}) },
}
export default meta

type Story = StoryObj<typeof FileDiff>

export const Modified: Story = {
  args: { file: partiallyReviewed.diff.files[0] as any },
}

export const Reviewed: Story = {
  args: { file: partiallyReviewed.diff.files[0] as any, store: createMockDiffsStore({ reviewed: [(partiallyReviewed.diff.files[0] as any).sha] }) },
}

export const Split: Story = {
  args: { file: partiallyReviewed.diff.files[0] as any, layout: 'split' },
}

export const Renamed: Story = {
  args: { file: renamedFile.diff.files[0] as any },
}

export const Binary: Story = {
  args: { file: binaryFile.diff.files[0] as any },
}

export const Huge: Story = {
  args: { file: hugeFile.diff.files[0] as any },
}
