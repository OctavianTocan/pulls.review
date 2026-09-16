<script setup lang="ts">
import AppHeader from './components/AppHeader.vue'
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <!-- TODO: AppHeader should only be in pages/index.vue, keep this root app simple -->
    <AppHeader />
    <main class="mx-auto px-4 py-6 flex-1 w-full">
      <NuxtPage />
    </main>
  </div>
</template>

<style>
/* TODO: extract this to a separate CSS file */
html,
body,
#__nuxt {
  height: 100vh;
  margin: 0;
  padding: 0;
}

html {
  /* Always reserve the scrollbar's width, even on short pages, so content doesn't
     shift horizontally when navigating between pages that do/don't need to scroll. */
  scrollbar-gutter: stable;
}

html.dark {
  color-scheme: dark;
}
</style>
