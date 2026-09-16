<script setup lang="ts">
import type { DiffGroup } from '../../types/analyze'
import type { FileChange } from '../../types/diff'
import ActionIconButton from '@antfu/design/components/Action/ActionIconButton.vue'
import { computed } from 'vue'
import FileTree from './FileTree.vue'
import { resolveGroups } from './group-utils'

const props = defineProps<{
  groups: DiffGroup[]
  files: FileChange[]
  reviewed: Set<string>
  collapsedGroups: Set<string>
}>()

const emit = defineEmits<{
  'update:reviewed': [sha: string, reviewed: boolean]
  'toggleGroup': [key: string]
}>()

const resolvedGroups = computed(() => resolveGroups(props.groups, props.files))
</script>

<template>
  <div class="flex flex-col gap-2">
    <section v-for="resolved in resolvedGroups" :key="resolved.key" class="border border-base rounded-lg overflow-hidden">
      <header class="flex w-full">
        <button
          type="button"
          class="text-sm px-2 py-1.5 bg-raised flex flex-1 gap-2 min-w-0 items-center hover:bg-active"
          :aria-expanded="!collapsedGroups.has(resolved.key)"
          @click="emit('toggleGroup', resolved.key)"
        >
          <ActionIconButton
            compact
            :icon="collapsedGroups.has(resolved.key) ? 'i-ph:caret-right' : 'i-ph:caret-down'"
            label="Toggle group"
            as="span"
          />
          <span class="font-medium truncate">{{ resolved.label }}</span>
          <span class="text-xs ml-auto op-fade shrink-0">{{ resolved.files.length }} file{{ resolved.files.length === 1 ? '' : 's' }}</span>
          <span class="text-xs shrink-0 whitespace-nowrap">
            <span class="color-success-500">+{{ resolved.added }}</span>
            <span class="color-error-500 ml-1">-{{ resolved.deleted }}</span>
          </span>
        </button>
      </header>
      <template v-if="!collapsedGroups.has(resolved.key)">
        <p v-if="resolved.summary" class="text-sm px-3 py-1.5 op-fade">
          {{ resolved.summary }}
        </p>
        <FileTree :files="resolved.files" :reviewed="reviewed" @update:reviewed="(...args) => emit('update:reviewed', ...args)" />
        <div v-for="child in resolved.children" :key="child.key" class="pl-3 border-t border-base">
          <header class="text-sm px-2 py-1.5 flex gap-2 items-center justify-between">
            <span class="font-medium truncate">{{ child.label }}</span>
            <span class="text-xs op-fade whitespace-nowrap">{{ child.files.length }} file{{ child.files.length === 1 ? '' : 's' }}</span>
          </header>
          <FileTree :files="child.files" :reviewed="reviewed" @update:reviewed="(...args) => emit('update:reviewed', ...args)" />
        </div>
      </template>
    </section>
  </div>
</template>
