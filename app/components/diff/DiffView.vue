<script setup lang="ts">
import type { GroupedResult } from '../../types/analyze'
import type { PullRequestDiff } from '../../types/diff'
import ActionToggleGroup from '@antfu/design/components/Action/ActionToggleGroup.vue'
import DisplayProgressBar from '@antfu/design/components/Display/DisplayProgressBar.vue'
import { computed, ref } from 'vue'
import DiffGroup from './DiffGroup.vue'
import { resolveGroups } from './group-utils'
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

// Each DiffGroup collapses itself (both its tree and its diffs together) - all
// expanded by default.
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
  <div class="flex flex-col gap-4">
    <PrHeader :meta="diff.meta" />

    <div class="flex gap-4 items-center">
      <div class="text-sm flex-1">
        <div class="mb-1 flex justify-between">
          <span>{{ reviewedCount }} / {{ diff.files.length }} files reviewed</span>
        </div>
        <DisplayProgressBar :value="progress" />
      </div>
      <ActionToggleGroup
        :model-value="layout"
        :options="layoutOptions"
        @update:model-value="emit('update:layout', $event as 'split' | 'unified')"
      />
    </div>

    <DiffGroup
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
</template>
