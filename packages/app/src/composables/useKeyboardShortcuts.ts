import type { MaybeRefOrGetter } from 'vue'
import { useEventListener } from '@vueuse/core'
import { computed } from 'vue'
import { commands, findCommand, runCommand } from '../state/commands'
import { KEYMAP } from '../state/keymap'

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'OS', 'Super', 'Hyper', 'Fn', 'FnLock', 'CapsLock', 'NumLock', 'ScrollLock'])
const IGNORED_KEYS = new Set(['Dead', 'Unidentified', 'Process'])
const KEY_ALIASES: Record<string, string> = {
  'esc': 'escape',
  'return': 'enter',
  ' ': 'space',
  'up': 'arrowup',
  'down': 'arrowdown',
  'left': 'arrowleft',
  'right': 'arrowright',
}
const MODIFIER_ALIASES: Record<string, 'mod' | 'alt' | 'shift'> = {
  mod: 'mod',
  cmd: 'mod',
  command: 'mod',
  meta: 'mod',
  ctrl: 'mod',
  control: 'mod',
  alt: 'alt',
  option: 'alt',
  shift: 'shift',
}
const NON_TEXT_INPUTS = new Set(['button', 'checkbox', 'color', 'file', 'image', 'radio', 'range', 'reset', 'submit'])

/** Canonical chord: modifiers in `mod`, `alt`, `shift` order, a lowercased key, shift only where it changes a letter. */
function canonical(modifiers: Set<string>, rawKey: string): string {
  const key = KEY_ALIASES[rawKey.toLowerCase()] ?? (rawKey.length === 1 ? rawKey : rawKey.toLowerCase())
  let name = key
  if (key.length === 1) {
    const lower = key.toLowerCase()
    if (lower === key.toUpperCase())
      modifiers.delete('shift')
    else if (key !== lower)
      modifiers.add('shift')
    name = lower
  }
  return [...['mod', 'alt', 'shift'].filter(modifier => modifiers.has(modifier)), name].join('+')
}

/**
 * Canonical form of one chord as written in a binding, so it compares equal to {@link eventChord}.
 * `ctrl`, `cmd` and `mod` all mean "ctrl or ⌘"; `G` and `shift+g` are the same chord.
 *
 * @param chord - A chord like `mod+k`, `shift+G`, `esc` or `?`.
 * @returns The canonical chord.
 */
export function normalizeChord(chord: string): string {
  const tokens = chord.trim().split('+').filter(Boolean)
  const modifiers = new Set<string>()
  let key = ''
  for (const token of tokens) {
    const modifier = MODIFIER_ALIASES[token.toLowerCase()]
    if (modifier)
      modifiers.add(modifier)
    else
      key = token
  }
  return canonical(modifiers, key)
}

/**
 * Canonical chord for a keydown, comparable to {@link normalizeChord}.
 *
 * @param event - The keydown event.
 * @returns The chord, or `undefined` for a lone modifier, dead key or IME input.
 */
export function eventChord(event: KeyboardEvent): string | undefined {
  if (MODIFIER_KEYS.has(event.key) || IGNORED_KEYS.has(event.key) || !event.key)
    return undefined
  const modifiers = new Set<string>()
  if (event.ctrlKey || event.metaKey)
    modifiers.add('mod')
  if (event.altKey)
    modifiers.add('alt')
  if (event.shiftKey)
    modifiers.add('shift')
  // Caps Lock alone reports an uppercase letter; only the Shift key makes it `shift+…`.
  const key = event.key.length === 1 && !event.shiftKey ? event.key.toLowerCase() : event.key
  return canonical(modifiers, key)
}

const sequences = new Map<string, string[]>()
function parseSequence(keys: string): string[] {
  let parsed = sequences.get(keys)
  if (!parsed) {
    parsed = keys.trim().split(/\s+/).map(normalizeChord)
    sequences.set(keys, parsed)
  }
  return parsed
}

/**
 * Whether keys pressed on this element are text input rather than shortcuts.
 *
 * @param target - The element focused or receiving the key.
 * @returns `true` for text fields, textareas, selects and editable content.
 */
export function isTypingTarget(target: EventTarget | null | undefined): boolean {
  if (!(target instanceof HTMLElement))
    return false
  if (target instanceof HTMLInputElement)
    return !NON_TEXT_INPUTS.has(target.type)
  return target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || target.isContentEditable
    || !!target.closest('[contenteditable=""],[contenteditable="true"],[contenteditable="plaintext-only"]')
}

/** Elements whose own Enter/Space behaviour must win over a shortcut. */
function isActivatable(target: EventTarget | null | undefined): boolean {
  return target instanceof Element && !!target.closest('a[href],button,summary,select,[role="button"],[role="link"],[role="checkbox"],[role="menuitem"],[role="option"],[role="tab"]')
}

function hasModifier(chord: string): boolean {
  return chord.startsWith('mod+') || chord.startsWith('alt+')
}

/** A key binding the dispatcher matches against. */
export interface DispatchBinding {
  keys: string
  command: string
}

export interface KeyDispatcherOptions {
  /** The bindings in priority order; read on every key. */
  bindings: () => readonly DispatchBinding[]
  /** Whether a command can run now, which decides if a sequence prefix is worth waiting on. */
  canRun: (command: string) => boolean
  /** Runs a command; returns whether it actually ran. */
  run: (command: string) => boolean
  /** While true for a key (e.g. a dialog is open), only chords with ctrl/⌘/alt go through. */
  isBlocked?: (event: KeyboardEvent) => boolean
  /** How long a sequence like `g h` waits for its next key, in ms. */
  timeout?: number
  now?: () => number
}

export interface KeyDispatcher {
  /**
   * Handles one keydown, running the bound command when the keys complete a binding.
   *
   * @param event - The keydown event.
   * @returns Whether the event was consumed (default prevented, propagation stopped).
   */
  handle: (event: KeyboardEvent) => boolean
  /** Forgets any half-typed sequence. */
  reset: () => void
}

/**
 * A keyboard shortcut dispatcher, independent of where its events come from.
 * Keys typed into text fields are left alone, except chords with ctrl/⌘/alt and Escape.
 *
 * @param options - Bindings and how to run commands.
 * @returns The dispatcher.
 */
export function createKeyDispatcher(options: KeyDispatcherOptions): KeyDispatcher {
  const timeout = options.timeout ?? 1000
  const now = options.now ?? Date.now
  let pending: string[] = []
  let pendingAt = 0

  function match(sequence: string[]) {
    const exact: string[] = []
    let prefix = false
    for (const binding of options.bindings()) {
      const keys = parseSequence(binding.keys)
      if (keys.length < sequence.length || !sequence.every((chord, i) => keys[i] === chord))
        continue
      if (keys.length === sequence.length)
        exact.push(binding.command)
      else if (!prefix && options.canRun(binding.command))
        prefix = true
    }
    return { exact, prefix }
  }

  function consume(event: KeyboardEvent) {
    event.preventDefault()
    event.stopPropagation()
  }

  function handle(event: KeyboardEvent): boolean {
    if (event.defaultPrevented || event.isComposing)
      return false
    const chord = eventChord(event)
    if (!chord)
      return false

    const target = event.composedPath()[0] ?? event.target
    const restricted = options.isBlocked?.(event) || (isTypingTarget(target) && chord !== 'escape')
    if ((restricted && !hasModifier(chord)) || ((chord === 'enter' || chord === 'space') && isActivatable(target))) {
      pending = []
      return false
    }

    if (pending.length && now() - pendingAt > timeout)
      pending = []
    const attempts = pending.length ? [[...pending, chord], [chord]] : [[chord]]
    pending = []
    for (const sequence of attempts) {
      const { exact, prefix } = match(sequence)
      if (exact.some(command => options.run(command))) {
        consume(event)
        return true
      }
      if (prefix) {
        pending = sequence
        pendingAt = now()
        consume(event)
        return true
      }
    }
    return false
  }

  return {
    handle,
    reset: () => {
      pending = []
    },
  }
}

/**
 * Every live binding: the built-in `KEYMAP`, then the `shortcut` of each registered command.
 */
export const liveBindings = computed<DispatchBinding[]>(() => [
  ...KEYMAP,
  ...commands.value.flatMap(command => command.shortcut ? [{ keys: command.shortcut, command: command.id }] : []),
])

/**
 * Runs registered commands from their keyboard shortcuts while this scope is alive.
 *
 * @param target - Where keys are listened for: the window for the site, the drawer inside the
 * GitHub embed so only keys pressed while it has focus count.
 * @param root - Where open dialogs are looked for; keys pause while one is open.
 */
export function useKeyboardShortcuts(
  target: MaybeRefOrGetter<EventTarget | null | undefined> = window,
  root: () => Document | ShadowRoot = () => document,
): void {
  // Checked as the key arrives: a dialog's own Escape handler may close it before this one runs.
  const blocked = new WeakSet<Event>()
  const dispatcher = createKeyDispatcher({
    bindings: () => liveBindings.value,
    canRun: command => !!findCommand(command),
    run: runCommand,
    isBlocked: event => blocked.has(event),
  })
  useEventListener(target, 'keydown', (event: KeyboardEvent) => {
    if (root().querySelector('[aria-modal="true"]'))
      blocked.add(event)
  }, { capture: true })
  useEventListener(target, 'keydown', dispatcher.handle)
}

/**
 * The focused element, looking inside shadow roots.
 *
 * @param root - Where to start, e.g. the document or the embed's shadow root.
 * @returns The innermost focused element, or `undefined` when nothing is focused there.
 */
export function deepActiveElement(root: Document | ShadowRoot = document): HTMLElement | undefined {
  let active = root.activeElement
  while (active?.shadowRoot?.activeElement)
    active = active.shadowRoot.activeElement
  return active instanceof HTMLElement ? active : undefined
}
