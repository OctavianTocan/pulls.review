<script setup lang="ts">
import type { PrChecksSummary } from '@pulls.review/core/github'
import { CHECKS_ICON } from './status-icons'

defineProps<{
  summary: PrChecksSummary
}>()
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 text-xs font-mono"
    :aria-label="$t('overview.checks.summary', { passing: summary.passing, failing: summary.failing, pending: summary.pending })"
  >
    <span v-if="summary.passing" class="inline-flex items-center gap-0.5"><span :class="CHECKS_ICON.success" aria-hidden="true" />{{ summary.passing }}</span>
    <span v-if="summary.failing" class="inline-flex items-center gap-0.5"><span :class="CHECKS_ICON.failure" aria-hidden="true" />{{ summary.failing }}</span>
    <span v-if="summary.pending" class="inline-flex items-center gap-0.5"><span :class="CHECKS_ICON.pending" class="text-[0.6em]" aria-hidden="true" />{{ summary.pending }}</span>
  </span>
</template>
