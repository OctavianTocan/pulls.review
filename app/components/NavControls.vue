<script setup lang="ts">
import ActionIconButton from '@antfu/design/components/Action/ActionIconButton.vue'
import { ref } from 'vue'
import DarkToggle from './DarkToggle.vue'
import LoadDiffModal from './load/LoadDiffModal.vue'
import SettingsModal from './settings/SettingsModal.vue'

defineProps<{
  /** "Load a diff" only makes sense from the home page - PR/upload reading views don't get it. */
  loadDiff?: boolean
  hostContainer?: Document | ShadowRoot
}>()

const settingsOpen = ref(false)
const loadDiffOpen = ref(false)
</script>

<template>
  <div class="flex shrink-0 gap-1 items-center">
    <ActionIconButton v-if="loadDiff" icon="i-ph:upload-simple" label="Load a diff" tooltip="Load a diff" @click="loadDiffOpen = true" />
    <ActionIconButton icon="i-ph:gear" label="Settings" tooltip="Settings" @click="settingsOpen = true" />
    <DarkToggle />
  </div>
  <SettingsModal v-model:open="settingsOpen" :host-container="hostContainer" />
  <LoadDiffModal v-if="loadDiff" v-model:open="loadDiffOpen" :host-container="hostContainer" />
</template>
