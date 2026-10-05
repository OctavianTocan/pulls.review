<script setup lang="ts">
import type { AiUsage } from '@pulls.review/core/local-rpc'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatClockDuration, formatCost, formatTokens } from './ai-format'

const props = defineProps<{
  /** What the run consumed, as its engine reported it. */
  usage?: AiUsage
  /** Wall time to show when the engine reported none. */
  durationMs?: number
}>()

const { t } = useI18n()

const parts = computed(() => {
  const usage = props.usage ?? {}
  const tokens = (key: string, count: number | undefined) => count ? t(`ai.usage.${key}`, { n: formatTokens(count) }) : undefined
  const duration = usage.durationMs ?? props.durationMs
  return [
    usage.model,
    tokens('input', usage.inputTokens),
    tokens('output', usage.outputTokens),
    tokens('cacheRead', usage.cacheReadTokens),
    tokens('cacheWrite', usage.cacheWriteTokens),
    tokens('reasoning', usage.reasoningTokens),
    // Codex reports no cost at all; an unset or zero cost is unknown, not free.
    usage.costUsd ? formatCost(usage.costUsd) : undefined,
    duration !== undefined && duration > 0 ? formatClockDuration(duration) : undefined,
  ].filter((part): part is string => !!part)
})
</script>

<template>
  <p v-if="parts.length" class="flex flex-wrap items-center gap-x-1.5 text-xs tabular-nums op-mute">
    <template v-for="(part, index) in parts" :key="index">
      <span v-if="index" aria-hidden="true">·</span>
      <span>{{ part }}</span>
    </template>
  </p>
</template>
