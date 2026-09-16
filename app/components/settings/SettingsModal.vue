<script setup lang="ts">
import { useSettings } from '../../composables/useSettings'
import AppModal from '../AppModal.vue'
import SettingsPanel from './SettingsPanel.vue'

defineProps<{
  open: boolean
  hostContainer?: Document | ShadowRoot
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
}>()

const { githubToken } = useSettings()
</script>

<template>
  <AppModal
    title="Settings"
    :open="open"
    :host-container="hostContainer"
    @update:open="emit('update:open', $event ?? false)"
  >
    <SettingsPanel v-model="githubToken" />
  </AppModal>
</template>
