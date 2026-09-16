<script setup lang="ts">
import ActionButton from '@antfu/design/components/Action/ActionButton.vue'
import FormTextInput from '@antfu/design/components/Form/FormTextInput.vue'
import { formatTimeAgo } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import DiffStats from '../components/diff/DiffStats.vue'
import PrStatusIcon from '../components/diff/PrStatusIcon.vue'
import { useRecentPullRequests } from '../composables/useRecentPullRequests'

const router = useRouter()
const url = ref('')

const parsed = computed(() => {
  const match = url.value.trim().match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/)
  if (!match)
    return undefined
  const [, owner, repo, number] = match
  return { owner, repo, number }
})

function go() {
  if (!parsed.value)
    return
  router.push(`/gh/${parsed.value.owner}/${parsed.value.repo}/${parsed.value.number}`)
}

const { recent, load } = useRecentPullRequests()
onMounted(load)
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <AppHeader />
    <main class="mx-auto py-12 flex flex-1 flex-col gap-8 max-w-lg w-full items-center">
      <div class="text-center flex flex-col gap-4 items-center">
        <h1 class="text-2xl font-semibold">
          Diffs
        </h1>
        <p class="op-fade">
          A better way to review a GitHub pull request's diff: grouped, summarized, and fast.
        </p>
        <div class="flex gap-2 w-full items-start">
          <FormTextInput v-model="url" placeholder="https://github.com/owner/repo/pull/123" class="flex-1" @keyup.enter="go" />
          <ActionButton variant="primary" :disabled="!parsed" @click="go">
            Open
          </ActionButton>
        </div>
        <p class="text-sm op-fade">
          Or use the upload button in the header to review a pasted/uploaded diff.
        </p>
      </div>

      <div v-if="recent.length" class="flex flex-col gap-2 w-full items-stretch">
        <h2 class="text-xs tracking-wide font-medium op-fade uppercase">
          Recent
        </h2>
        <RouterLink
          v-for="pr in recent"
          :key="`${pr.owner}/${pr.repo}#${pr.number}`"
          :to="`/gh/${pr.owner}/${pr.repo}/${pr.number}`"
          class="text-sm px-3 py-2 border border-base rounded-lg flex gap-3 items-center hover:bg-hover"
        >
          <PrStatusIcon v-if="pr.state" :state="pr.state" />
          <div class="flex-1 min-w-0">
            <div class="font-medium truncate">
              {{ pr.title }}
            </div>
            <div class="text-xs op-fade flex flex-wrap gap-x-2 gap-y-0.5 items-center">
              <span>{{ pr.owner }}/{{ pr.repo }}#{{ pr.number }}</span>
              <span>{{ pr.reviewedCount }} / {{ pr.totalFiles }} reviewed</span>
              <span>{{ formatTimeAgo(new Date(pr.lastViewedAt)) }}</span>
            </div>
          </div>
          <DiffStats class="shrink-0" :additions="pr.additions" :deletions="pr.deletions" />
        </RouterLink>
      </div>
    </main>
  </div>
</template>
