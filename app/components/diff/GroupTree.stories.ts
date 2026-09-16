import type { Meta, StoryObj } from '@storybook/vue3-vite'
import emptyGroup from '../../fixtures/synthetic/empty-group.json'
import nestedGroups from '../../fixtures/synthetic/nested-groups.json'
import partiallyReviewed from '../../fixtures/synthetic/partially-reviewed.json'
import GroupTree from './GroupTree.vue'

const meta: Meta<typeof GroupTree> = {
  title: 'Diff/GroupTree',
  component: GroupTree,
  args: { collapsedGroups: new Set() },
}
export default meta

type Story = StoryObj<typeof GroupTree>

export const Default: Story = {
  args: {
    groups: partiallyReviewed.grouped.groups as any,
    files: partiallyReviewed.diff.files as any,
    reviewed: new Set(partiallyReviewed.reviewedShas),
  },
}

export const WithEmptyGroup: Story = {
  args: {
    groups: emptyGroup.grouped.groups as any,
    files: emptyGroup.diff.files as any,
    reviewed: new Set(),
  },
}

export const NestedGroups: Story = {
  args: {
    groups: nestedGroups.grouped.groups as any,
    files: nestedGroups.diff.files as any,
    reviewed: new Set(),
  },
}
