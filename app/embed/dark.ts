import type { Ref } from 'vue'
import { provide, ref, watch } from 'vue'
import { isDarkKey } from '../state/dark'

/**
 * A dark-mode ref scoped to the embed's own mounted root, instead of
 * `document.documentElement` (github.com's own `<html>`, which this must never touch).
 * Toggling a class on the root still works for UnoCSS's `.dark <selector>` dark-variant
 * classes, since normal descendant combinators apply fine within a shadow tree.
 */
export function useEmbedDark(rootRef: Ref<HTMLElement | null>): Ref<boolean> {
  const isDark = ref(document.documentElement.dataset.colorMode === 'dark')
  provide(isDarkKey, isDark)

  watch([rootRef, isDark], ([root, dark]) => {
    root?.classList.toggle('dark', dark)
  }, { immediate: true })

  return isDark
}
