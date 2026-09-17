<script setup lang="ts">
import ActionButton from '@antfu/design/components/Action/ActionButton.vue'
import FeedbackEmptyState from '@antfu/design/components/Feedback/FeedbackEmptyState.vue'
import FeedbackLoading from '@antfu/design/components/Feedback/FeedbackLoading.vue'
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import DiffsPage from '../../../../components/diff/DiffsPage.vue'
import { usePullRequest } from '../../../../composables/usePullRequest'
import { useReviewedFiles } from '../../../../composables/useReviewedFiles'
import { layout } from '../../../../state/layout'
import { settings } from '../../../../state/settings'

const route = useRoute()

const params = computed(() => ({
  kind: 'github-pr' as const,
  owner: route.params.owner as string,
  repo: route.params.repo as string,
  number: route.params.number as string,
}))

const { diff, grouped, isLoading, error, isStale, load, refresh } = usePullRequest(params.value, { token: settings.value.githubToken })
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
  <main>
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
  </main>
</template>
