<script setup lang="ts">
import ActionButton from '@antfu/design/components/Action/ActionButton.vue'
import DisplayNumberBadge from '@antfu/design/components/Display/DisplayNumberBadge.vue'

defineProps<{
  pendingCommentCount: number
}>()

defineEmits<{
  review: []
}>()
</script>

<template>
  <div class="shrink-0 relative">
    <ActionButton size="sm" variant="action" icon="i-ph:chat-centered-text-duotone" @click="$emit('review')">
      Add Review
    </ActionButton>
    <DisplayNumberBadge v-if="pendingCommentCount > 0" :value="pendingCommentCount" class="right--2 top--2 absolute" />
  </div>
</template>
