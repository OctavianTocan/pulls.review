<script setup lang="ts">
import { useRouter } from 'vue-router'
import { UPLOAD_SESSION_STORAGE_KEY } from '../../composables/uploadSession'
import AppModal from '../AppModal.vue'
import LoadDiffPanel from './LoadDiffPanel.vue'

defineProps<{
  open: boolean
  hostContainer?: Document | ShadowRoot
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
}>()

const router = useRouter()

function handleSubmit(text: string, title?: string) {
  sessionStorage.setItem(UPLOAD_SESSION_STORAGE_KEY, JSON.stringify({ text, title }))
  emit('update:open', false)
  router.push('/upload')
}
</script>

<template>
  <AppModal
    title="Load a diff"
    description="Paste or drop a unified diff / .patch file to review it."
    :open="open"
    :host-container="hostContainer"
    @update:open="emit('update:open', $event ?? false)"
  >
    <LoadDiffPanel @submit="handleSubmit" />
  </AppModal>
</template>
