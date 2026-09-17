<script setup lang="ts">
import type { GroupedResult, GroupSource } from '../../types/analyze'
import type { PullRequestDiff } from '../../types/diff'
import ActionButton from '@antfu/design/components/Action/ActionButton.vue'
import FeedbackEmptyState from '@antfu/design/components/Feedback/FeedbackEmptyState.vue'
import FeedbackLoading from '@antfu/design/components/Feedback/FeedbackLoading.vue'
import { useEventListener } from '@vueuse/core'
import { computed, ref } from 'vue'
import DiffGroup from './DiffGroup.vue'
import DiffsHeader from './DiffsHeader.vue'
import { resolveGroups } from './group-utils'

const props = defineProps<{
  document?: Document | ShadowRoot
  diff?: PullRequestDiff
  grouped?: GroupedResult
  layout: 'split' | 'unified'
  reviewed: Set<string>
  isLoading?: boolean
  error?: Error
  isEmbedded?: boolean
  // Only meaningful once `diff`/`grouped` are loaded - a source with no live
  // origin (paste) just never sets this.
  isStale?: boolean
  analyzeMode: GroupSource
  isAnalyzing?: boolean
  llmAvailable: boolean
  hasAiResult: boolean
}>()

const emit = defineEmits<{
  'update:reviewed': [sha: string, reviewed: boolean]
  'update:layout': [layout: 'split' | 'unified']
  'update:analyzeMode': [mode: GroupSource]
  'reanalyzeAi': []
  'retry': []
  'refresh': []
}>()

const reviewedCount = computed(() => props.diff?.files.filter(file => props.reviewed.has(file.sha)).length ?? 0)
const totalAdditions = computed(() => props.diff?.files.reduce((sum, file) => sum + file.additions, 0) ?? 0)
const totalDeletions = computed(() => props.diff?.files.reduce((sum, file) => sum + file.deletions, 0) ?? 0)

const resolvedGroups = computed(() => props.diff && props.grouped ? resolveGroups(props.grouped.groups, props.diff.files) : [])

// Each DiffGroup collapses itself (both its tree and its diffs together) - all
// expanded by default.
const collapsedGroups = ref(new Set<string>())
function toggleGroup(key: string) {
  const next = new Set(collapsedGroups.value)
  if (next.has(key))
    next.delete(key)
  else
    next.add(key)
  collapsedGroups.value = next
}

// `scroll` doesn't bubble, but a capture-phase listener still sees it on the way down
// regardless - attaching on `props.document` (the embed's shadow root, where the actual
// scrolling element is a descendant `overflow-auto` div) or the real `document` (the
// main site, where the page itself scrolls) both work the same way.
const scrollY = ref(0)
useEventListener(() => props.document ?? document, 'scroll', (event) => {
  scrollY.value = event.target instanceof Element ? event.target.scrollTop : window.scrollY
}, { capture: true })

const groupsVisable = computed((): string[] => {
  // TODO: return the visable group's keys
  return []
})
</script>

<template>
  <div class="color-base bg-base">
    <template v-if="isLoading && !diff">
      <div class="mxa px-4 py-12 max-w-500 w-full">
        <slot name="loading">
          <FeedbackLoading text="Loading…" />
        </slot>
      </div>
    </template>
    <template v-else-if="error">
      <div class="mxa px-4 py-12 max-w-500 w-full">
        <slot name="error" :error="error" :retry="() => emit('retry')">
          <FeedbackEmptyState icon="i-ph:warning-duotone" title="Something went wrong">
            <template #hint>
              {{ error.message }}
            </template>
            <template #actions>
              <ActionButton variant="primary" @click="emit('retry')">
                Retry
              </ActionButton>
            </template>
          </FeedbackEmptyState>
        </slot>
      </div>
    </template>
    <template v-else-if="diff && grouped">
      <DiffsHeader
        :document
        :meta="diff.meta"
        :layout="layout"
        :reviewed-count="reviewedCount"
        :total-files="diff.files.length"
        :additions="totalAdditions"
        :deletions="totalDeletions"
        :is-embedded="isEmbedded"
        :groups-visable="groupsVisable"
        :groups="resolvedGroups"
        :scroll-y="scrollY"
        :analyze-mode="analyzeMode"
        :is-analyzing="isAnalyzing"
        :llm-available="llmAvailable"
        :has-ai-result="hasAiResult"
        @update:layout="emit('update:layout', $event)"
        @update:analyze-mode="emit('update:analyzeMode', $event)"
        @reanalyze-ai="emit('reanalyzeAi')"
        @refresh="emit('refresh')"
      />

      <div class="mxa py-4 flex flex-col gap-4 max-w-500 w-full">
        <slot name="stale" :refresh="() => emit('refresh')">
          <div v-if="isStale" class="text-sm text-amber-700 mb-4 px-3 py-2 border border-amber:20 rounded-lg bg-amber:10 bg-raised flex gap-3 items-center justify-between dark:text-amber-400">
            <span>This pull request has new commits since it was cached.</span>
            <ActionButton size="sm" @click="emit('refresh')">
              Refresh
            </ActionButton>
          </div>
        </slot>

        <DiffGroup
          v-for="group in resolvedGroups"
          :id="`group-${group.key}`"
          :key="group.key"
          :group="group"
          :layout="layout"
          :reviewed="reviewed"
          :collapsed="collapsedGroups.has(group.key)"
          @update:reviewed="(sha, isReviewed) => emit('update:reviewed', sha, isReviewed)"
          @toggle="toggleGroup(group.key)"
        />

        <!-- To leave some space at the end of the diff -->
        <div class="text-xs mt-200 p2 text-center op50 italic">
          You have reached the end of the diff.
        </div>
      </div>
    </template>
    <template v-else>
      <div class="mxa px-4 py-12 max-w-500 w-full">
        <slot name="empty" />
      </div>
    </template>
  </div>
</template>
