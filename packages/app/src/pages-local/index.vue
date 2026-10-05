<script setup lang="ts">
import type { MyPull, MyPullRole, MyPullState } from '@pulls.review/core/local-rpc'
import { LOCAL_RPC } from '@pulls.review/core/local-rpc'
import ActionButton from '@antfu/design/components/Action/ActionButton.vue'
import FeedbackEmptyState from '@antfu/design/components/Feedback/FeedbackEmptyState.vue'
import FeedbackLoading from '@antfu/design/components/Feedback/FeedbackLoading.vue'
import ActionToggleGroup from '@antfu/design/components/Action/ActionToggleGroup.vue'
import FormTextInput from '@antfu/design/components/Form/FormTextInput.vue'
import { computed, inject, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AppFooter from '../components/AppFooter.vue'
import AppHeader from '../components/AppHeader.vue'
import { useDocumentTitle } from '../composables/useDocumentTitle'
import { formatTimeAgo } from '../i18n/time-ago'
import { localRpcKey } from '../local/local-rpc-key'
import { repoRoute, routeForRef, routeFromGithubUrl } from '../source-routes'

const ROLE_ORDER: MyPullRole[] = ['review-requested', 'authored', 'involved', 'owned']

// Only `installLocal` registers this page, after providing the RPC client.
const rpc = inject(localRpcKey)!
const router = useRouter()
const { locale, t } = useI18n()

const pulls = ref<MyPull[]>()
const error = ref<string>()
const url = ref('')
const query = ref('')
const state = ref<MyPullState>('open')
const filter = ref<MyPullRole | 'all'>('all')

const stateOptions = computed(() => [
  { value: 'open', label: t('local.home.state.open') },
  { value: 'closed', label: t('local.home.state.closed') },
])

const parsed = computed(() => routeFromGithubUrl(url.value))

const filters = computed(() => [
  { value: 'all' as const, label: t('local.home.all'), count: pulls.value?.length ?? 0 },
  ...ROLE_ORDER.map(role => ({
    value: role,
    label: t(`local.home.role.${role}`),
    count: pulls.value?.filter(pull => pull.role === role).length ?? 0,
  })),
])

/** Repos with the most recently active pull request first; pulls inside keep that order. */
const groups = computed(() => {
  const byRepo = new Map<string, MyPull[]>()
  const needle = query.value.trim().toLowerCase()
  for (const pull of pulls.value ?? []) {
    if (filter.value !== 'all' && pull.role !== filter.value)
      continue
    if (needle && ![pull.owner, pull.repo, pull.title, pull.author, `#${pull.number}`, ...pull.labels].some(text => text.toLowerCase().includes(needle)))
      continue
    const name = `${pull.owner}/${pull.repo}`
    byRepo.set(name, [...byRepo.get(name) ?? [], pull])
  }
  return [...byRepo].map(([name, items]) => ({ name, owner: items[0].owner, repo: items[0].repo, items }))
})

async function load() {
  pulls.value = undefined
  error.value = undefined
  try {
    pulls.value = await rpc.call(LOCAL_RPC.myPulls, { state: state.value }) as MyPull[]
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

function setState(next: MyPullState) {
  state.value = next
  void load()
}

function open() {
  if (parsed.value)
    router.push(parsed.value)
}

function pullRoute(pull: MyPull) {
  return routeForRef({ kind: 'github-pr', owner: pull.owner, repo: pull.repo, number: String(pull.number) })
}

onMounted(load)
useDocumentTitle(() => t('local.home.title'))
</script>

<template>
  <div class="relative min-h-screen flex flex-col">
    <AppHeader />

    <main class="mxa max-w-4xl w-full flex flex-1 flex-col gap-6 px-6 py-10">
      <div class="flex flex-col gap-1">
        <h1 class="text-2xl font-semibold">
          {{ $t('local.home.title') }}
        </h1>
        <p class="text-sm op-fade">
          {{ $t('local.home.tagline') }}
        </p>
      </div>

      <form class="flex items-stretch gap-2" @submit.prevent="open">
        <FormTextInput v-model="url" :placeholder="$t('local.home.urlPlaceholder')" icon="i-ph:link-duotone" class="flex-1" />
        <ActionButton type="submit" variant="primary" icon="i-ph-arrow-right-bold" :disabled="!parsed">
          {{ $t('local.home.open') }}
        </ActionButton>
      </form>

      <FeedbackLoading v-if="!pulls && !error" :text="$t('local.home.loading')" />

      <FeedbackEmptyState v-else-if="error" icon="i-ph:warning-duotone" :title="$t('local.home.failed')">
        <template #hint>
          {{ error }}
        </template>
        <template #actions>
          <ActionButton variant="primary" @click="load">
            {{ $t('common.retry') }}
          </ActionButton>
        </template>
      </FeedbackEmptyState>

      <template v-else>
        <div class="flex items-center gap-2">
          <FormTextInput v-model="query" :placeholder="$t('local.home.search')" icon="i-ph:magnifying-glass-duotone" class="flex-1" />
          <ActionToggleGroup :model-value="state" :options="stateOptions" @update:model-value="setState($event as MyPullState)" />
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            v-for="item in filters"
            :key="item.value"
            type="button"
            class="border border-base rounded-full px-3 py-1 text-xs transition hover:bg-hover"
            :class="filter === item.value ? 'bg-hover color-base font-medium' : 'op-fade'"
            @click="filter = item.value"
          >
            {{ item.label }} <span class="font-mono op-fade">{{ item.count }}</span>
          </button>
          <ActionButton size="sm" variant="text" icon="i-ph:arrows-clockwise-duotone" class="ml-auto" @click="load">
            {{ $t('local.home.refresh') }}
          </ActionButton>
        </div>

        <FeedbackEmptyState v-if="!groups.length" icon="i-ph:git-pull-request-duotone" :title="$t('local.home.empty')" />

        <details v-for="group in groups" :key="group.name" open class="group flex flex-col gap-2">
          <summary class="flex cursor-pointer select-none list-none items-center gap-2 text-sm font-mono">
            <span class="i-ph:caret-right-bold text-xs op-fade transition group-open:rotate-90" aria-hidden="true" />
            <span class="i-ph:git-branch-duotone op-fade" aria-hidden="true" />
            <span>{{ group.name }}</span>
            <span class="op-fade">{{ group.items.length }}</span>
            <RouterLink :to="repoRoute(group.owner, group.repo)" class="ml-auto text-xs op-fade hover:underline" @click.stop>
              {{ $t('local.home.allInRepo') }}
            </RouterLink>
          </summary>
          <ul class="flex flex-col border border-base rounded-lg py-1">
            <li v-for="pull in group.items" :key="pull.number">
              <RouterLink :to="pullRoute(pull)" class="flex items-center gap-3 px-3 py-2 text-sm transition hover:bg-hover">
                <span class="w-12 shrink-0 font-mono text-xs op-fade">#{{ pull.number }}</span>
                <span class="min-w-0 flex-1 truncate">
                  <span v-if="pull.isDraft" class="mr-1 text-xs op-fade">[{{ $t('local.home.draft') }}]</span>{{ pull.title }}
                </span>
                <span v-for="label in pull.labels.slice(0, 2)" :key="label" class="hidden shrink-0 rounded bg-hover px-1.5 py-0.5 text-xs op-fade md:inline">{{ label }}</span>
                <span v-if="pull.role === 'review-requested'" class="shrink-0 rounded bg-hover px-1.5 py-0.5 text-xs color-accent-teal">{{ $t('local.home.role.review-requested') }}</span>
                <span class="hidden shrink-0 text-xs op-fade sm:inline">{{ pull.author }}</span>
                <span class="w-24 shrink-0 text-right text-xs op-fade">{{ formatTimeAgo(new Date(pull.updatedAt), locale) }}</span>
              </RouterLink>
            </li>
          </ul>
        </details>
      </template>
    </main>

    <AppFooter />
  </div>
</template>
