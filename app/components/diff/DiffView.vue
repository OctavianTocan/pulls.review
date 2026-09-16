<script setup lang="ts">
import type { GroupedResult } from '../../types/analyze'
import type { PullRequestDiff } from '../../types/diff'
import ActionToggleGroup from '@antfu/design/components/Action/ActionToggleGroup.vue'
import DisplayProgressBar from '@antfu/design/components/Display/DisplayProgressBar.vue'
import { computed, ref } from 'vue'
import { resolveGroups } from './group-utils'
import GroupDiffPanel from './GroupDiffPanel.vue'
import GroupTree from './GroupTree.vue'
import PrHeader from './PrHeader.vue'

const props = defineProps<{
  diff: PullRequestDiff
  grouped: GroupedResult
  layout: 'split' | 'unified'
  reviewed: Set<string>
}>()

const emit = defineEmits<{
  'update:reviewed': [sha: string, reviewed: boolean]
  'update:layout': [layout: 'split' | 'unified']
}>()

const reviewedCount = computed(() => props.diff.files.filter(file => props.reviewed.has(file.sha)).length)
const progress = computed(() => props.diff.files.length === 0 ? 1 : reviewedCount.value / props.diff.files.length)

const layoutOptions = [
  { value: 'unified', label: 'Unified', icon: 'i-ph:rows' },
  { value: 'split', label: 'Split', icon: 'i-ph:columns' },
]

const resolvedGroups = computed(() => resolveGroups(props.grouped.groups, props.diff.files))

// Shared between the sidebar tree and the diff panels, so collapsing a group in one
// place hides it in the other too. All expanded by default.
const collapsedGroups = ref(new Set<string>())
function toggleGroup(key: string) {
  const next = new Set(collapsedGroups.value)
  if (next.has(key))
    next.delete(key)
  else
    next.add(key)
  collapsedGroups.value = next
}
</script>

<template>
  <div class="flex flex-col gap-6 lg:gap-6 lg:grid lg:grid-cols-[340px_1fr] lg:items-start">
    <aside class="flex flex-col gap-4 lg:max-h-[calc(100vh-2rem)] lg:top-4 lg:sticky lg:overflow-y-auto">
      <PrHeader :meta="diff.meta" />

      <div class="text-sm">
        <div class="mb-1 flex justify-between">
          <span>{{ reviewedCount }} / {{ diff.files.length }} files reviewed</span>
        </div>
        <DisplayProgressBar :value="progress" />
      </div>

      <ActionToggleGroup
        :model-value="layout"
        :options="layoutOptions"
        class="w-full"
        @update:model-value="emit('update:layout', $event as 'split' | 'unified')"
      />

      <GroupTree
        :groups="grouped.groups"
        :files="diff.files"
        :reviewed="reviewed"
        :collapsed-groups="collapsedGroups"
        @update:reviewed="(sha, isReviewed) => emit('update:reviewed', sha, isReviewed)"
        @toggle-group="toggleGroup"
      />
    </aside>

    <div class="flex flex-col gap-4 min-w-0">
      <GroupDiffPanel
        v-for="group in resolvedGroups"
        :key="group.key"
        :group="group"
        :layout="layout"
        :reviewed="reviewed"
        :collapsed="collapsedGroups.has(group.key)"
        @update:reviewed="(sha, isReviewed) => emit('update:reviewed', sha, isReviewed)"
        @toggle="toggleGroup(group.key)"
      />
    </div>
  </div>
</template>
