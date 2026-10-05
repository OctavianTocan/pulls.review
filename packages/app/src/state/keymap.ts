import type { MessageSchema } from '../i18n'

/** Where a binding applies, which is also how the help sheet groups it. */
export type KeyScope = 'global' | 'pr' | 'home'

export interface KeyBinding {
  /** Chord or sequence in `DisplayKbd` syntax: `mod+k`, `g h`, `shift+g`, `?`. */
  keys: string
  /** Id of the command it runs, see `state/commands.ts`. */
  command: string
  scope: KeyScope
  /** i18n key of the help sheet label. */
  label: `keys.${Exclude<keyof MessageSchema['keys'], 'scope'>}`
}

export const COMMAND = {
  palette: 'palette.toggle',
  help: 'help.toggle',
  home: 'app.home',
  escape: 'app.escape',
  settings: 'app.settings',
  theme: 'app.theme',
  top: 'scroll.top',
  bottom: 'scroll.bottom',
  nextFile: 'file.next',
  prevFile: 'file.prev',
  nextHunk: 'hunk.next',
  prevHunk: 'hunk.prev',
  nextGroup: 'group.next',
  prevGroup: 'group.prev',
  toggleReviewed: 'file.reviewed',
  toggleFile: 'file.collapse',
  openFile: 'file.github',
  copyPath: 'file.copyPath',
  copyPermalink: 'file.copyPermalink',
  findFile: 'file.find',
  ask: 'chat.focus',
  analyze: 'pr.analyze',
  refresh: 'page.refresh',
  openPr: 'pr.github',
  layout: 'view.layout',
  groupNav: 'view.groupNav',
  threads: 'view.threads',
  analyzeMode: 'view.analyzeMode',
  nextRow: 'row.next',
  prevRow: 'row.prev',
  openRow: 'row.open',
  search: 'page.search',
} as const

/** Every built-in shortcut; the key dispatcher and the help sheet both read this. */
export const KEYMAP: readonly KeyBinding[] = [
  { keys: 'mod+k', command: COMMAND.palette, scope: 'global', label: 'keys.palette' },
  { keys: '?', command: COMMAND.help, scope: 'global', label: 'keys.help' },
  { keys: 'g h', command: COMMAND.home, scope: 'global', label: 'keys.home' },
  { keys: 'g g', command: COMMAND.top, scope: 'global', label: 'keys.top' },
  { keys: 'shift+g', command: COMMAND.bottom, scope: 'global', label: 'keys.bottom' },
  { keys: 'r', command: COMMAND.refresh, scope: 'global', label: 'keys.refresh' },
  { keys: 'esc', command: COMMAND.escape, scope: 'global', label: 'keys.escape' },

  { keys: 'j', command: COMMAND.nextFile, scope: 'pr', label: 'keys.nextFile' },
  { keys: 'k', command: COMMAND.prevFile, scope: 'pr', label: 'keys.prevFile' },
  { keys: 'n', command: COMMAND.nextHunk, scope: 'pr', label: 'keys.nextHunk' },
  { keys: 'p', command: COMMAND.prevHunk, scope: 'pr', label: 'keys.prevHunk' },
  { keys: ']', command: COMMAND.nextGroup, scope: 'pr', label: 'keys.nextGroup' },
  { keys: '[', command: COMMAND.prevGroup, scope: 'pr', label: 'keys.prevGroup' },
  { keys: 'x', command: COMMAND.toggleReviewed, scope: 'pr', label: 'keys.toggleReviewed' },
  { keys: 'e', command: COMMAND.toggleFile, scope: 'pr', label: 'keys.toggleFile' },
  { keys: 'o', command: COMMAND.openFile, scope: 'pr', label: 'keys.openFile' },
  { keys: 'shift+o', command: COMMAND.openPr, scope: 'pr', label: 'keys.openPr' },
  { keys: 'y', command: COMMAND.copyPath, scope: 'pr', label: 'keys.copyPath' },
  { keys: 'shift+y', command: COMMAND.copyPermalink, scope: 'pr', label: 'keys.copyPermalink' },
  { keys: '/', command: COMMAND.findFile, scope: 'pr', label: 'keys.findFile' },
  { keys: 'c', command: COMMAND.ask, scope: 'pr', label: 'keys.ask' },
  { keys: 'a', command: COMMAND.analyze, scope: 'pr', label: 'keys.analyze' },

  { keys: 'j', command: COMMAND.nextRow, scope: 'home', label: 'keys.nextRow' },
  { keys: 'k', command: COMMAND.prevRow, scope: 'home', label: 'keys.prevRow' },
  { keys: 'enter', command: COMMAND.openRow, scope: 'home', label: 'keys.openRow' },
  { keys: 'o', command: COMMAND.openRow, scope: 'home', label: 'keys.openRow' },
  { keys: '/', command: COMMAND.search, scope: 'home', label: 'keys.search' },
]

/**
 * The first built-in binding for a command, for showing next to it.
 *
 * @param command - The command id.
 * @returns The binding's keys, or `undefined` when it has none.
 */
export function keysFor(command: string): string | undefined {
  return KEYMAP.find(binding => binding.command === command)?.keys
}
