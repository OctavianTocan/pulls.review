<script setup lang="ts">
import ActionIconButton from '@antfu/design/components/Action/ActionIconButton.vue'
import { settingsModalOpen } from '../state/settingsModal'
import DarkToggle from './DarkToggle.vue'
import SettingsModal from './settings/SettingsModal.vue'

defineProps<{
  document?: Document | ShadowRoot
}>()
</script>

<template>
  <div class="flex shrink-0 gap-1 items-center">
    <ActionIconButton icon="i-ph:gear-duotone" label="Settings" tooltip="Settings" @click="settingsModalOpen = true" />
    <DarkToggle />
  </div>
  <SettingsModal v-model:open="settingsModalOpen" :document="document" />
</template>
