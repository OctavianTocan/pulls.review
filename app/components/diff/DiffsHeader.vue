<script setup lang="ts">
import type { DiffsPayload } from '../../types/diff'
import ActionIconButton from '@antfu/design/components/Action/ActionIconButton.vue'
import ActionToggleGroup from '@antfu/design/components/Action/ActionToggleGroup.vue'
import DisplayDonut from '@antfu/design/components/Display/DisplayDonut.vue'
import { useEventListener } from '@vueuse/core'
import { computed, ref } from 'vue'
import { parseGithubDiffId } from '../../types/diff'
import GithubAvatar from '../GithubAvatar.vue'
import NavControls from '../NavControls.vue'
import DiffStats from './DiffStats.vue'
import PrStatusIcon from './PrStatusIcon.vue'

const props = defineProps<{
  hostContainer?: Document | ShadowRoot
  meta: DiffsPayload
  layout: 'split' | 'unified'
  reviewedCount: number
  totalFiles: number
  additions: number
  deletions: number
  isEmbedded?: boolean
  /** Top-level groups, for the quick-nav row - matches ids the page gives each group section. */
  groups: { key: string, label: string }[]
}>()

const emit = defineEmits<{
  'update:layout': [layout: 'split' | 'unified']
  'refresh': []
}>()

const progress = computed(() => props.totalFiles === 0 ? 1 : props.reviewedCount / props.totalFiles)

const layoutOptions = [
  { value: 'unified', label: 'Unified', icon: 'i-ph:rows' },
  { value: 'split', label: 'Split', icon: 'i-ph:columns' },
]

const githubRef = computed(() => props.meta.provider === 'github' ? parseGithubDiffId(props.meta.id) : undefined)

function scrollToGroup(key: string) {
  (props.hostContainer || document).getElementById(`group-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// `scroll` doesn't bubble, but a capture-phase listener still sees it on the way down
// regardless - attaching on `hostContainer` (the embed's shadow root, where the actual
// scrolling element is a descendant `overflow-auto` div) or `document` (the main
// site, where the page itself scrolls) both work the same way.
const y = ref(0)
useEventListener(() => props.hostContainer ?? document, 'scroll', (event) => {
  y.value = event.target instanceof Element ? event.target.scrollTop : window.scrollY
}, { capture: true })

// Default collapsed: the description is usually long prose and secondary to the
// file tree/diffs, which should be visible without scrolling past it first.
// const descriptionOpen = ref(false)
</script>

<template>
  <header
    class="p4 border-b bg-base flex flex-col gap-2 transition-all left-0 right-0 top-0 sticky z-nav"
    :class=" y > 20 ? 'border-base shadow-md' : 'border-transparent' "
  >
    <div class="mxa max-w-500 w-full">
      <div class="flex flex-wrap gap-2 items-start">
        <PrStatusIcon v-if="meta.pullRequest?.state" :state="meta.pullRequest.state" class="mt-1" />
        <h1 class="text-lg font-semibold flex-auto break-words">
          {{ meta.title }}
          <a v-if="githubRef" :href="meta.url" target="_blank" rel="noopener" class="text-base font-normal op-fade hover:underline">#{{ githubRef.number }}</a>
        </h1>
        <ActionIconButton v-if="meta.provider === 'github'" icon="i-ph:arrows-clockwise" label="Refresh" tooltip="Refresh" class="shrink-0" @click="emit('refresh')" />
        <ActionToggleGroup
          class="shrink-0"
          :model-value="layout"
          :options="layoutOptions"
          @update:model-value="emit('update:layout', $event as 'split' | 'unified')"
        />
        <NavControls v-if="!isEmbedded" class="shrink-0" :host-container="hostContainer" />
      </div>

      <div class="text-sm op-fade flex flex-wrap gap-x-3 gap-y-1 items-center">
        <div v-if="githubRef && !isEmbedded" class="text-sm mb-1 op-fade flex gap-1.5 items-center">
          <span>{{ githubRef.owner }}/{{ githubRef.repo }}</span>
        </div>
        <span v-if="meta.pullRequest?.author" class="flex gap-1.5 items-center">
          <GithubAvatar :login="meta.pullRequest.author" :size="16" />
          by {{ meta.pullRequest.author }}
        </span>
        <span v-if="meta.base && meta.head && !isEmbedded" class="font-mono flex gap-1 items-center">
          <span class="font-mono px-2 py-0.5 border border-base rounded bg-code">{{ meta.base.ref }}</span>
          ←
          <span class="font-mono px-2 py-0.5 border border-base rounded bg-code">{{ meta.head.ref }}</span>
        </span>
      </div>
      <!-- <template v-if="meta.description">
      <button
        type="button"
        class="text-sm color-muted mt-1 flex gap-1 items-center hover:color-base"
        :aria-expanded="descriptionOpen"
        @click="descriptionOpen = !descriptionOpen"
      >
        <span :class="descriptionOpen ? 'i-ph:caret-down' : 'i-ph:caret-right'" aria-hidden="true" />
        Description
      </button>
      <p v-if="descriptionOpen" class="text-sm whitespace-pre-wrap">
        {{ meta.description }}
      </p>
    </template> -->

      <div class="text-sm pt-2 flex gap-2 items-center">
        <div v-if="groups.length > 1" class="text-xs pt-2 flex flex-wrap gap-1.5 items-center">
          <button
            v-for="group in groups"
            :key="group.key"
            type="button"
            class="px-2 py-0.5 border border-base rounded-full op-fade hover:bg-active hover:op-100"
            @click="scrollToGroup(group.key)"
          >
            {{ group.label }}
          </button>
        </div>

        <div class="flex-auto" />

        <DiffStats :additions="additions" :deletions="deletions" />
        <DisplayDonut :value="progress" :size="18" :thickness="3" />
        <span>{{ reviewedCount }} <span class="text-xs opacity-50">/ {{ totalFiles }} reviewed</span></span>
      </div>
    </div>
  </header>
</template>
