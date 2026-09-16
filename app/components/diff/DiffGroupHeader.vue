<script setup lang="ts">
import ActionIconButton from '@antfu/design/components/Action/ActionIconButton.vue'
import DisplayDonut from '@antfu/design/components/Display/DisplayDonut.vue'
import { computed } from 'vue'
import DiffStats from './DiffStats.vue'

const props = defineProps<{
  label: string
  summary?: string
  collapsed: boolean
  added: number
  deleted: number
  totalFiles: number
  reviewedCount: number
  /** Nested (child) group headers don't stick - only top-level ones act as scroll nav. */
  sticky?: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()

const progress = computed(() => props.totalFiles === 0 ? 1 : props.reviewedCount / props.totalFiles)
</script>

<template>
  <header class="bg-base flex w-full items-center" :class="{ 'top-14 z-[20] sticky': sticky }">
    <button
      type="button"
      class="text-sm px-2 py-1 flex flex-1 min-w-0 items-start"
      :aria-expanded="!collapsed"
      @click="emit('toggle')"
    >
      <ActionIconButton
        compact
        class="ml--5 py1.5 op-mute hover:op-100"
        :icon="collapsed ? 'i-ph:caret-right' : 'i-ph:caret-down'"
        label="Toggle group"
        as="span"
      />
      <div class="flex-1 min-w-0">
        <div class="leading-1em flex gap-2 items-center">
          <span class="text-xl font-medium">{{ label }}</span>
          <div class="flex shrink-0 items-center" :title="`${reviewedCount} / ${totalFiles} files reviewed`">
            <DisplayDonut :value="progress" :size="16" :thickness="2.5" />
          </div>
          <div v-if="summary && collapsed" class="op-mute ws-nowrap text-ellipsis overflow-hidden">
            {{ summary }}
          </div>
        </div>
        <div class="leading-1em flex gap-2 items-center">
          <DiffStats :additions="added" :deletions="deleted" />
          <span class="text-xs op-fade">{{ totalFiles }} file{{ totalFiles === 1 ? '' : 's' }}</span>
        </div>
      </div>
    </button>
    <div v-if="$slots.actions" class="px-2 flex shrink-0 gap-1 items-center">
      <slot name="actions" />
    </div>
  </header>
</template>
