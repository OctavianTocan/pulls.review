<script setup lang="ts">
import ActionButton from '@antfu/design/components/Action/ActionButton.vue'
import FeedbackEmptyState from '@antfu/design/components/Feedback/FeedbackEmptyState.vue'
import FeedbackLoading from '@antfu/design/components/Feedback/FeedbackLoading.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from '#imports'
import DiffView from '../../../../components/diff/DiffView.vue'
import { usePullRequest } from '../../../../composables/usePullRequest'
import { useReviewedFiles } from '../../../../composables/useReviewedFiles'
import { useSettings } from '../../../../composables/useSettings'

const route = useRoute('gh-owner-repo-number')
const { githubToken } = useSettings()

const layout = ref<'split' | 'unified'>('unified')

const params = computed(() => ({
  kind: 'github-pr' as const,
  owner: route.params.owner as string,
  repo: route.params.repo as string,
  number: route.params.number as string,
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
  <div>
    <FeedbackLoading v-if="isLoading && !diff" text="Loading pull request…" />
    <FeedbackEmptyState
      v-else-if="error"
      icon="i-ph:warning"
      title="Couldn't load this pull request"
    >
      <template #hint>
        {{ error.message }}
      </template>
      <template #actions>
        <ActionButton variant="primary" @click="loadAll">
          Retry
        </ActionButton>
      </template>
    </FeedbackEmptyState>
    <template v-else-if="diff && grouped">
      <div v-if="isStale" class="text-sm mb-4 px-3 py-2 border border-base rounded-lg bg-raised flex gap-3 items-center justify-between">
        <span>This pull request has new commits since it was cached.</span>
        <ActionButton size="sm" @click="refresh">
          Refresh
        </ActionButton>
      </div>
      <DiffView
        :diff="diff"
        :grouped="grouped"
        :layout="layout"
        :reviewed="reviewed"
        @update:layout="layout = $event"
        @update:reviewed="(sha, isReviewed) => toggle(sha, isReviewed)"
      />
    </template>
  </div>
</template>
