<script setup lang="ts">
import ActionIconButton from '@antfu/design/components/Action/ActionIconButton.vue'
import { ref } from 'vue'
import DarkToggle from './DarkToggle.vue'
import LoadDiffModal from './load/LoadDiffModal.vue'
import SettingsModal from './settings/SettingsModal.vue'

const settingsOpen = ref(false)
const loadDiffOpen = ref(false)
</script>

<template>
  <header class="px-4 border-b border-base bg-base flex gap-3 h-14 items-center top-0 sticky z-nav">
    <NuxtLink to="/" class="text-lg font-semibold shrink-0">
      Diffs
    </NuxtLink>

    <div class="flex-1" />

    <div class="flex shrink-0 gap-1 items-center">
      <ActionIconButton icon="i-ph:upload-simple" label="Load a diff" tooltip="Load a diff" @click="loadDiffOpen = true" />
      <ActionIconButton icon="i-ph:gear" label="Settings" tooltip="Settings" @click="settingsOpen = true" />
      <DarkToggle />
    </div>
    <SettingsModal v-model:open="settingsOpen" />
    <LoadDiffModal v-model:open="loadDiffOpen" />
  </header>
</template>
