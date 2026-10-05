<script setup lang="ts">
import ActionIconButton from '@antfu/design/components/Action/ActionIconButton.vue'
import { useNow } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { formatTimeAgo } from '../../i18n/time-ago'

defineProps<{
  updating: boolean
  /** When the list on screen was fetched, in epoch milliseconds. */
  fetchedAt?: number
  /** Why the last update failed. */
  error?: string
}>()

const emit = defineEmits<{
  refresh: []
}>()

const { locale } = useI18n()
const now = useNow({ interval: 30_000 })
</script>

<template>
  <div class="min-w-0 flex items-center gap-2 text-xs" role="status" aria-live="polite">
    <template v-if="updating">
      <span class="i-ph:circle-notch shrink-0 animate-spin op-fade" aria-hidden="true" />
      <span class="op-fade">{{ $t('local.home.updating') }}</span>
    </template>
    <template v-else-if="error">
      <span class="i-ph:warning-duotone shrink-0 text-amber-500" aria-hidden="true" />
      <span class="min-w-0 truncate op-fade" :title="error">{{ $t('local.home.updateFailed', { message: error }) }}</span>
    </template>
    <span v-else-if="fetchedAt" class="op-fade" :title="new Date(fetchedAt).toLocaleString(locale)">
      {{ $t('local.home.updatedAgo', { time: formatTimeAgo(new Date(fetchedAt), locale, now.getTime()) }) }}
    </span>
    <ActionIconButton
      icon="i-ph:arrows-clockwise-duotone"
      compact
      :disabled="updating"
      :label="$t('local.home.refresh')"
      :tooltip="$t('local.home.refresh')"
      @click="emit('refresh')"
    />
  </div>
</template>
