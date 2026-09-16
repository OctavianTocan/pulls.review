import type { Ref } from 'vue'
import { ref } from 'vue'
import { getReviewed, setReviewed } from '../cache/review-cache'
import { getDefaultCacheStorage } from '../cache/storage'

export interface UseReviewedFilesReturn {
  reviewed: Ref<Set<string>>
  load: (shas: string[]) => Promise<void>
  toggle: (sha: string, isReviewed: boolean) => Promise<void>
}

export function useReviewedFiles(): UseReviewedFilesReturn {
  const reviewed = ref(new Set<string>())

  async function load(shas: string[]) {
    const storage = await getDefaultCacheStorage()
    reviewed.value = await getReviewed(storage, shas)
  }

  async function toggle(sha: string, isReviewed: boolean) {
    const storage = await getDefaultCacheStorage()
    await setReviewed(storage, sha, isReviewed)
    const next = new Set(reviewed.value)
    if (isReviewed)
      next.add(sha)
    else
      next.delete(sha)
    reviewed.value = next
  }

  return { reviewed, load, toggle }
}
