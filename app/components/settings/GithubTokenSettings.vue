<script setup lang="ts">
import type { StoredGithubTokenMeta } from '../../composables/useGithubTokenMeta'
import ActionButton from '@antfu/design/components/Action/ActionButton.vue'
import ActionIconButton from '@antfu/design/components/Action/ActionIconButton.vue'
import DisplayAvatar from '@antfu/design/components/Display/DisplayAvatar.vue'
import DisplayBadge from '@antfu/design/components/Display/DisplayBadge.vue'
import DisplayDate from '@antfu/design/components/Display/DisplayDate.vue'
import FormField from '@antfu/design/components/Form/FormField.vue'
import FormTextInput from '@antfu/design/components/Form/FormTextInput.vue'
import { ref, watch } from 'vue'

const props = defineProps<{
  /** A token is saved in settings (the meta may still be resolving). */
  tokenSet: boolean
  meta: StoredGithubTokenMeta | null
  /** A validation/resolve fetch is in flight. */
  busy?: boolean
  error?: string
}>()

const emit = defineEmits<{
  /** Save a new token (validated by the parent before persisting); `''` removes it. */
  save: [token: string]
}>()

const editing = ref(false)
const draft = ref('')

// The parent validates asynchronously: a save attempt ends when `busy` falls.
// No error means it was persisted - leave edit mode.
watch(() => props.busy, (busy, wasBusy) => {
  if (wasBusy && !busy && !props.error) {
    editing.value = false
    draft.value = ''
  }
})

function cancel() {
  editing.value = false
  draft.value = ''
}

// Removing a token can't fail (nothing to validate), so exit edit mode eagerly.
function remove() {
  emit('save', '')
  cancel()
}
</script>

<template>
  <FormField
    v-if="!tokenSet || editing"
    :error="error"
  >
    <template #label>
      <div class="flex items-center gap-1 pb1">
        <div class="i-carbon-logo-github text-lg" />
        GitHub Personal Access Token
      </div>
    </template>
    <div class="flex items-center gap-2">
      <FormTextInput
        v-model="draft"
        type="password"
        icon="i-ph-key-duotone"
        placeholder="ghp_…"
        class="flex-1"
        :disabled="busy"
        :invalid="!!error"
        @keyup.enter="draft && emit('save', draft)"
      />
      <ActionButton :loading="busy" :disabled="!draft" @click="emit('save', draft)">
        Save
      </ActionButton>
      <ActionButton v-if="editing" variant="text" :disabled="busy" @click="cancel">
        Cancel
      </ActionButton>
      <ActionButton v-if="editing" variant="text" :disabled="busy" @click="remove">
        Remove
      </ActionButton>
    </div>
    <template #description>
      Optional for public repos; required for private repos, or leaving reviews.<br>
      Reviews need the <code class="rounded bg-sunken px1 font-medium">repo</code> scope (classic token) or <code class="rounded bg-sunken px1 font-medium">Pull requests: Read and write</code> (fine-grained token)<br>
      Stored only in this browser.
      <br><a
        href="https://github.com/settings/tokens/new?description=pulls.review&scopes=repo"
        target="_blank"
        rel="noopener"
        class="text-primary hover:underline"
      >Generate one on GitHub →</a>
    </template>
  </FormField>

  <FormField v-else>
    <template #label>
      <div class="flex items-center gap-1">
        <div class="i-carbon-logo-github text-lg" />
        GitHub Personal Access Token
      </div>
    </template>
    <div class="flex flex-col gap-2 border border-base rounded bg-raised p-3">
      <div v-if="meta" class="flex items-start gap-3">
        <DisplayAvatar :src="meta.avatarUrl" :name="meta.login" :size="36" />
        <div class="min-w-0 flex flex-1 flex-col gap-1.5">
          <div class="flex items-baseline gap-2">
            <span class="truncate text-sm color-base font-medium">{{ meta.login }}</span>
            <span v-if="meta.name" class="truncate text-xs color-faint">{{ meta.name }}</span>
          </div>
          <div class="flex flex-wrap items-center gap-1">
            <DisplayBadge
              v-for="scope in meta.scopes"
              :key="scope"
              :text="scope"
              class="text-xs"
            />
            <span v-if="!meta.scopes.length" class="text-xs color-faint">Fine-grained token (no classic scopes)</span>
          </div>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs color-faint">
            <span>
              Updated <DisplayDate :date="meta.setAt" />
            </span>
            <span v-if="meta.expiresAt">
              Expires <DisplayDate :date="meta.expiresAt" />
            </span>
            <span v-else>Never expires</span>
          </div>
        </div>
        <ActionIconButton
          icon="i-ph:pencil-simple-duotone"
          label="Change token"
          tooltip="Change token"
          class="text-sm"
          @click="editing = true"
        />
      </div>

      <div v-else class="flex items-center gap-2 text-sm color-faint">
        <template v-if="busy">
          <span class="i-ph:circle-notch animate-spin" aria-hidden="true" />
          Checking token…
        </template>
        <template v-else>
          <span class="flex-1 text-red-600 dark:text-red-400">{{ error ?? 'Could not verify this token.' }}</span>
          <ActionIconButton
            icon="i-ph:pencil-simple-duotone"
            label="Change token"
            tooltip="Change token"
            class="text-sm"
            @click="editing = true"
          />
        </template>
      </div>
    </div>
  </FormField>
</template>
