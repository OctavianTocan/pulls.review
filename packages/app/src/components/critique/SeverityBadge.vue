<script setup lang="ts">
import type { CritiqueSeverity } from '@pulls.review/core/types'

defineProps<{
  severity: CritiqueSeverity
}>()

const BADGE_CLASS: Record<CritiqueSeverity, string> = {
  bug: 'badge-color-red',
  risk: 'badge-color-amber',
  nit: 'badge-color-gray',
}
</script>

<template>
  <span class="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-xs font-medium leading-none" :class="BADGE_CLASS[severity]">
    {{ $t(`critique.severity.${severity}`) }}
  </span>
</template>
