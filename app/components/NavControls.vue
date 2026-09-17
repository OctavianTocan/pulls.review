<script setup lang="ts">
import ActionIconButton from '@antfu/design/components/Action/ActionIconButton.vue'
import { ref } from 'vue'
import DarkToggle from './DarkToggle.vue'
import SettingsModal from './settings/SettingsModal.vue'

defineProps<{
  document?: Document | ShadowRoot
}>()

const settingsOpen = ref(false)
</script>

<template>
  <div class="flex shrink-0 gap-1 items-center">
    <ActionIconButton icon="i-ph:gear-duotone" label="Settings" tooltip="Settings" @click="settingsOpen = true" />
    <DarkToggle />
  </div>
  <SettingsModal v-model:open="settingsOpen" :document="document" />
</template>
