<script setup lang="ts">
import ActionButton from '@antfu/design/components/Action/ActionButton.vue'
import FeedbackEmptyState from '@antfu/design/components/Feedback/FeedbackEmptyState.vue'
import FeedbackLoading from '@antfu/design/components/Feedback/FeedbackLoading.vue'
import { onMounted, ref } from 'vue'
import { navigateTo } from '#imports'
import DiffView from '../components/diff/DiffView.vue'
import { UPLOAD_SESSION_STORAGE_KEY } from '../composables/uploadSession'
import { usePullRequest } from '../composables/usePullRequest'
import { useReviewedFiles } from '../composables/useReviewedFiles'

const layout = ref<'split' | 'unified'>('unified')
const hasPending = ref(false)

const pending = (() => {
  const raw = sessionStorage.getItem(UPLOAD_SESSION_STORAGE_KEY)
  if (!raw)
    return undefined
  return JSON.parse(raw) as { text: string, title?: string }
})()

const { diff, grouped, isLoading, error, load } = usePullRequest(
  pending ? { kind: 'patch-text', text: pending.text, title: pending.title } : { kind: 'patch-text', text: '' },
)
const { reviewed, load: loadReviewed, toggle } = useReviewedFiles()

onMounted(async () => {
  if (!pending) {
    hasPending.value = false
    return
  }
  hasPending.value = true
  await load()
  if (diff.value)
    await loadReviewed(diff.value.files.map(file => file.sha))
})
</script>

<template>
  <main class="mx-auto px-4 py-6 w-full">
    <FeedbackEmptyState
      v-if="!hasPending"
      icon="i-ph:upload-simple"
      title="No diff loaded"
    >
      <template #hint>
        Go to the home page and use the upload button to paste or drop a diff.
      </template>
      <template #actions>
        <ActionButton variant="primary" @click="navigateTo('/')">
          Go home
        </ActionButton>
      </template>
    </FeedbackEmptyState>
    <FeedbackLoading v-else-if="isLoading && !diff" text="Parsing diff…" />
    <FeedbackEmptyState
      v-else-if="error"
      icon="i-ph:warning"
      title="Couldn't parse this diff"
    >
      <template #hint>
        {{ error.message }}
      </template>
    </FeedbackEmptyState>
    <DiffView
      v-else-if="diff && grouped"
      :diff="diff"
      :grouped="grouped"
      :layout="layout"
      :reviewed="reviewed"
      @update:layout="layout = $event"
      @update:reviewed="(sha, isReviewed) => toggle(sha, isReviewed)"
    />
  </main>
</template>
