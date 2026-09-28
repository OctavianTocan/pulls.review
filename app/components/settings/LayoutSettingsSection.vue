<script setup lang="ts">
import ActionToggleGroup from '@antfu/design/components/Action/ActionToggleGroup.vue'
import { layout } from '../../state/layout'

// Same singleton `DiffsHeader.vue`'s layout toggle used to write through
// `store.ui.setLayout` - a shared app-wide preference, so this section reads
// and writes it directly, like `DarkToggle.vue` does for `isDark`.
const layoutOptions = [
  { value: 'unified', label: 'Unified', icon: 'i-ph:rows-duotone' },
  { value: 'split', label: 'Split', icon: 'i-ph:columns-duotone' },
]
</script>

<template>
  <div>
    <h3 class="text-sm color-base font-medium mb-2">
      Diff layout
    </h3>
    <ActionToggleGroup
      :model-value="layout"
      :options="layoutOptions"
      @update:model-value="layout = ($event as 'split' | 'unified')"
    />
  </div>
</template>
