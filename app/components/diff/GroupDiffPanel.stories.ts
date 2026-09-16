import type { Meta, StoryObj } from '@storybook/vue3-vite'
import nestedGroups from '../../fixtures/synthetic/nested-groups.json'
import partiallyReviewed from '../../fixtures/synthetic/partially-reviewed.json'
import { resolveGroups } from './group-utils'
import GroupDiffPanel from './GroupDiffPanel.vue'

const meta: Meta<typeof GroupDiffPanel> = {
  title: 'Diff/GroupDiffPanel',
  component: GroupDiffPanel,
  args: { layout: 'unified', collapsed: false },
}
export default meta

type Story = StoryObj<typeof GroupDiffPanel>

export const Default: Story = {
  args: {
    group: resolveGroups(partiallyReviewed.grouped.groups as any, partiallyReviewed.diff.files as any)[0]!,
    reviewed: new Set(partiallyReviewed.reviewedShas),
  },
}

export const WithNestedChildren: Story = {
  args: {
    group: resolveGroups(nestedGroups.grouped.groups as any, nestedGroups.diff.files as any)[0]!,
    reviewed: new Set(),
  },
}

export const Collapsed: Story = {
  args: {
    group: resolveGroups(partiallyReviewed.grouped.groups as any, partiallyReviewed.diff.files as any)[0]!,
    reviewed: new Set(partiallyReviewed.reviewedShas),
    collapsed: true,
  },
}
