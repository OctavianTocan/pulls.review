<script setup lang="ts">
defineProps<{
  additions: number
  deletions: number
}>()
</script>

<template>
  <span class="text-xs whitespace-nowrap">
    <span class="color-success-500">+{{ additions }}</span>
    <span class="color-error-500 ml-1">-{{ deletions }}</span>
  </span>
</template>
