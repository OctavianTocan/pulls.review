<script setup lang="ts">
import ActionIconButton from '@antfu/design/components/Action/ActionIconButton.vue'

defineProps<{
  showThreads: boolean
}>()

defineEmits<{
  'update:showThreads': [value: boolean]
}>()
</script>

<template>
  <ActionIconButton
    class="shrink-0"
    :class="showThreads ? '' : 'op-fade'"
    :icon="showThreads ? 'i-ph:chats-duotone' : 'i-ph:chats'"
    :label="showThreads ? 'Hide review comments' : 'Show review comments'"
    :tooltip="showThreads ? 'Hide review comments' : 'Show review comments'"
    @click="$emit('update:showThreads', !showThreads)"
  />
</template>
