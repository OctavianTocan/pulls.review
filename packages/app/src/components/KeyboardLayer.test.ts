import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { i18n } from '../i18n'
import { registerCommand } from '../state/commands'
import { activeFile } from '../state/navigation'
import { helpOpen, paletteOpen } from '../state/palette'
import KeyboardLayer from './KeyboardLayer.vue'

function press(target: EventTarget, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

const cleanups: (() => void)[] = []
afterEach(() => {
  cleanups.splice(0).forEach(cleanup => cleanup())
  paletteOpen.value = false
  helpOpen.value = false
  activeFile.value = undefined
  document.body.innerHTML = ''
})

function setup(props: Record<string, unknown> = {}) {
  const wrapper = mount(KeyboardLayer, { props, attachTo: document.body, global: { plugins: [i18n] } })
  cleanups.push(() => wrapper.unmount())
  return wrapper
}

describe('keyboard layer', () => {
  it('opens the palette with mod+k and runs the ranked command on Enter', async () => {
    const hello = vi.fn()
    const other = vi.fn()
    cleanups.push(registerCommand(() => [
      { id: 'test.other', title: 'Toggle something', run: other },
      { id: 'test.hello', title: 'Say hello', run: hello },
    ]))
    setup()

    press(document.body, 'k', { ctrlKey: true })
    expect(paletteOpen.value).toBe(true)
    await nextTick()
    await nextTick()

    const input = document.body.querySelector<HTMLInputElement>('input[role="combobox"]')!
    expect(document.activeElement).toBe(input)
    input.value = 'hel'
    input.dispatchEvent(new Event('input'))
    await nextTick()
    const options = [...document.body.querySelectorAll('[role="option"]')].map(option => option.textContent?.trim())
    expect(options[0]).toBe('Say hello')
    expect(options).not.toContain('Toggle something')

    press(input, 'Enter')
    expect(paletteOpen.value).toBe(false)
    await nextTick()
    await nextTick()
    expect(hello).toHaveBeenCalledOnce()
    expect(other).not.toHaveBeenCalled()
  })

  it('closes a dialog on Escape without also clearing the selection', async () => {
    setup()
    activeFile.value = 'abc'

    press(document.body, '?')
    expect(helpOpen.value).toBe(true)
    await nextTick()
    expect(document.body.querySelector('[aria-modal="true"]')).not.toBeNull()

    press(document.body, 'Escape')
    expect(helpOpen.value).toBe(false)
    expect(activeFile.value).toBe('abc')

    await nextTick()
    press(document.body, 'Escape')
    expect(activeFile.value).toBeUndefined()
  })

  it('only listens inside its target when given one', async () => {
    const inside = document.createElement('div')
    const outside = document.createElement('div')
    document.body.append(inside, outside)
    setup({ target: inside })

    expect(press(outside, '?').defaultPrevented).toBe(false)
    expect(helpOpen.value).toBe(false)

    expect(press(inside, '?').defaultPrevented).toBe(true)
    expect(helpOpen.value).toBe(true)
  })

  it('leaves keys typed into a text field alone', () => {
    setup()
    const field = document.createElement('input')
    document.body.append(field)
    field.focus()

    expect(press(field, '?').defaultPrevented).toBe(false)
    expect(helpOpen.value).toBe(false)
  })
})
