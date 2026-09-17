<script setup lang="ts">
import ActionButton from '@antfu/design/components/Action/ActionButton.vue'
import FeedbackEmptyState from '@antfu/design/components/Feedback/FeedbackEmptyState.vue'
import FeedbackLoading from '@antfu/design/components/Feedback/FeedbackLoading.vue'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import DiffsPage from '../components/diff/DiffsPage.vue'
import { UPLOAD_SESSION_STORAGE_KEY } from '../composables/uploadSession'
import { usePullRequest } from '../composables/usePullRequest'
import { useReviewedFiles } from '../composables/useReviewedFiles'
import { layout } from '../state/layout'

const router = useRouter()
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

async function loadAll() {
  if (!pending) {
    hasPending.value = false
    return
  }
  hasPending.value = true
  await load()
  if (diff.value)
    await loadReviewed(diff.value.files.map(file => file.sha))
}

onMounted(loadAll)
</script>

<template>
  <main>
    <DiffsPage
      :diff="diff"
      :grouped="grouped"
      :layout="layout"
      :reviewed="reviewed"
      :is-loading="isLoading"
      :error="error"
      @update:layout="layout = $event"
      @update:reviewed="(sha, isReviewed) => toggle(sha, isReviewed)"
      @retry="loadAll"
    >
      <template #loading>
        <FeedbackLoading text="Parsing diff…" />
      </template>
      <template #error="{ error: err }">
        <FeedbackEmptyState
          icon="i-ph:warning"
          title="Couldn't parse this diff"
        >
          <template #hint>
            {{ err.message }}
          </template>
        </FeedbackEmptyState>
      </template>
      <template #empty>
        <FeedbackEmptyState
          icon="i-ph:upload-simple"
          title="No diff loaded"
        >
          <template #hint>
            Go to the home page and use the upload button to paste or drop a diff.
          </template>
          <template #actions>
            <ActionButton variant="primary" @click="router.push('/')">
              Go home
            </ActionButton>
          </template>
        </FeedbackEmptyState>
      </template>
    </DiffsPage>
  </main>
</template>
