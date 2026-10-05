import type { CliModelCatalog, LlmEngine } from '@pulls.review/core/local-rpc'
import type { MaybeRefOrGetter } from 'vue'
import { computed, reactive, toValue, watch } from 'vue'
import { listCliModels } from '../local/ai-jobs'
import { getAiRpc } from '../local/ai-rpc'

/** A CLI engine's model list, as the settings show it. */
export interface CliModelsState {
  /** Kept from the last successful fetch when a refresh fails. */
  catalog?: CliModelCatalog
  loading: boolean
  /** Why the last fetch failed. */
  error?: string
}

// Shared across every settings panel and picker: asking a CLI for its models spawns a process on the server.
const entries = reactive<Partial<Record<LlmEngine, CliModelsState>>>({})

async function load(engine: LlmEngine, force = false): Promise<void> {
  const existing = entries[engine]
  if (existing?.loading || (existing?.catalog && !force))
    return
  const rpc = getAiRpc()
  if (!rpc) {
    entries[engine] = { loading: false, error: 'not connected to the pulls.review server' }
    return
  }
  entries[engine] = { catalog: existing?.catalog, loading: true }
  try {
    entries[engine] = { catalog: await listCliModels(rpc, engine), loading: false }
  }
  catch (err) {
    entries[engine] = { catalog: existing?.catalog, loading: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * The models a CLI engine reports, fetched once per engine and shared.
 * @param engine - The engine to list; nothing is fetched while it is unset.
 * @returns The catalog (kept across failed refreshes), whether it is loading, the last error, and `refresh` to ask the CLI again.
 */
export function useCliModels(engine: MaybeRefOrGetter<LlmEngine | undefined>) {
  const entry = computed(() => {
    const current = toValue(engine)
    return current ? entries[current] : undefined
  })

  watch(() => toValue(engine), (current) => {
    if (current)
      void load(current)
  }, { immediate: true })

  return {
    catalog: computed(() => entry.value?.catalog),
    loading: computed(() => entry.value?.loading ?? false),
    error: computed(() => entry.value?.error),
    refresh: async () => {
      const current = toValue(engine)
      if (current)
        await refreshCliModels(current)
    },
  }
}

/**
 * Asks a CLI engine for its models again, for every picker showing them.
 * @param engine - The engine to ask.
 */
export function refreshCliModels(engine: LlmEngine): Promise<void> {
  return load(engine, true)
}

/** Forgets every fetched catalog; for tests. */
export function resetCliModels(): void {
  for (const engine of Object.keys(entries) as LlmEngine[])
    delete entries[engine]
}
