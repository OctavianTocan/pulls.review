import type { DiffsPayload } from '@pulls.review/core/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { settings } from '../state/settings'
import { createAskStore } from './ask-store'

const mocks = vi.hoisted(() => ({ askAboutSelection: vi.fn() }))

vi.mock('@pulls.review/core/llm', async importOriginal => ({
  ...await importOriginal<typeof import('@pulls.review/core/llm')>(),
  askAboutSelection: mocks.askAboutSelection,
}))

let prNumber = 0
function newDiff(): DiffsPayload {
  return { ref: { kind: 'github-pr', owner: 'o', repo: 'r', number: String(++prNumber) }, title: 'PR', files: [] }
}

const selection = { path: 'a.ts', side: 'additions', startLine: 10, endLine: 20 } as const
const originalLlm = settings.value.llm

beforeEach(() => {
  mocks.askAboutSelection.mockReset()
  settings.value.llm = { ...originalLlm, provider: 'claude-code', askProvider: '' }
})

afterEach(() => {
  settings.value.llm = originalLlm
})

describe('createAskStore', () => {
  it('opens one thread per selection and labels it', () => {
    const store = createAskStore({ diff: ref(newDiff()) })
    const id = store.open(selection)
    expect(store.open({ ...selection })).toBe(id)
    expect(store.threads).toHaveLength(1)
    expect(store.threads[0]!.label).toBe('a.ts:L10-L20')
  })

  it('answers follow-ups with the earlier turns as history', async () => {
    mocks.askAboutSelection
      .mockResolvedValueOnce({ text: 'It parses.', usage: { costUsd: 0.01 } })
      .mockResolvedValueOnce({ text: 'Yes.' })
    const store = createAskStore({ diff: ref(newDiff()) })
    const id = store.open(selection)

    await store.ask(id, '  What does this do? ')
    await store.ask(id, 'Is it safe?')

    expect(mocks.askAboutSelection.mock.calls[1]![2]).toEqual({
      selection,
      question: 'Is it safe?',
      history: [{ question: 'What does this do?', answer: 'It parses.' }],
    })
    expect(store.threads[0]!.turns).toMatchObject([
      { question: 'What does this do?', answer: 'It parses.', usage: { costUsd: 0.01 }, outcome: 'done' },
      { question: 'Is it safe?', answer: 'Yes.', usage: undefined, outcome: 'done' },
    ])
  })

  it('keeps a diff\'s threads when it is opened again', () => {
    const diff = newDiff()
    createAskStore({ diff: ref(diff) }).open(selection)
    expect(createAskStore({ diff: ref(diff) }).threads).toHaveLength(1)
    expect(createAskStore({ diff: ref(newDiff()) }).threads).toHaveLength(0)
  })

  it('marks a stopped answer and drops a closed thread', async () => {
    mocks.askAboutSelection.mockImplementation((_diff, _resolved, _request, options: { signal: AbortSignal }) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const store = createAskStore({ diff: ref(newDiff()) })
    const id = store.open(selection)
    const asking = store.ask(id, 'Why?')
    expect(store.threads[0]!.isAsking).toBe(true)

    store.stop(id)
    await asking
    expect(store.threads[0]!.isAsking).toBe(false)
    expect(store.threads[0]!.turns[0]!.error).toBeTruthy()
    expect(store.threads[0]!.turns[0]!.answer).toBeUndefined()

    store.close(id)
    expect(store.threads).toHaveLength(0)
  })

  it('explains instead of asking without a CLI engine', async () => {
    settings.value.llm = { ...settings.value.llm, provider: 'anthropic', anthropicApiKey: 'key' }
    const store = createAskStore({ diff: ref(newDiff()) })
    expect(store.available).toBe(false)
    const id = store.open(selection)
    await store.ask(id, 'Why?')
    expect(mocks.askAboutSelection).not.toHaveBeenCalled()
    expect(store.threads[0]!.turns[0]!.error).toBeTruthy()
  })
})
