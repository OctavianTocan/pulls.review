import type { Provider } from '../types/provider'
import { GithubProvider } from '../providers/github'
import { PasteProvider } from '../providers/paste'

const providers: Record<'github' | 'paste', Provider> = {
  github: GithubProvider,
  paste: PasteProvider,
}

export function useProvider(id: 'github' | 'paste'): Provider {
  return providers[id]
}
