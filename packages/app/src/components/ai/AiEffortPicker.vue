<script setup lang="ts">
import ActionToggleGroup from '@antfu/design/components/Action/ActionToggleGroup.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { effortLabel } from './ai-format'

const props = defineProps<{
  /** The efforts the selected model reports, lowest first. */
  efforts: readonly string[]
  /** The effort the CLI picks when none is passed. */
  defaultEffort?: string
}>()

/** The chosen effort; `''` leaves it to the CLI. */
const effort = defineModel<string>({ required: true })

const { t } = useI18n()

const options = computed(() => [
  {
    value: '',
    label: props.defaultEffort
      ? t('settings.llm.effortDefaultNamed', { effort: effortLabel(props.defaultEffort, t) })
      : t('settings.llm.effortDefault'),
  },
  ...props.efforts.map(value => ({ value, label: effortLabel(value, t) })),
])
</script>

<template>
  <ActionToggleGroup
    v-if="efforts.length"
    :model-value="effort"
    :options="options"
    class="max-w-full flex-wrap"
    @update:model-value="typeof $event === 'string' && (effort = $event)"
  />
</template>
