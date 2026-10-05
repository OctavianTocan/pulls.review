const MAX_FRAMES = 120

function scrollParent(el: HTMLElement): HTMLElement | undefined {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight)
      return node
  }
}

function nextFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()))
}

/**
 * Scrolls a finding's card in a file's diff to the middle of the viewport, waiting up to
 * about two seconds for the diff to render the card's line.
 * @param container - The element the file's diff is rendered into.
 * @param findingId - The finding whose card to reveal.
 * @param lineTop - Where the finding's line sits within `container`, for a diff that renders only the lines in view.
 * @returns Whether the card was found and scrolled to.
 */
export async function revealFinding(container: HTMLElement, findingId: string, lineTop?: number): Promise<boolean> {
  if (lineTop !== undefined) {
    const delta = container.getBoundingClientRect().top + lineTop - window.innerHeight / 2
    const scroller = scrollParent(container)
    if (scroller)
      scroller.scrollBy({ top: delta })
    else
      window.scrollBy({ top: delta })
  }
  const selector = `[data-finding-id="${CSS.escape(findingId)}"]`
  for (let frame = 0; frame < MAX_FRAMES; frame++) {
    const card = container.querySelector<HTMLElement>(selector)
    if (card && card.getBoundingClientRect().height > 0) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return true
    }
    await nextFrame()
  }
  return false
}
