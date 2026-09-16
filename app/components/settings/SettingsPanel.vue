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
  <FormField
    label="GitHub personal access token"
    description="Optional for public repos; required for private repos or to raise the rate limit. Stored only in this browser."
  >
    <FormTextInput
      type="password"
      placeholder="ghp_…"
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
    />
  </FormField>
</template>
