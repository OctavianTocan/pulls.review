import type { AskSelection, AskTurn } from '@pulls.review/core/llm'
import type { DiffsPayload } from '@pulls.review/core/types'
import type { Ref } from 'vue'
import type { AskThread, DiffsStoreAsk } from './types'
import { resolveAskModel } from '@pulls.review/core/analyze'
import { askAboutSelection, isCliEngine, selectionLabel } from '@pulls.review/core/llm'
import { serializeRef } from '@pulls.review/core/types'
import { computed, reactive } from 'vue'
import { upsertActivities } from '../components/ai/ai-activity'
import { t } from '../i18n'
import { settings } from '../state/settings'
import { isAbortError, toError } from './run-errors'

export interface AskStoreOptions {
  /** The diff questions are about; threads are kept per diff. */
  diff: Ref<DiffsPayload | undefined>
}

// Module-level so a diff's threads survive leaving and reopening it within the page session.
const threadsByDiff = reactive(new Map<string, AskThread[]>())
const controllers = new Map<string, AbortController>()
let nextThreadId = 0

function sameLines(a: AskSelection, b: AskSelection): boolean {
  return a.path === b.path && a.side === b.side && a.startLine === b.startLine && a.endLine === b.endLine
}

/**
 * Questions about selected lines of one diff, answered by the CLI engine the ask settings name.
 * @param opts - The diff questions are about.
 * @returns The reactive ask store.
 */
export function createAskStore(opts: AskStoreOptions): DiffsStoreAsk {
  const { diff } = opts
  const scope = computed(() => diff.value && serializeRef(diff.value.ref))
  const threads = computed(() => (scope.value && threadsByDiff.get(scope.value)) || [])
  const available = computed(() => isCliEngine(resolveAskModel(settings.value.llm)?.model.provider ?? ''))

  function find(id: string): AskThread | undefined {
    return threads.value.find(thread => thread.id === id)
  }

  function open(selection: AskSelection): string {
    const key = scope.value
    if (!key)
      return ''
    const existing = threads.value.find(thread => sameLines(thread.selection, selection))
    if (existing)
      return existing.id
    const thread: AskThread = { id: `ask-${++nextThreadId}`, selection: { ...selection }, label: selectionLabel(selection), turns: [], isAsking: false }
    threadsByDiff.set(key, [...threads.value, thread])
    return thread.id
  }

  async function ask(id: string, question: string) {
    const thread = find(id)
    const loaded = diff.value
    const text = question.trim()
    if (!thread || !loaded || thread.isAsking || !text)
      return
    const history: AskTurn[] = thread.turns.flatMap(turn => turn.answer !== undefined ? [{ question: turn.question, answer: turn.answer }] : [])
    thread.turns.push({ question: text, activities: [], startedAt: Date.now() })
    const turn = thread.turns.at(-1)!
    const resolved = resolveAskModel(settings.value.llm)
    if (!resolved || !isCliEngine(resolved.model.provider)) {
      turn.error = t('ask.unavailable')
      turn.outcome = 'failed'
      return
    }

    const controller = new AbortController()
    controllers.set(id, controller)
    thread.isAsking = true
    try {
      const answer = await askAboutSelection(loaded, resolved, { selection: thread.selection, question: text, history }, {
        signal: controller.signal,
        onActivity: (incoming) => {
          turn.activities = upsertActivities(turn.activities ?? [], incoming)
        },
      })
      turn.answer = answer.text
      turn.usage = answer.usage
      turn.outcome = 'done'
    }
    catch (err) {
      const stopped = isAbortError(err)
      turn.error = stopped ? t('ask.stopped') : toError(err).message
      turn.outcome = stopped ? 'stopped' : 'failed'
    }
    finally {
      thread.isAsking = false
      controllers.delete(id)
    }
  }

  function stop(id: string) {
    controllers.get(id)?.abort()
  }

  function close(id: string) {
    stop(id)
    const key = scope.value
    if (key)
      threadsByDiff.set(key, threads.value.filter(thread => thread.id !== id))
  }

  return reactive({ available, threads, open, ask, stop, close }) as DiffsStoreAsk
}
