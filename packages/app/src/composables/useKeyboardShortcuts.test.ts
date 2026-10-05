import type { DispatchBinding } from './useKeyboardShortcuts'
import { afterEach, describe, expect, it } from 'vitest'
import { createKeyDispatcher, eventChord, isTypingTarget, normalizeChord } from './useKeyboardShortcuts'

function key(key: string, init: KeyboardEventInit = {}) {
  return new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, composed: true, ...init })
}

function setup(bindings: DispatchBinding[], options: { unavailable?: string[], blocked?: boolean } = {}) {
  const ran: string[] = []
  let time = 0
  const dispatcher = createKeyDispatcher({
    bindings: () => bindings,
    canRun: command => !options.unavailable?.includes(command),
    run: (command) => {
      if (options.unavailable?.includes(command))
        return false
      ran.push(command)
      return true
    },
    isBlocked: () => !!options.blocked,
    timeout: 1000,
    now: () => time,
  })
  return {
    ran,
    press: (name: string, init?: KeyboardEventInit) => dispatcher.handle(key(name, init)),
    tick: (ms: number) => {
      time += ms
    },
    dispatcher,
  }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('normalizeChord', () => {
  it('folds modifier aliases and orders them', () => {
    expect(normalizeChord('shift+cmd+K')).toBe('mod+shift+k')
    expect(normalizeChord('ctrl+k')).toBe('mod+k')
    expect(normalizeChord('option+meta+p')).toBe('mod+alt+p')
  })

  it('treats an uppercase letter as shift', () => {
    expect(normalizeChord('G')).toBe('shift+g')
    expect(normalizeChord('shift+g')).toBe('shift+g')
  })

  it('drops shift for symbols that already need it', () => {
    expect(normalizeChord('?')).toBe('?')
    expect(normalizeChord('shift+?')).toBe('?')
  })

  it('resolves key aliases', () => {
    expect(normalizeChord('esc')).toBe('escape')
    expect(normalizeChord('Enter')).toBe('enter')
    expect(normalizeChord('up')).toBe('arrowup')
  })
})

describe('eventChord', () => {
  it('matches normalizeChord for the same keys', () => {
    expect(eventChord(key('k', { metaKey: true }))).toBe(normalizeChord('mod+k'))
    expect(eventChord(key('k', { ctrlKey: true }))).toBe(normalizeChord('mod+k'))
    expect(eventChord(key('G', { shiftKey: true }))).toBe(normalizeChord('shift+g'))
    expect(eventChord(key('?', { shiftKey: true }))).toBe(normalizeChord('?'))
    expect(eventChord(key('Escape'))).toBe(normalizeChord('esc'))
  })

  it('ignores caps lock without shift', () => {
    expect(eventChord(key('G'))).toBe('g')
  })

  it('ignores lone modifiers and dead keys', () => {
    expect(eventChord(key('Shift', { shiftKey: true }))).toBeUndefined()
    expect(eventChord(key('Meta', { metaKey: true }))).toBeUndefined()
    expect(eventChord(key('Dead'))).toBeUndefined()
  })
})

describe('isTypingTarget', () => {
  it('recognises text fields', () => {
    const text = document.createElement('input')
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    expect(isTypingTarget(text)).toBe(true)
    expect(isTypingTarget(document.createElement('textarea'))).toBe(true)
    expect(isTypingTarget(checkbox)).toBe(false)
    expect(isTypingTarget(document.createElement('button'))).toBe(false)
  })

  it('recognises editable content and its descendants', () => {
    const editor = document.createElement('div')
    editor.setAttribute('contenteditable', 'true')
    const inner = document.createElement('span')
    editor.append(inner)
    expect(isTypingTarget(inner)).toBe(true)
  })
})

describe('createKeyDispatcher', () => {
  it('runs a single-key binding and consumes the event', () => {
    const { ran, dispatcher } = setup([{ keys: 'j', command: 'next' }])
    const event = key('j')
    expect(dispatcher.handle(event)).toBe(true)
    expect(event.defaultPrevented).toBe(true)
    expect(ran).toEqual(['next'])
  })

  it('leaves unbound keys alone', () => {
    const { ran, dispatcher } = setup([{ keys: 'j', command: 'next' }])
    const event = key('q')
    expect(dispatcher.handle(event)).toBe(false)
    expect(event.defaultPrevented).toBe(false)
    expect(ran).toEqual([])
  })

  it('does not match a binding when a modifier is held', () => {
    const { ran, press } = setup([{ keys: 'r', command: 'refresh' }, { keys: 'mod+k', command: 'palette' }])
    expect(press('r', { metaKey: true })).toBe(false)
    expect(press('k', { ctrlKey: true })).toBe(true)
    expect(ran).toEqual(['palette'])
  })

  it('distinguishes shifted letters', () => {
    const { ran, press } = setup([{ keys: 'g g', command: 'top' }, { keys: 'shift+g', command: 'bottom' }])
    press('G', { shiftKey: true })
    expect(ran).toEqual(['bottom'])
  })

  it('runs two-key sequences', () => {
    const { ran, press } = setup([{ keys: 'g h', command: 'home' }, { keys: 'g g', command: 'top' }])
    expect(press('g')).toBe(true)
    expect(ran).toEqual([])
    press('h')
    press('g')
    press('g')
    expect(ran).toEqual(['home', 'top'])
  })

  it('drops a sequence after the timeout and treats the key on its own', () => {
    const { ran, press, tick } = setup([{ keys: 'g h', command: 'home' }, { keys: 'h', command: 'help' }])
    press('g')
    tick(1500)
    press('h')
    expect(ran).toEqual(['help'])
  })

  it('falls back to the single key when the sequence has no continuation', () => {
    const { ran, press } = setup([{ keys: 'g h', command: 'home' }, { keys: 'j', command: 'next' }])
    press('g')
    expect(press('j')).toBe(true)
    expect(ran).toEqual(['next'])
  })

  it('does not wait on a prefix whose commands are all unavailable', () => {
    const { press } = setup([{ keys: 'g h', command: 'home' }], { unavailable: ['home'] })
    expect(press('g')).toBe(false)
  })

  it('tries the next binding for the same keys when one is unavailable', () => {
    const { ran, press } = setup(
      [{ keys: 'j', command: 'file.next' }, { keys: 'j', command: 'row.next' }],
      { unavailable: ['file.next'] },
    )
    press('j')
    expect(ran).toEqual(['row.next'])
  })

  it('ignores plain keys while typing, but not modifier chords or escape', () => {
    const { ran, dispatcher } = setup([
      { keys: 'j', command: 'next' },
      { keys: 'mod+k', command: 'palette' },
      { keys: 'esc', command: 'escape' },
    ])
    const input = document.createElement('input')
    document.body.append(input)
    input.addEventListener('keydown', dispatcher.handle)

    input.dispatchEvent(key('j'))
    input.dispatchEvent(key('k', { metaKey: true }))
    input.dispatchEvent(key('Escape'))
    expect(ran).toEqual(['palette', 'escape'])
  })

  it('lets buttons and links handle their own Enter', () => {
    const { ran, dispatcher } = setup([{ keys: 'enter', command: 'open' }])
    const button = document.createElement('button')
    document.body.append(button)
    button.addEventListener('keydown', dispatcher.handle)
    button.dispatchEvent(key('Enter'))
    expect(ran).toEqual([])
    expect(dispatcher.handle(key('Enter'))).toBe(true)
  })

  it('only passes modifier chords while blocked', () => {
    const { ran, press } = setup([{ keys: 'j', command: 'next' }, { keys: 'mod+k', command: 'palette' }], { blocked: true })
    expect(press('j')).toBe(false)
    expect(press('k', { metaKey: true })).toBe(true)
    expect(ran).toEqual(['palette'])
  })

  it('skips events another handler already took', () => {
    const { ran, dispatcher } = setup([{ keys: 'j', command: 'next' }])
    const event = key('j')
    event.preventDefault()
    expect(dispatcher.handle(event)).toBe(false)
    expect(ran).toEqual([])
  })
})
