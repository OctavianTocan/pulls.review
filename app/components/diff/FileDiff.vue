<script setup lang="ts">
import type { FileChange } from '../../types/diff'
import ActionIconButton from '@antfu/design/components/Action/ActionIconButton.vue'
import DisplayBadge from '@antfu/design/components/Display/DisplayBadge.vue'
import FormCheckbox from '@antfu/design/components/Form/FormCheckbox.vue'
import { FileDiff as PierreFileDiff, processFile } from '@pierre/diffs'
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { ensurePierreDiffsShadowRoot } from './pierre-diffs-shadow'

const props = defineProps<{
  file: FileChange
  layout: 'split' | 'unified'
  reviewed: boolean
}>()

const emit = defineEmits<{
  'update:reviewed': [reviewed: boolean]
}>()

const STATUS_COLOR: Record<FileChange['status'], string> = {
  added: 'green',
  removed: 'red',
  modified: 'yellow',
  renamed: 'blue',
  copied: 'blue',
}

const containerRef = useTemplateRef<HTMLDivElement>('container')
const collapsed = ref(props.reviewed)
let instance: PierreFileDiff | undefined

function buildUnifiedDiffText(file: FileChange): string {
  const oldPath = file.previousPath ?? file.path
  const newPath = file.path
  const lines = [`diff --git a/${oldPath} b/${newPath}`]
  if (file.status === 'added')
    lines.push('new file mode 100644')
  else if (file.status === 'removed')
    lines.push('deleted file mode 100644')
  else if (file.status === 'renamed')
    lines.push(`rename from ${oldPath}`, `rename to ${newPath}`)
  else if (file.status === 'copied')
    lines.push(`copy from ${oldPath}`, `copy to ${newPath}`)
  lines.push(`--- ${file.status === 'added' ? '/dev/null' : `a/${oldPath}`}`)
  lines.push(`+++ ${file.status === 'removed' ? '/dev/null' : `b/${newPath}`}`)
  for (const hunk of file.hunks)
    lines.push(hunk.header, hunk.patch)
  return lines.join('\n')
}

function render() {
  if (!containerRef.value || props.file.isBinary || collapsed.value)
    return
  const fileDiff = processFile(buildUnifiedDiffText(props.file))
  if (!fileDiff)
    return
  ensurePierreDiffsShadowRoot(containerRef.value)
  // Recreated on every render rather than reused + `setOptions()`: switching `diffStyle`
  // (unified/split) on an existing instance left stale, un-columned DOM behind. `cleanUp()`
  // would otherwise `.remove()` our own template-owned container from the DOM entirely
  // (its default assumption is that it created the container itself) - the third
  // `isContainerManaged: true` constructor arg opts out of that.
  instance?.cleanUp()
  instance = new PierreFileDiff({ diffStyle: props.layout, disableErrorHandling: false }, undefined, true)
  instance.render({ fileDiff, fileContainer: containerRef.value })
}

onMounted(render)
onBeforeUnmount(() => instance?.cleanUp())

watch(() => [props.layout, collapsed.value, props.file], () => render(), { deep: false, flush: 'post' })

watch(() => props.reviewed, (isReviewed) => {
  collapsed.value = isReviewed
})

const statusColor = computed(() => STATUS_COLOR[props.file.status])
</script>

<template>
  <div class="border border-base rounded-lg overflow-hidden">
    <header class="px-2 py-1.5 bg-raised flex gap-2 items-center justify-between">
      <div class="text-sm flex gap-2 min-w-0 items-center">
        <ActionIconButton
          compact
          :icon="collapsed ? 'i-ph:caret-right' : 'i-ph:caret-down'"
          :label="collapsed ? 'Expand file' : 'Collapse file'"
          @click="collapsed = !collapsed"
        />
        <span class="font-mono truncate">{{ file.path }}</span>
        <DisplayBadge :text="file.status" :color="statusColor" />
        <span v-if="!file.isBinary" class="text-xs whitespace-nowrap">
          <span class="color-success-500">+{{ file.additions }}</span>
          <span class="color-error-500 ml-1">-{{ file.deletions }}</span>
        </span>
        <span v-else class="text-xs op-fade">Binary file</span>
      </div>
      <FormCheckbox
        :model-value="reviewed"
        label="Reviewed"
        @update:model-value="emit('update:reviewed', $event)"
      />
    </header>
    <div v-if="file.isBinary" class="text-sm p-4 op-fade">
      Binary file not shown.
    </div>
    <div v-else-if="!collapsed" ref="container" />
  </div>
</template>
