<script setup lang="ts">
import type { FileChange } from '../../types/diff'
import ActionIconButton from '@antfu/design/components/Action/ActionIconButton.vue'
import DisplayFilePath from '@antfu/design/components/Display/DisplayFilePath.vue'
import FormCheckbox from '@antfu/design/components/Form/FormCheckbox.vue'
import { FileDiff as PierreFileDiff, processFile } from '@pierre/diffs'
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import DiffStats from './DiffStats.vue'
import FileStatus from './FileStatus.vue'
import { ensurePierreDiffsShadowRoot } from './pierre-diffs-shadow'

const props = defineProps<{
  file: FileChange
  layout: 'split' | 'unified'
  reviewed: boolean
}>()

const emit = defineEmits<{
  'update:reviewed': [reviewed: boolean]
}>()

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
  // `disableFileHeader`: we render our own header (filename, status, +/-, reviewed
  // checkbox) above the diff body, so pierre's own file-header row would be redundant.
  instance = new PierreFileDiff({ diffStyle: props.layout, disableErrorHandling: false, disableFileHeader: true }, undefined, true)
  instance.render({ fileDiff, fileContainer: containerRef.value })
}

onMounted(render)
onBeforeUnmount(() => instance?.cleanUp())

watch(() => [props.layout, collapsed.value, props.file], () => render(), { deep: false, flush: 'post' })

watch(() => props.reviewed, (isReviewed) => {
  // Auto-collapse a file once it's marked reviewed (and re-expand it if unmarked) - it's
  // already handled, no need to keep it open. `collapsed`'s initial value above mirrors
  // this for a file that's already reviewed on first render.
  collapsed.value = isReviewed
})
</script>

<template>
  <div class="border border-base rounded-lg overflow-hidden">
    <header class="px-2 py-1.5 bg-raised flex gap-2 items-center justify-between">
      <div class="text-sm flex gap-2 min-w-0 items-center">
        <FormCheckbox
          :model-value="reviewed"
          aria-label="Mark as reviewed"
          @update:model-value="emit('update:reviewed', $event)"
        />
        <FileStatus :status="file.status" />
        <DisplayFilePath :path="file.path" class="min-w-0" />
      </div>
      <div class="flex shrink-0 gap-2 items-center">
        <DiffStats v-if="!file.isBinary" :additions="file.additions" :deletions="file.deletions" />
        <span v-else class="text-xs op-fade">Binary file</span>
        <ActionIconButton
          compact
          :icon="collapsed ? 'i-ph:caret-right' : 'i-ph:caret-down'"
          :label="collapsed ? 'Expand file' : 'Collapse file'"
          @click="collapsed = !collapsed"
        />
      </div>
    </header>
    <div v-if="file.isBinary" class="text-sm p-4 op-fade">
      Binary file not shown.
    </div>
    <div v-else-if="!collapsed" ref="container" />
  </div>
</template>
