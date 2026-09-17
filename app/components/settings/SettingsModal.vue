<script setup lang="ts">
import { githubToken } from '../../state/settings'
import AppModal from '../AppModal.vue'
import SettingsPanel from './SettingsPanel.vue'

defineProps<{
  open: boolean
  document?: Document | ShadowRoot
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
}>()
</script>

<template>
  <AppModal
    title="Settings"
    :open="open"
    :document="document"
    @update:open="emit('update:open', $event ?? false)"
  >
    <SettingsPanel v-model="githubToken" />
  </AppModal>
</template>
