<script setup lang="ts">

</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
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
