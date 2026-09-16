<script setup lang="ts">
import type { FileChange } from '../../types/diff'
import DisplayBadge from '@antfu/design/components/Display/DisplayBadge.vue'
import FormCheckbox from '@antfu/design/components/Form/FormCheckbox.vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { computed, useTemplateRef } from 'vue'

const props = defineProps<{
  files: FileChange[]
  reviewed: Set<string>
}>()

const emit = defineEmits<{
  'update:reviewed': [sha: string, reviewed: boolean]
}>()

interface TreeRow {
  key: string
  depth: number
  type: 'folder' | 'file'
  name: string
  file?: FileChange
}

const STATUS_COLOR: Record<FileChange['status'], string> = {
  added: 'green',
  removed: 'red',
  modified: 'yellow',
  renamed: 'blue',
  copied: 'blue',
}

const rows = computed<TreeRow[]>(() => {
  interface Node { name: string, children: Map<string, Node>, file?: FileChange }
  const root: Node = { name: '', children: new Map() }

  for (const file of [...props.files].sort((a, b) => a.path.localeCompare(b.path))) {
    const segments = file.path.split('/')
    let node = root
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i]!
      let child = node.children.get(segment)
      if (!child) {
        child = { name: segment, children: new Map() }
        node.children.set(segment, child)
      }
      node = child
    }
    node.children.set(`\0file:${file.path}`, { name: segments[segments.length - 1]!, children: new Map(), file })
  }

  const result: TreeRow[] = []
  function walk(node: Node, depth: number, pathPrefix: string) {
    for (const [key, child] of node.children) {
      if (child.file) {
        result.push({ key: `file:${child.file.path}`, depth, type: 'file', name: child.name, file: child.file })
      }
      else {
        result.push({ key: `folder:${pathPrefix}${key}`, depth, type: 'folder', name: child.name })
        walk(child, depth + 1, `${pathPrefix}${key}/`)
      }
    }
  }
  walk(root, 0, '')
  return result
})

const scrollElRef = useTemplateRef<HTMLDivElement>('scrollEl')

const virtualizer = useVirtualizer(computed(() => ({
  count: rows.value.length,
  getScrollElement: () => scrollElRef.value,
  estimateSize: () => 32,
  overscan: 10,
})))
</script>

<template>
  <div ref="scrollEl" class="max-h-100 overflow-auto">
    <div :style="{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }">
      <div
        v-for="row in virtualizer.getVirtualItems().map(item => ({ item, row: rows[item.index]! }))"
        :key="row.row.key"
        class="text-sm flex gap-1.5 h-8 items-center"
        :style="{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${row.item.size}px`,
          transform: `translateY(${row.item.start}px)`,
          paddingLeft: `${0.5 + row.row.depth}em`,
        }"
      >
        <template v-if="row.row.type === 'folder'">
          <span class="i-ph:folder op-fade" aria-hidden="true" />
          <span class="op-fade truncate">{{ row.row.name }}</span>
        </template>
        <template v-else-if="row.row.file">
          <FormCheckbox
            :model-value="reviewed.has(row.row.file.sha)"
            @update:model-value="emit('update:reviewed', row.row.file.sha, $event)"
          />
          <span class="i-ph:file" aria-hidden="true" />
          <span class="flex-1 min-w-0 truncate">{{ row.row.name }}</span>
          <DisplayBadge :text="row.row.file.status" :color="STATUS_COLOR[row.row.file.status]" />
          <span class="text-xs mr-2 whitespace-nowrap">
            <span class="color-success-500">+{{ row.row.file.additions }}</span>
            <span class="color-error-500 ml-1">-{{ row.row.file.deletions }}</span>
          </span>
        </template>
      </div>
    </div>
  </div>
</template>
