<script setup lang="ts">
defineProps<{
  additions: number | undefined
  deletions: number | undefined
}>()
</script>

<template>
  <span class="text-xs whitespace-nowrap tabular-nums">
    <span v-if="additions" class="color-success-500">+{{ additions }}</span>
    <span v-if="deletions" class="color-error-500 ml-1">-{{ deletions }}</span>
  </span>
</template>
