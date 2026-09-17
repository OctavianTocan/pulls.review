import type { LanguageModel } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGateway } from '@ai-sdk/gateway'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { settings } from '../../../state/settings'

/**
 * Resolves the model to call from whatever's configured in Settings, in priority
 * order: gateway token (reaches many vendors through one token) beats a direct
 * vendor key. `undefined` means nothing is configured - the adapter's `available`.
 */
export function resolveLanguageModel(): LanguageModel | undefined {
  const llm = settings.value.llm

  if (llm.gatewayToken)
    return createGateway({ apiKey: llm.gatewayToken })(llm.gatewayModel)

  if (llm.anthropicApiKey) {
    return createAnthropic({
      apiKey: llm.anthropicApiKey,
      // Anthropic's API otherwise rejects browser-origin requests outright (CORS).
      // The key is user-supplied and never leaves this browser - this is the
      // intended zero-backend flow, not a workaround for a mistake.
      headers: { 'anthropic-dangerous-direct-browser-access': 'true' },
    })(llm.anthropicModel)
  }

  if (llm.openaiApiKey) {
    return createOpenAICompatible({
      name: 'openai-compatible',
      baseURL: llm.openaiBaseUrl,
      apiKey: llm.openaiApiKey,
    }).chatModel(llm.openaiModel)
  }

  return undefined
}
