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
  <header class="px-4 py-2 border-b border-base flex gap-2 items-center justify-between">
    <NuxtLink to="/" class="text-lg font-semibold">
      Diffs
    </NuxtLink>
    <div class="flex gap-1 items-center">
      <ActionIconButton icon="i-ph:upload-simple" label="Load a diff" tooltip="Load a diff" @click="loadDiffOpen = true" />
      <ActionIconButton icon="i-ph:gear" label="Settings" tooltip="Settings" @click="settingsOpen = true" />
      <DarkToggle />
    </div>
    <SettingsModal v-model:open="settingsOpen" />
    <LoadDiffModal v-model:open="loadDiffOpen" />
  </header>
</template>
