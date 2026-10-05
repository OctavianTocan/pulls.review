<script setup lang="ts">
import type { KeyScope } from '../state/keymap'
import DisplayKbd from '@antfu/design/components/Display/DisplayKbd.vue'
import { computed } from 'vue'
import { t } from '../i18n'
import { commands } from '../state/commands'
import { KEYMAP } from '../state/keymap'
import { helpOpen } from '../state/palette'
import AppModal from './AppModal.vue'

defineProps<{
  document?: Document | ShadowRoot
}>()

interface Row { command: string, label: string, keys: string[] }

const sections = computed(() => {
  if (!helpOpen.value)
    return []
  const scopes = new Map<KeyScope | 'other', Row[]>([['global', []], ['pr', []], ['home', []], ['other', []]])
  for (const binding of KEYMAP) {
    const rows = scopes.get(binding.scope)!
    const row = rows.find(row => row.command === binding.command)
    if (row)
      row.keys.push(binding.keys)
    else
      rows.push({ command: binding.command, label: t(binding.label), keys: [binding.keys] })
  }
  const other = scopes.get('other')!
  for (const command of commands.value) {
    if (!command.shortcut || other.some(row => row.command === command.id))
      continue
    other.push({ command: command.id, label: command.title, keys: [command.shortcut] })
  }
  return [...scopes].filter(([, rows]) => rows.length).map(([scope, rows]) => ({ scope, title: t(`keys.scope.${scope}`), rows }))
})
</script>

<template>
  <AppModal v-model:open="helpOpen" :title="t('keys.title')" :document="document" spacious>
    <div class="flex flex-col gap-5">
      <section v-for="section in sections" :key="section.scope">
        <h3 class="mb-2 text-xs color-faint font-medium">
          {{ section.title }}
        </h3>
        <dl class="grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
          <div v-for="row in section.rows" :key="row.command" class="flex items-center justify-between gap-3 text-sm">
            <dt class="min-w-0 truncate color-base op-fade">
              {{ row.label }}
            </dt>
            <dd class="flex shrink-0 items-center gap-1">
              <template v-for="(keys, i) in row.keys" :key="keys">
                <span v-if="i" class="text-xs op-mute">/</span>
                <DisplayKbd :keys="keys" />
              </template>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  </AppModal>
</template>
