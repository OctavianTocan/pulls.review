<script setup lang="ts">
import ActionButton from '@antfu/design/components/Action/ActionButton.vue'
import FeedbackEmptyState from '@antfu/design/components/Feedback/FeedbackEmptyState.vue'
import FeedbackLoading from '@antfu/design/components/Feedback/FeedbackLoading.vue'
import { computed, onMounted, watch } from 'vue'
import DiffsPage from '../components/diff/DiffsPage.vue'
import { usePullRequest } from '../composables/usePullRequest'
import { useReviewedFiles } from '../composables/useReviewedFiles'
import { layout } from '../state/layout'
import { settings } from '../state/settings'

// Mirrors `pages/gh/[owner]/[repo]/[number].vue`'s wiring, from plain props instead of
// route params - there's no router here. `EmbedApp.ce.vue` gives this a `:key` per PR,
// so a fresh instance (and fresh `usePullRequest` call) is created per navigation,
// same as the routed page getting a fresh mount per route change.
const props = defineProps<{
  document?: Document | ShadowRoot
  owner: string
  repo: string
  number: string
}>()

const params = computed(() => ({
  kind: 'github-pr' as const,
  owner: props.owner,
  repo: props.repo,
  number: props.number,
}))

const { diff, grouped, isLoading, error, isStale, analyzeMode, isAnalyzing, llmAvailable, hasAiResult, load, refresh, setAnalyzeMode, reanalyzeWithAi } = usePullRequest(params.value, { token: settings.value.githubToken })
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
  <DiffsPage
    :document
    :diff="diff"
    :grouped="grouped"
    :layout="layout"
    :reviewed="reviewed"
    :is-loading="isLoading"
    :error="error"
    :is-stale="isStale"
    :is-embedded="true"
    :analyze-mode="analyzeMode"
    :is-analyzing="isAnalyzing"
    :llm-available="llmAvailable"
    :has-ai-result="hasAiResult"
    @update:layout="layout = $event"
    @update:reviewed="(sha, isReviewed) => toggle(sha, isReviewed)"
    @update:analyze-mode="setAnalyzeMode"
    @reanalyze-ai="reanalyzeWithAi"
    @retry="loadAll"
    @refresh="refresh"
  >
    <template #loading>
      <FeedbackLoading text="Loading pull request…" />
    </template>
    <template #error="{ error: err, retry }">
      <FeedbackEmptyState
        icon="i-ph:warning-duotone"
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
</template>
