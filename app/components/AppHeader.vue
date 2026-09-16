<script setup lang="ts">
import type { PullRequestState } from '../types/diff'
import ActionIconButton from '@antfu/design/components/Action/ActionIconButton.vue'
import DisplayBadge from '@antfu/design/components/Display/DisplayBadge.vue'
import DisplayDonut from '@antfu/design/components/Display/DisplayDonut.vue'
import { computed, ref } from 'vue'
import { usePrNavContext } from '../composables/usePrNavContext'
import DarkToggle from './DarkToggle.vue'
import LoadDiffModal from './load/LoadDiffModal.vue'
import SettingsModal from './settings/SettingsModal.vue'

const settingsOpen = ref(false)
const loadDiffOpen = ref(false)

const prNav = usePrNavContext()

const STATE_COLOR: Record<PullRequestState, string> = {
  open: 'green',
  draft: 'gray',
  closed: 'red',
  merged: 'purple',
}

const reviewProgress = computed(() => {
  if (!prNav.value || prNav.value.totalFiles === 0)
    return 1
  return prNav.value.reviewedCount / prNav.value.totalFiles
})
</script>

<template>
  <header class="px-4 border-b border-base bg-base flex gap-3 h-14 items-center top-0 sticky z-nav">
    <NuxtLink to="/" class="text-lg font-semibold shrink-0">
      Diffs
    </NuxtLink>

    <div v-if="prNav" class="text-sm flex flex-1 gap-3 min-w-0 items-center">
      <component
        :is="prNav.url ? 'a' : 'span'"
        :href="prNav.url"
        target="_blank"
        rel="noopener"
        class="font-medium truncate"
        :class="{ 'hover:underline': prNav.url }"
      >
        {{ prNav.title }}
      </component>
      <DisplayBadge v-if="prNav.state" :text="prNav.state" :color="STATE_COLOR[prNav.state]" class="shrink-0" />
      <div class="shrink-0 gap-1.5 hidden items-center sm:flex" :title="`${prNav.reviewedCount} / ${prNav.totalFiles} files reviewed`">
        <DisplayDonut :value="reviewProgress" :size="22" :thickness="3" />
        <span class="text-xs op-fade whitespace-nowrap">{{ prNav.reviewedCount }}/{{ prNav.totalFiles }}</span>
      </div>
      <span class="text-xs shrink-0 whitespace-nowrap">
        <span class="color-success-500">+{{ prNav.additions }}</span>
        <span class="color-error-500 ml-1">-{{ prNav.deletions }}</span>
      </span>
    </div>
    <div v-else class="flex-1" />

    <div class="flex shrink-0 gap-1 items-center">
      <ActionIconButton icon="i-ph:upload-simple" label="Load a diff" tooltip="Load a diff" @click="loadDiffOpen = true" />
      <ActionIconButton icon="i-ph:gear" label="Settings" tooltip="Settings" @click="settingsOpen = true" />
      <DarkToggle />
    </div>
    <SettingsModal v-model:open="settingsOpen" />
    <LoadDiffModal v-model:open="loadDiffOpen" />
  </header>
</template>
