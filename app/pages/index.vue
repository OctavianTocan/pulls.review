<script setup lang="ts">
import ActionButton from '@antfu/design/components/Action/ActionButton.vue'
import FormTextInput from '@antfu/design/components/Form/FormTextInput.vue'
import { formatTimeAgo } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import PrStatusIcon from '../components/diff/PrStatusIcon.vue'
import LoadDiffModal from '../components/load/LoadDiffModal.vue'
import { UPLOAD_SESSION_STORAGE_KEY } from '../composables/uploadSession'
import { useRecentPullRequests } from '../composables/useRecentPullRequests'

// A real, small pull request - lets people see the app in action without having
// to go find one of their own first.
const DEMO_PR = { owner: 'antfu', repo: 'vite-plugin-vue-tracer', number: '13' }

const router = useRouter()
const url = ref('')
const loadDiffOpen = ref(false)

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

function tryDemo() {
  router.push(`/gh/${DEMO_PR.owner}/${DEMO_PR.repo}/${DEMO_PR.number}`)
}

async function loadFile(file: File) {
  const text = await file.text()
  sessionStorage.setItem(UPLOAD_SESSION_STORAGE_KEY, JSON.stringify({ text, title: file.name }))
  router.push('/upload')
}

// Counts nested `dragenter`/`dragleave` pairs (they fire for every child element
// the pointer crosses too) so the drop overlay doesn't flicker while dragging
// across the page's own content.
let dragDepth = 0
const isDragging = ref(false)

function onDrop(event: DragEvent) {
  isDragging.value = false
  const file = event.dataTransfer?.files[0]
  if (file)
    loadFile(file)
}

function onDragEnter(event: DragEvent) {
  if (!event.dataTransfer?.types.includes('Files'))
    return
  dragDepth++
  isDragging.value = true
}
function onDragLeave() {
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0)
    isDragging.value = false
}

const { recent, load } = useRecentPullRequests()
onMounted(load)
</script>

<template>
  <div
    class="flex flex-col min-h-screen relative"
    @dragenter.prevent="onDragEnter"
    @dragleave.prevent="onDragLeave"
    @dragover.prevent
    @drop.prevent="onDrop"
  >
    <AppHeader />

    <div
      v-if="isDragging"
      class="z-50 text-lg color-primary-600 font-medium border-4 border-primary-500 rounded-2xl border-dashed bg-primary-500/10 flex pointer-events-none items-center inset-4 justify-center fixed backdrop-blur-sm dark:color-primary-400"
    >
      Drop to load your diff / .patch file
    </div>

    <main class="mxa px-4 py-16 flex flex-1 flex-col gap-14 max-w-2xl w-full items-center">
      <div class="text-center flex flex-col gap-4 items-center">
        <div class="i-ph:git-diff-duotone text-3xl color-primary-500" aria-hidden="true" />
        <h1 class="text-3xl tracking-tight font-bold sm:text-4xl">
          Review pull requests, <span class="color-primary-500">without the noise</span>
        </h1>
        <p class="text-base op-fade max-w-lg sm:text-lg">
          Diffs groups changed files, summarizes what matters, and remembers what you've
          already reviewed - for any GitHub pull request, or a diff you just paste in.
        </p>
      </div>

      <div class="p-5 border border-base flex flex-col gap-4 w-full sm:p-6">
        <div class="flex flex-col gap-2">
          <div class="flex gap-2 w-full items-start">
            <FormTextInput v-model="url" icon="i-ph:link-simple-duotone" placeholder="https://github.com/owner/repo/pull/123" class="flex-1" @keyup.enter="go" />
            <ActionButton variant="primary" :disabled="!parsed" @click="go">
              Open
            </ActionButton>
          </div>
          <p class="text-xs op-fade">
            Paste any GitHub pull request URL, or
            <button type="button" class="color-primary-500 hover:underline" @click="tryDemo">
              try a demo
            </button>.
          </p>
        </div>

        <div class="border-t border-base" />

        <div class="flex flex-wrap gap-3 items-center justify-between">
          <ActionButton icon="i-ph:upload-simple-duotone" @click="loadDiffOpen = true">
            Upload a diff
          </ActionButton>
          <p class="text-xs op-fade">
            or drag &amp; drop a <code class="px-1 rounded bg-code">.diff</code> / <code class="px-1 rounded bg-code">.patch</code> file anywhere on this page
          </p>
        </div>
      </div>

      <div v-if="recent.length" class="flex flex-col gap-3 w-full items-stretch">
        <h2 class="text-xs tracking-wide font-medium op-fade uppercase">
          Recently viewed
        </h2>
        <div class="flex flex-wrap gap-2">
          <RouterLink
            v-for="pr in recent"
            :key="`${pr.owner}/${pr.repo}#${pr.number}`"
            :to="`/gh/${pr.owner}/${pr.repo}/${pr.number}`"
            :title="pr.title"
            class="text-sm px-3 py-1.5 border border-base rounded-full flex gap-2 transition items-center hover:border-primary-500/50 hover:bg-hover"
          >
            <PrStatusIcon v-if="pr.state" :state="pr.state" class="text-sm" />
            <span class="font-medium">{{ pr.owner }}/{{ pr.repo }}<span class="op-fade">#{{ pr.number }}</span></span>
            <span class="text-xs op-fade">{{ pr.reviewedCount }}/{{ pr.totalFiles }}</span>
            <span class="text-xs op-fade">·</span>
            <span class="text-xs op-fade">{{ formatTimeAgo(new Date(pr.lastViewedAt)) }}</span>
          </RouterLink>
        </div>
      </div>

      <div class="p-5 border border-base flex flex-col gap-4 w-full">
        <div class="flex gap-3 items-start">
          <div class="i-ph:puzzle-piece-duotone text-xl color-primary-500 mt-0.5 shrink-0" aria-hidden="true" />
          <div class="flex-1">
            <h2 class="font-semibold">
              Use it directly on github.com
            </h2>
            <p class="text-sm op-fade">
              Install the userscript and a "Diffs" drawer appears on every pull request page.
            </p>
          </div>
        </div>
        <ol class="text-sm pl-5 list-decimal op-fade">
          <li>Install <a href="https://www.tampermonkey.net/" target="_blank" rel="noopener" class="color-base hover:underline">Tampermonkey</a> or <a href="https://violentmonkey.github.io/" target="_blank" rel="noopener" class="color-base hover:underline">Violentmonkey</a>.</li>
          <li>Open the userscript below and confirm the install in your extension.</li>
          <li>Visit any pull request - click the "Diffs" tab on the right edge to open the drawer.</li>
        </ol>
        <div class="flex flex-wrap gap-2">
          <ActionButton href="https://diffs.antfu.dev/diffs-github.user.js" icon="i-ph:download-duotone">
            Install userscript
          </ActionButton>
        </div>
      </div>
    </main>

    <footer class="text-sm px-4 py-6 op-fade flex items-center justify-center">
      <a href="https://github.com/antfu/diffs" target="_blank" rel="noopener" class="flex gap-1.5 transition items-center hover:color-base">
        <span class="i-ph:github-logo-duotone text-base" aria-hidden="true" />
        GitHub Repo
      </a>
    </footer>

    <LoadDiffModal v-model:open="loadDiffOpen" />
  </div>
</template>
