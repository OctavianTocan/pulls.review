<script setup lang="ts">
import AppHeader from '../components/AppHeader.vue'
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <AppHeader />
    <main class="mx-auto px-4 py-6 flex-1 w-full">
      <slot />
    </main>
  </div>
</template>
