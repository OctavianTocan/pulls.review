<script setup lang="ts">
import type { FileChange } from '../../types/diff'
import DisplayFileIcon from '@antfu/design/components/Display/DisplayFileIcon.vue'
import DisplayFilePath from '@antfu/design/components/Display/DisplayFilePath.vue'
import FormCheckbox from '@antfu/design/components/Form/FormCheckbox.vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { computed, useTemplateRef } from 'vue'
import DiffStats from './DiffStats.vue'
import FileStatus from './FileStatus.vue'

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
        continue
      }

      // Collapse a chain of single-child folders into one row, e.g.
      // `src` -> `components` -> (diff, bar) renders as a single `src/components` row.
      let name = child.name
      let tail = child
      let prefix = `${pathPrefix}${key}/`
      while (tail.children.size === 1) {
        const [onlyKey, onlyChild] = [...tail.children.entries()][0]!
        if (onlyChild.file)
          break
        name += `/${onlyChild.name}`
        tail = onlyChild
        prefix += `${onlyKey}/`
      }
      result.push({ key: `folder:${prefix}`, depth, type: 'folder', name })
      walk(tail, depth + 1, prefix)
    }
  }
  walk(root, 0, '')
  return result
})

const scrollElRef = useTemplateRef<HTMLDivElement>('scrollEl')

const virtualizer = useVirtualizer(computed(() => ({
  count: rows.value.length,
  getScrollElement: () => scrollElRef.value,
  estimateSize: () => 24,
  overscan: 10,
})))
</script>

<template>
  <div ref="scrollEl" class="max-h-100 overflow-auto">
    <div :style="{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }">
      <div
        v-for="row in virtualizer.getVirtualItems().map(item => ({ item, row: rows[item.index]! }))"
        :key="row.row.key"
        class="text-sm flex gap-1.5 items-center"
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
          <DisplayFileIcon directory :path="row.row.name" class="op-fade" />
          <span class="op-fade truncate">{{ row.row.name }}</span>
        </template>
        <template v-else-if="row.row.file">
          <FormCheckbox
            :model-value="reviewed.has(row.row.file.sha)"
            @update:model-value="emit('update:reviewed', row.row.file.sha, $event)"
          />
          <DisplayFilePath :path="row.row.name" :dim="false" class="flex-1 min-w-0" />
          <DiffStats :additions="row.row.file.additions" :deletions="row.row.file.deletions" />
          <FileStatus :status="row.row.file.status" />
        </template>
      </div>
    </div>
  </div>
</template>
