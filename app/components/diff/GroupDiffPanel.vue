<script setup lang="ts">
import type { ResolvedGroupWithChildren } from './group-utils'
import ActionIconButton from '@antfu/design/components/Action/ActionIconButton.vue'
import FileDiff from './FileDiff.vue'

defineProps<{
  group: ResolvedGroupWithChildren
  layout: 'split' | 'unified'
  reviewed: Set<string>
  collapsed: boolean
}>()

const emit = defineEmits<{
  'update:reviewed': [sha: string, reviewed: boolean]
  'toggle': []
}>()
</script>

<template>
  <section class="border border-base rounded-lg overflow-hidden">
    <header class="flex w-full">
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
        <span class="text-xs ml-auto op-fade">{{ group.files.length + group.children.reduce((n, c) => n + c.files.length, 0) }} file{{ group.files.length === 1 ? '' : 's' }}</span>
        <span class="text-xs whitespace-nowrap">
          <span class="color-success-500">+{{ group.added + group.children.reduce((n, c) => n + c.added, 0) }}</span>
          <span class="color-error-500 ml-1">-{{ group.deleted + group.children.reduce((n, c) => n + c.deleted, 0) }}</span>
        </span>
      </button>
    </header>
    <div v-if="!collapsed" class="p-3 flex flex-col gap-3">
      <p v-if="group.summary" class="text-sm op-fade">
        {{ group.summary }}
      </p>
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
  </section>
</template>
