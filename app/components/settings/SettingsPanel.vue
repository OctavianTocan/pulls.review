<script setup lang="ts">
import FormField from '@antfu/design/components/Form/FormField.vue'
import FormTextInput from '@antfu/design/components/Form/FormTextInput.vue'

defineProps<{
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
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
</template>
