<script setup lang="ts">
import type { FileChangeStatus } from '../../types/diff'

defineProps<{
  status: FileChangeStatus
}>()

const LETTER: Record<FileChangeStatus, string> = {
  added: 'A',
  removed: 'D',
  modified: 'M',
  renamed: 'R',
  copied: 'C',
}

const COLOR_CLASS: Record<FileChangeStatus, string> = {
  added: 'color-success-500',
  removed: 'color-error-500',
  modified: 'color-warning-500',
  renamed: 'color-blue-500',
  copied: 'color-blue-500',
}
</script>

<template>
  <span
    class="text-xs font-bold font-mono inline-flex shrink-0 w-4 items-center justify-center"
    :class="COLOR_CLASS[status]"
    :title="status"
  >{{ LETTER[status] }}</span>
</template>
