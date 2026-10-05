/** `claude-code` and `codex` run the server's signed-in CLIs; the rest call an API with a key from the browser. */
export const LLM_PROVIDERS = ['claude-code', 'codex', 'gateway', 'anthropic', 'openai-compatible'] as const
export type LlmProvider = typeof LLM_PROVIDERS[number]

export function isLlmProvider(value: string): value is LlmProvider {
  return (LLM_PROVIDERS as readonly string[]).includes(value)
}

/**
 * The `llm` analyze adapter's model access. `provider` picks which credentials
 * and model to use - only the selected provider is ever called, even when
 * several tokens are configured.
 */
export interface LlmSettings {
  provider: LlmProvider
  claudeCodeModel: string
  /** A reasoning effort the model reports it accepts; `''` leaves it to the CLI. */
  claudeCodeEffort: string
  codexModel: string
  codexEffort: string
  /** The CLI that answers questions about the PR; `''` reuses the analysis model and effort. */
  askProvider: '' | 'claude-code' | 'codex'
  askModel: string
  askEffort: string
  gatewayToken: string
  gatewayModel: string
  anthropicApiKey: string
  anthropicModel: string
  openaiApiKey: string
  openaiBaseUrl: string
  openaiModel: string
}

export const defaultLlmSettings: LlmSettings = {
  provider: 'gateway',
  claudeCodeModel: 'claude-sonnet-5',
  claudeCodeEffort: '',
  codexModel: 'gpt-5.6-sol',
  codexEffort: '',
  askProvider: '',
  askModel: '',
  askEffort: '',
  gatewayToken: '',
  gatewayModel: 'anthropic/claude-sonnet-5',
  anthropicApiKey: '',
  anthropicModel: 'claude-sonnet-5',
  openaiApiKey: '',
  openaiBaseUrl: 'https://api.openai.com/v1',
  openaiModel: 'gpt-5.1',
}

/** Picks the provider from whichever credential is set, by priority (gateway > anthropic > openai-compatible). */
export function deriveProvider(llm: Partial<LlmSettings>): LlmProvider {
  if (llm.gatewayToken)
    return 'gateway'
  if (llm.anthropicApiKey)
    return 'anthropic'
  if (llm.openaiApiKey)
    return 'openai-compatible'
  return 'gateway'
}
