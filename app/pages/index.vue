<script setup lang="ts">
import ActionButton from '@antfu/design/components/Action/ActionButton.vue'
import FormTextInput from '@antfu/design/components/Form/FormTextInput.vue'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'

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
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <AppHeader />
    <main class="mx-auto py-12 text-center flex flex-1 flex-col gap-4 max-w-lg w-full items-center">
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
    </main>
  </div>
</template>
