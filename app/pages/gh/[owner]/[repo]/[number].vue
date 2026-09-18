<script setup lang="ts">
import ActionButton from '@antfu/design/components/Action/ActionButton.vue'
import FeedbackEmptyState from '@antfu/design/components/Feedback/FeedbackEmptyState.vue'
import FeedbackLoading from '@antfu/design/components/Feedback/FeedbackLoading.vue'
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import DiffsPage from '../../../../components/diff/DiffsPage.vue'
import { layout } from '../../../../state/layout'
import { settings } from '../../../../state/settings'
import { createDiffsStore } from '../../../../stores/diffs-store'

const route = useRoute()

const params = computed(() => ({
  kind: 'github-pr' as const,
  owner: route.params.owner as string,
  repo: route.params.repo as string,
  number: route.params.number as string,
}))

const store = createDiffsStore(params.value, { token: settings.value.githubToken })

onMounted(() => store.load())
</script>

<template>
  <main>
    <DiffsPage
      :store="store"
      :layout="layout"
      @update:layout="layout = $event"
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
