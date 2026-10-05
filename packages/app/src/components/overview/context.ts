import type { InjectionKey } from 'vue'
import type { PrOverviewStore } from '../../stores/pr-overview-store'
import type { CommitSelection } from './commit-selection'
import { useLocalStorage } from '@vueuse/core'
import { inject, reactive, ref } from 'vue'

export type OverviewTab = 'conversation' | 'commits' | 'checks'

/** What the PR page shares with the header, the overview panel and the commit banner. */
export interface PrOverviewContext {
  store: PrOverviewStore
  /** The commits the diff is narrowed to; unset shows every change. */
  readonly selection: CommitSelection | undefined
  select: (selection: CommitSelection | undefined) => void
  readonly open: boolean
  readonly tab: OverviewTab
  /** Bumped whenever something asks to bring the panel into view. */
  readonly focusRequest: number
  setOpen: (open: boolean) => void
  setTab: (tab: OverviewTab) => void
  /** Opens the panel on `tab` and scrolls it into view. */
  show: (tab: OverviewTab) => void
}

export const prOverviewKey: InjectionKey<PrOverviewContext> = Symbol('pr-overview')

/**
 * The overview context of the PR page this component renders in.
 * @returns The context, or `undefined` outside a GitHub PR page.
 */
export function usePrOverview(): PrOverviewContext | undefined {
  return inject(prOverviewKey, undefined)
}

const panelOpen = useLocalStorage('overview:open', true)
const panelTab = useLocalStorage<OverviewTab>('overview:tab', 'conversation')

/**
 * Builds the context for one PR page.
 * @param store The PR's overview store.
 * @param selection Reads the current commit selection.
 * @param select Navigates to a commit selection, or back to every change.
 * @returns The reactive context to `provide` under `prOverviewKey`.
 */
export function createPrOverviewContext(store: PrOverviewStore, selection: () => CommitSelection | undefined, select: (selection: CommitSelection | undefined) => void): PrOverviewContext {
  const focusRequest = ref(0)
  return reactive({
    store,
    get selection() {
      return selection()
    },
    select,
    open: panelOpen,
    tab: panelTab,
    focusRequest,
    setOpen: (open: boolean) => {
      panelOpen.value = open
    },
    setTab: (tab: OverviewTab) => {
      panelTab.value = tab
    },
    show: (tab: OverviewTab) => {
      panelTab.value = tab
      panelOpen.value = true
      focusRequest.value++
    },
  }) as PrOverviewContext
}
