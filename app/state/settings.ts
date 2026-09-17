import { useLocalStorage } from '@vueuse/core'

/**
 * The `llm` analyze adapter's model access, in priority order: the AI Gateway token
 * (if set) wins over the vendor-specific keys, since one gateway token can reach many
 * models.
 */
export interface LlmSettings {
  gatewayToken: string
  gatewayModel: string
  anthropicApiKey: string
  anthropicModel: string
  openaiApiKey: string
  openaiBaseUrl: string
  openaiModel: string
}

export const defaultLlmSettings: LlmSettings = {
  gatewayToken: '',
  gatewayModel: 'anthropic/claude-sonnet-5',
  anthropicApiKey: '',
  anthropicModel: 'claude-sonnet-5',
  openaiApiKey: '',
  openaiBaseUrl: 'https://api.openai.com/v1',
  openaiModel: 'gpt-5.1',
}

export interface Settings {
  githubToken: string
  llm: LlmSettings
}

const defaultSettings: Settings = {
  githubToken: '',
  llm: defaultLlmSettings,
}

/**
 * Every setting lives under one localStorage key - needs synchronous access before a
 * provider call, so localStorage over unstorage/IndexedDB. A plain module-level
 * singleton (like `state/dark.ts`'s `isDark`) - every caller shares the same value.
 */
export const settings = useLocalStorage<Settings>('diffs:settings', defaultSettings, { mergeDefaults: true })
