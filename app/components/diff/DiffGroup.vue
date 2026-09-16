<script setup lang="ts">
import type { ResolvedGroupWithChildren } from './group-utils'
import ActionIconButton from '@antfu/design/components/Action/ActionIconButton.vue'
import { computed } from 'vue'
import FileDiff from './FileDiff.vue'
import FileTree from './FileTree.vue'

const props = defineProps<{
  group: ResolvedGroupWithChildren
  layout: 'split' | 'unified'
  reviewed: Set<string>
  collapsed: boolean
}>()

const emit = defineEmits<{
  'update:reviewed': [sha: string, reviewed: boolean]
  'toggle': []
}>()

const totalFiles = computed(() => props.group.files.length + props.group.children.reduce((n, c) => n + c.files.length, 0))
const totalAdded = computed(() => props.group.added + props.group.children.reduce((n, c) => n + c.added, 0))
const totalDeleted = computed(() => props.group.deleted + props.group.children.reduce((n, c) => n + c.deleted, 0))
</script>

<template>
  <section class="border border-base rounded-lg overflow-hidden">
    <header class="flex w-full">
      <!-- TODO: should have review checkbox | file title | added/deleted counts | collapse/expand button -->
      <!-- TODO: auto close diff when review is clicked. And when the initial state of reviewed is true, the default state should be collapsed -->
      <button
        type="button"
        class="text-sm px-3 py-2 bg-raised flex flex-1 gap-2 items-center hover:bg-active"
        :aria-expanded="!collapsed"
        @click="emit('toggle')"
      >
        <ActionIconButton
          compact
          :icon="collapsed ? 'i-ph:caret-right' : 'i-ph:caret-down'"
          label="Toggle group"
          as="span"
        />
        <span class="font-medium">{{ group.label }}</span>
        <span class="text-xs ml-auto op-fade">{{ totalFiles }} file{{ totalFiles === 1 ? '' : 's' }}</span>
        <span class="text-xs whitespace-nowrap">
          <span class="color-success-500">+{{ totalAdded }}</span>
          <span class="color-error-500 ml-1">-{{ totalDeleted }}</span>
        </span>
      </button>
    </header>

    <div v-if="!collapsed" class="p-3 flex flex-col gap-4 md:grid md:grid-cols-[280px_1fr]">
      <aside class="flex flex-col gap-3 min-w-0">
        <p v-if="group.summary" class="text-sm op-fade">
          {{ group.summary }}
        </p>
        <FileTree :files="group.files" :reviewed="reviewed" @update:reviewed="(sha, isReviewed) => emit('update:reviewed', sha, isReviewed)" />
        <div v-for="child in group.children" :key="child.key" class="pt-2 border-t border-base">
          <header class="text-sm px-1 pb-1 flex gap-2 items-center justify-between">
            <span class="font-medium truncate">{{ child.label }}</span>
            <span class="text-xs op-fade whitespace-nowrap">{{ child.files.length }} file{{ child.files.length === 1 ? '' : 's' }}</span>
          </header>
          <p v-if="child.summary" class="text-sm px-1 pb-1 op-fade">
            {{ child.summary }}
          </p>
          <FileTree :files="child.files" :reviewed="reviewed" @update:reviewed="(sha, isReviewed) => emit('update:reviewed', sha, isReviewed)" />
        </div>
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
        <template v-for="child in group.children" :key="child.key">
          <h3 class="text-sm font-medium">
            {{ child.label }}
          </h3>
          <FileDiff
            v-for="file in child.files"
            :key="file.sha"
            :file="file"
            :layout="layout"
            :reviewed="reviewed.has(file.sha)"
            @update:reviewed="isReviewed => emit('update:reviewed', file.sha, isReviewed)"
          />
        </template>
      </div>
    </div>
  </section>
</template>
