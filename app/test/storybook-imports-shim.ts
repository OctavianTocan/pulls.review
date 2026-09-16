/**
 * Storybook runs components through plain Vite, not Nuxt, so `#imports` (Nuxt's
 * virtual auto-import module) doesn't exist there. This is a minimal stand-in for
 * just the bits our components/composables pull from it, aliased in .storybook/main.ts.
 */
export function useHead(): void {}

export function useRoute(): { params: Record<string, string> } {
  return { params: {} }
}

export function navigateTo(): void {
  // eslint-disable-next-line no-console
  console.log('[storybook] navigateTo() called - no-op outside the Nuxt app')
}
