<script setup lang="ts">
import { useHead } from '#imports'
import { isDark } from '~/state/dark'

useHead({
  meta: [{
    id: 'theme-color',
    name: 'theme-color',
    content: () => isDark.value ? '#222222' : '#ffffff',
  }],
})

function toggleDark() {
  isDark.value = !isDark.value
}
</script>

<template>
  <button class="!outline-none" @click="toggleDark">
    <div class="i-carbon-sun dark:i-carbon-moon" />
  </button>
</template>
