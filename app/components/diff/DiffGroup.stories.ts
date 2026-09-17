import type { Meta, StoryObj } from '@storybook/vue3-vite'
import nestedGroups from '../../../test/fixtures/synthetic/nested-groups.json'
import partiallyReviewed from '../../../test/fixtures/synthetic/partially-reviewed.json'
import DiffGroup from './DiffGroup.vue'
import { resolveGroups } from './group-utils'

const meta: Meta<typeof DiffGroup> = {
  title: 'Diff/DiffGroup',
  component: DiffGroup,
  args: { layout: 'unified', collapsed: false },
}
export default meta

type Story = StoryObj<typeof DiffGroup>

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
