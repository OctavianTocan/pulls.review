import type { CliModelCatalog } from '@pulls.review/core/local-rpc'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { resetCliModels, useCliModels } from './useCliModels'

const mocks = vi.hoisted(() => ({
  rpc: {} as object | undefined,
  listCliModels: vi.fn(),
}))

vi.mock('../local/ai-rpc', () => ({ getAiRpc: () => mocks.rpc }))
vi.mock('../local/ai-jobs', () => ({ listCliModels: mocks.listCliModels }))

const claude: CliModelCatalog = { engine: 'claude-code', models: [{ id: 'opus', name: 'Opus', efforts: ['low', 'high'] }], account: 'Claude Max' }

beforeEach(() => {
  resetCliModels()
  mocks.rpc = {}
  mocks.listCliModels.mockReset().mockResolvedValue(claude)
})

describe('useCliModels', () => {
  it('fetches an engine\'s catalog once and shares it', async () => {
    const first = useCliModels('claude-code')
    const second = useCliModels('claude-code')
    await flushPromises()

    expect(mocks.listCliModels).toHaveBeenCalledOnce()
    expect(first.catalog.value).toEqual(claude)
    expect(second.catalog.value).toEqual(claude)
    expect(first.loading.value).toBe(false)
  })

  it('fetches again when the engine changes or on refresh', async () => {
    const engine = ref<'claude-code' | 'codex'>('claude-code')
    const models = useCliModels(engine)
    await flushPromises()
    engine.value = 'codex'
    await flushPromises()
    await models.refresh()

    expect(mocks.listCliModels.mock.calls.map(call => call[1])).toEqual(['claude-code', 'codex', 'codex'])
  })

  it('keeps the last catalog and reports the error when a refresh fails', async () => {
    const models = useCliModels('claude-code')
    await flushPromises()
    mocks.listCliModels.mockRejectedValue(new Error('claude: command not found'))
    await models.refresh()

    expect(models.catalog.value).toEqual(claude)
    expect(models.error.value).toBe('claude: command not found')
  })

  it('reports an error without a server connection', async () => {
    mocks.rpc = undefined
    const models = useCliModels('codex')
    await flushPromises()

    expect(models.error.value).toBeTruthy()
    expect(mocks.listCliModels).not.toHaveBeenCalled()
  })
})
