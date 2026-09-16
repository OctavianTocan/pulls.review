<script setup lang="ts">
// GitHub serves any user/org's avatar at this predictable URL - no API call or extra
// schema field needed.
withDefaults(defineProps<{
  login: string
  size?: number
}>(), { size: 20 })
</script>

<template>
  <img
    :src="`https://github.com/${login}.png?size=${size * 2}`"
    :width="size"
    :height="size"
    :alt="`${login}'s avatar`"
    class="rounded-full shrink-0"
  >
</template>
