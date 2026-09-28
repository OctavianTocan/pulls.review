<script setup lang="ts">
import NavControls from './NavControls.vue'
</script>

<template>
  <header class="px-4 border-b border-base bg-base flex gap-3 h-14 items-center top-0 sticky z-nav">
    <RouterLink to="/" class="text-lg font-semibold shrink-0">
      pulls.review
    </RouterLink>

    <div class="flex-1" />

    <NavControls />
  </header>
</template>
