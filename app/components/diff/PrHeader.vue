<script setup lang="ts">
import type { DiffsPayload } from '../../types/diff'
import { ref } from 'vue'

defineProps<{
  meta: DiffsPayload
}>()

// Default collapsed: the description is usually long prose and secondary to the
// file tree/diffs, which should be visible without scrolling past it first.
const descriptionOpen = ref(false)
</script>

<template>
  <header class="flex flex-col gap-1">
    <h1 class="text-lg font-semibold break-words">
      {{ meta.title }}
    </h1>
    <div class="text-sm op-fade flex flex-wrap gap-x-3 gap-y-1 items-center">
      <span v-if="meta.pullRequest?.author">by {{ meta.pullRequest.author }}</span>
      <span v-if="meta.base && meta.head" class="font-mono">{{ meta.base.ref }} ← {{ meta.head.ref }}</span>
      <a v-if="meta.url" :href="meta.url" target="_blank" rel="noopener" class="hover:underline">View on GitHub</a>
    </div>
    <template v-if="meta.description">
      <button
        type="button"
        class="text-sm color-muted mt-1 flex gap-1 items-center hover:color-base"
        :aria-expanded="descriptionOpen"
        @click="descriptionOpen = !descriptionOpen"
      >
        <span :class="descriptionOpen ? 'i-ph:caret-down' : 'i-ph:caret-right'" aria-hidden="true" />
        Description
      </button>
      <p v-if="descriptionOpen" class="text-sm whitespace-pre-wrap">
        {{ meta.description }}
      </p>
    </template>
  </header>
</template>
