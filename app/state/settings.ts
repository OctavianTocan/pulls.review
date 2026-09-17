import { useLocalStorage } from '@vueuse/core'

/**
 * Small, needs synchronous access before a provider call, so localStorage over
 * unstorage/IndexedDB. A plain module-level singleton (like `state/dark.ts`'s
 * `isDark`), not a composable - every caller must share the same token.
 */
export const githubToken = useLocalStorage('diffs:github-token', '')
