<script setup lang="ts">
import ActionButton from '@antfu/design/components/Action/ActionButton.vue'
import FeedbackEmptyState from '@antfu/design/components/Feedback/FeedbackEmptyState.vue'
import FeedbackLoading from '@antfu/design/components/Feedback/FeedbackLoading.vue'
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import DiffsPage from '../components/diff/DiffsPage.vue'
import { usePullRequest } from '../composables/usePullRequest'
import { useReviewedFiles } from '../composables/useReviewedFiles'
import { useSettings } from '../composables/useSettings'
import { useEmbedDark } from './dark'

// Mirrors `pages/gh/[owner]/[repo]/[number].vue`'s wiring, from plain props
// (custom-element attributes) instead of route params - there's no router here.
const props = defineProps<{
  owner: string
  repo: string
  number: string
}>()

const rootRef = useTemplateRef<HTMLDivElement>('root')
useEmbedDark(rootRef)

const { githubToken } = useSettings()

const layout = ref<'split' | 'unified'>('unified')

const params = computed(() => ({
  kind: 'github-pr' as const,
  owner: props.owner,
  repo: props.repo,
  number: props.number,
}))

const { diff, grouped, isLoading, error, isStale, load, refresh } = usePullRequest(params.value, { token: githubToken.value })
const { reviewed, load: loadReviewed, toggle } = useReviewedFiles()

async function loadAll() {
  await load()
  if (diff.value)
    await loadReviewed(diff.value.files.map(file => file.sha))
}

onMounted(loadAll)
watch(() => diff.value?.meta.id, (id, previousId) => {
  if (id && id !== previousId)
    loadReviewed(diff.value!.files.map(file => file.sha))
})
</script>

<template>
  <div ref="root">
    <DiffsPage
      :diff="diff"
      :grouped="grouped"
      :layout="layout"
      :reviewed="reviewed"
      :is-loading="isLoading"
      :error="error"
      :is-stale="isStale"
      @update:layout="layout = $event"
      @update:reviewed="(sha, isReviewed) => toggle(sha, isReviewed)"
      @retry="loadAll"
      @refresh="refresh"
    >
      <template #loading>
        <FeedbackLoading text="Loading pull request…" />
      </template>
      <template #error="{ error: err, retry }">
        <FeedbackEmptyState
          icon="i-ph:warning"
          title="Couldn't load this pull request"
        >
          <template #hint>
            {{ err.message }}
          </template>
          <template #actions>
            <ActionButton variant="primary" @click="retry">
              Retry
            </ActionButton>
          </template>
        </FeedbackEmptyState>
      </template>
    </DiffsPage>
  </div>
</template>
