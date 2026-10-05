<script setup lang="ts">
defineProps<{
  summary: string
}>()
</script>

<template>
  <div class="flex items-start gap-2 border-b border-base px-3 py-2 text-sm op-fade" :title="$t('critique.fileSummary')">
    <span class="i-ph:sparkle-duotone mt-0.5 shrink-0" aria-hidden="true" />
    <p class="min-w-0">
      {{ summary }}
    </p>
  </div>
</template>
