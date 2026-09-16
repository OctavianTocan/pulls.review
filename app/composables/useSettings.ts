import type { Ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'

export function useSettings(): { githubToken: Ref<string> } {
  // Small, needs synchronous access before a provider call, so localStorage over unstorage/IndexedDB.
  const githubToken = useLocalStorage('diffs:github-token', '')
  return { githubToken }
}
