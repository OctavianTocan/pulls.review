<script setup lang="ts">
import type { LlmSettings } from '../../state/settings'
import FormField from '@antfu/design/components/Form/FormField.vue'
import FormTextInput from '@antfu/design/components/Form/FormTextInput.vue'

defineProps<{
  modelValue: string
  llmSettings: LlmSettings
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:llmSettings': [value: LlmSettings]
}>()

function updateLlm<K extends keyof LlmSettings>(llmSettings: LlmSettings, key: K, value: LlmSettings[K]) {
  emit('update:llmSettings', { ...llmSettings, [key]: value })
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <FormField label="GitHub personal access token">
      <FormTextInput
        type="password"
        placeholder="ghp_…"
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
      />
      <template #description>
        Optional for public repos; required for private repos or to raise the rate limit. Stored only in this browser.
        <a
          href="https://github.com/settings/tokens/new?description=Diffs%20%28diffs.antfu.dev%29&scopes=repo"
          target="_blank"
          rel="noopener"
          class="hover:underline"
        >Generate one on GitHub →</a>
      </template>
    </FormField>

    <div class="pt-4 border-t border-base flex flex-col gap-4">
      <div>
        <h3 class="text-sm color-base font-medium">
          Model providers
        </h3>
        <p class="text-sm color-faint">
          Configure any one of these to enable AI-generated summaries. Stored only in this browser and sent only to the provider you configure.
        </p>
      </div>

      <FormField label="AI Gateway token">
        <FormTextInput
          type="password"
          placeholder="vck_…"
          :model-value="llmSettings.gatewayToken"
          @update:model-value="updateLlm(llmSettings, 'gatewayToken', $event)"
        />
        <template #description>
          A <a href="https://vercel.com/docs/ai-gateway" target="_blank" rel="noopener" class="hover:underline">Vercel AI Gateway</a> token, reaching any of its supported vendors with a single token.
        </template>
      </FormField>
      <FormField v-if="llmSettings.gatewayToken" label="Gateway model">
        <FormTextInput
          placeholder="anthropic/claude-sonnet-5"
          :model-value="llmSettings.gatewayModel"
          @update:model-value="updateLlm(llmSettings, 'gatewayModel', $event)"
        />
      </FormField>

      <FormField label="Anthropic API key">
        <FormTextInput
          type="password"
          placeholder="sk-ant-…"
          :model-value="llmSettings.anthropicApiKey"
          @update:model-value="updateLlm(llmSettings, 'anthropicApiKey', $event)"
        />
        <template #description>
          Used directly (no gateway) when no gateway token is set above.
        </template>
      </FormField>
      <FormField v-if="llmSettings.anthropicApiKey" label="Anthropic model">
        <FormTextInput
          placeholder="claude-sonnet-5"
          :model-value="llmSettings.anthropicModel"
          @update:model-value="updateLlm(llmSettings, 'anthropicModel', $event)"
        />
      </FormField>

      <FormField label="OpenAI-compatible base URL">
        <FormTextInput
          placeholder="https://api.openai.com/v1"
          :model-value="llmSettings.openaiBaseUrl"
          @update:model-value="updateLlm(llmSettings, 'openaiBaseUrl', $event)"
        />
        <template #description>
          Any OpenAI-compatible chat completions endpoint (OpenAI itself, a local server, etc.).
        </template>
      </FormField>
      <FormField label="OpenAI-compatible API key">
        <FormTextInput
          type="password"
          placeholder="sk-…"
          :model-value="llmSettings.openaiApiKey"
          @update:model-value="updateLlm(llmSettings, 'openaiApiKey', $event)"
        />
      </FormField>
      <FormField v-if="llmSettings.openaiApiKey" label="OpenAI-compatible model">
        <FormTextInput
          placeholder="gpt-5.1"
          :model-value="llmSettings.openaiModel"
          @update:model-value="updateLlm(llmSettings, 'openaiModel', $event)"
        />
      </FormField>
    </div>
  </div>
</template>
