<script setup lang="ts">
import OverlayModal from '@antfu/design/components/Overlay/OverlayModal.vue'
import { useSettings } from '../../composables/useSettings'
import SettingsPanel from './SettingsPanel.vue'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
}>()

const { githubToken } = useSettings()
</script>

<template>
  <OverlayModal
    title="Settings"
    :open="open"
    @update:open="emit('update:open', $event ?? false)"
  >
    <SettingsPanel v-model="githubToken" />
  </OverlayModal>
</template>
