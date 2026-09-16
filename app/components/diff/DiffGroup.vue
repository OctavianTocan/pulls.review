<script setup lang="ts">
import type { ResolvedGroupWithChildren } from './group-utils'
import { computed, ref } from 'vue'
import DiffGroupHeader from './DiffGroupHeader.vue'
import FileDiff from './FileDiff.vue'
import FileTree from './FileTree.vue'

const props = defineProps<{
  group: ResolvedGroupWithChildren
  layout: 'split' | 'unified'
  reviewed: Set<string>
  collapsed: boolean
  /** Nested (child) groups render without their own sticky header or further children. */
  nested?: boolean
}>()

const emit = defineEmits<{
  'update:reviewed': [sha: string, reviewed: boolean]
  'toggle': []
}>()

const totalFiles = computed(() => props.group.files.length + props.group.children.reduce((n, c) => n + c.files.length, 0))
const totalAdded = computed(() => props.group.added + props.group.children.reduce((n, c) => n + c.added, 0))
const totalDeleted = computed(() => props.group.deleted + props.group.children.reduce((n, c) => n + c.deleted, 0))
const reviewedCount = computed(() => {
  const files = [...props.group.files, ...props.group.children.flatMap(child => child.files)]
  return files.filter(file => props.reviewed.has(file.sha)).length
})

// Each child group collapses independently of its parent and of its siblings.
const collapsedChildren = ref(new Set<string>())
function toggleChild(key: string) {
  const next = new Set(collapsedChildren.value)
  if (next.has(key))
    next.delete(key)
  else
    next.add(key)
  collapsedChildren.value = next
}
</script>

<template>
  <section>
    <DiffGroupHeader
      :label="group.label"
      :summary="group.summary"
      :collapsed="collapsed"
      :added="totalAdded"
      :deleted="totalDeleted"
      :total-files="totalFiles"
      :reviewed-count="reviewedCount"
      :sticky="!nested"
      @toggle="emit('toggle')"
    />

    <div v-if="!collapsed" class="p-3 flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_4fr]">
      <aside class="flex flex-col gap-3 min-w-0">
        <p v-if="group.summary" class="text-sm op-fade">
          {{ group.summary }}
        </p>
        <FileTree
          v-if="group.files.length > 1"
          :files="group.files"
          :reviewed="reviewed"
          @update:reviewed="(sha, isReviewed) => emit('update:reviewed', sha, isReviewed)"
        />
      </aside>

      <div class="flex flex-col gap-3 min-w-0">
        <FileDiff
          v-for="file in group.files"
          :key="file.sha"
          :file="file"
          :layout="layout"
          :reviewed="reviewed.has(file.sha)"
          @update:reviewed="isReviewed => emit('update:reviewed', file.sha, isReviewed)"
        />
      </div>
    </div>

    <div v-if="!collapsed && !nested && group.children.length" class="ml-3 pl-4 border-l border-base flex flex-col gap-4">
      <DiffGroup
        v-for="child in group.children"
        :key="child.key"
        :group="{ ...child, children: [] }"
        :layout="layout"
        :reviewed="reviewed"
        :collapsed="collapsedChildren.has(child.key)"
        nested
        @update:reviewed="(sha, isReviewed) => emit('update:reviewed', sha, isReviewed)"
        @toggle="toggleChild(child.key)"
      />
    </div>
  </section>
</template>
