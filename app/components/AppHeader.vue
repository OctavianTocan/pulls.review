<script setup lang="ts">
import ActionIconButton from '@antfu/design/components/Action/ActionIconButton.vue'
import { useEventListener } from '@vueuse/core'
import { ref } from 'vue'
import NavControls from './NavControls.vue'

const props = defineProps<{
  document?: Document | ShadowRoot
}>()

const scrollY = ref(0)
useEventListener(() => props.document ?? document, 'scroll', (event) => {
  scrollY.value = event.target instanceof Element ? event.target.scrollTop : window.scrollY
}, { capture: true })
</script>

<template>
  <header class="px-4 border-b bg-base bg-glass flex gap-3 h-14 transition-all items-center top-0 sticky z-nav" :class="scrollY > 10 ? 'border-base' : 'border-transparent'">
    <RouterLink to="/" class="text-lg font-mono shrink-0">
      <span class="color-accent-magenta">+</span>pulls<span class="color-accent-orange">.</span><span class="color-accent-teal">review</span>
    </RouterLink>

    <div class="flex-1" />

    <NavControls>
      <ActionIconButton
        href="https://github.com/antfu/pulls.review"
        target="_blank"
        rel="noopener"
        icon="i-carbon-logo-github"
        label="GitHub repository"
        tooltip="GitHub"
      />
    </NavControls>
  </header>
</template>
