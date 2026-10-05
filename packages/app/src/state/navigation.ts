import type { FileChange } from '@pulls.review/core/types'
import type { ComputedRef, Ref } from 'vue'
import { computed, onScopeDispose, ref, watch } from 'vue'

/** Sha of the file keyboard navigation last moved to, highlighted in the diff. */
export const activeFile = ref<string>()
/** Key of the row keyboard navigation last moved to on a list page. */
export const activeRow = ref<string>()

/**
 * Drops the keyboard selection on every page.
 *
 * @returns Whether anything was selected.
 */
export function clearSelection(): boolean {
  const had = activeFile.value !== undefined || activeRow.value !== undefined
  activeFile.value = undefined
  activeRow.value = undefined
  return had
}

/** What keyboard navigation can do with a rendered file diff. */
export interface FileView {
  collapsed: Ref<boolean>
  /** Viewport y of each hunk's first line, top to bottom; empty when not known. */
  hunkTops: () => number[]
}

/** Every mounted file diff by sha. */
export const fileViews = new Map<string, FileView>()

/** The part of pierre's virtualized diff used to locate lines. */
interface LineLocator {
  getLinePosition: (lineNumber: number, side?: 'additions' | 'deletions') => { top: number } | undefined
}

/**
 * Makes a file diff reachable by keyboard navigation for the lifetime of the calling component.
 *
 * @param file - The file it renders.
 * @param options - How the diff is shown.
 * @param options.collapsed - Whether its body is hidden; navigation expands it as needed.
 * @param options.container - The element its lines render into.
 * @param options.lines - The renderer, when it can locate lines; hunk navigation needs it.
 * @returns Whether it's the keyboard-selected file.
 */
export function useFileNavigation(
  file: () => FileChange,
  options: {
    collapsed: Ref<boolean>
    container: () => HTMLElement | null | undefined
    lines: () => LineLocator | undefined
  },
): ComputedRef<boolean> {
  const view: FileView = {
    collapsed: options.collapsed,
    hunkTops: () => {
      const container = options.container()
      const lines = options.lines()
      if (!container || !lines || options.collapsed.value)
        return []
      const offset = container.getBoundingClientRect().top
      return file().hunks.flatMap((hunk) => {
        const position = hunk.newLines > 0
          ? lines.getLinePosition(hunk.newStart, 'additions')
          : lines.getLinePosition(hunk.oldStart, 'deletions')
        return position ? [offset + position.top] : []
      }).sort((a, b) => a - b)
    },
  }

  let registered: string | undefined
  function unregister() {
    if (registered !== undefined && fileViews.get(registered) === view)
      fileViews.delete(registered)
  }
  watch(() => file().sha, (sha) => {
    unregister()
    fileViews.set(sha, view)
    registered = sha
  }, { immediate: true })
  onScopeDispose(unregister)

  return computed(() => activeFile.value === file().sha)
}
