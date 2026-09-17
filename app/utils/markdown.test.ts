import { describe, expect, it } from 'vitest'
import { renderInlineMarkdown } from './markdown'

describe('renderInlineMarkdown', () => {
  it('escapes raw HTML instead of letting it through', () => {
    expect(renderInlineMarkdown('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('renders bold, italic, and code spans', () => {
    expect(renderInlineMarkdown('**bold**')).toBe('<strong>bold</strong>')
    expect(renderInlineMarkdown('*italic*')).toBe('<em>italic</em>')
    expect(renderInlineMarkdown('_italic_')).toBe('<em>italic</em>')
    expect(renderInlineMarkdown('`code`')).toBe('<code>code</code>')
  })

  it('renders an http(s) link but leaves other schemes as literal text', () => {
    expect(renderInlineMarkdown('[docs](https://example.com/a?b=c)')).toBe('<a href="https://example.com/a?b=c" target="_blank" rel="noopener noreferrer">docs</a>')
    expect(renderInlineMarkdown('[x](javascript:alert(1))')).toBe('[x](javascript:alert(1))')
  })

  it('never lets an injected attribute break out of the generated tag', () => {
    const result = renderInlineMarkdown('[x](https://a.com/" onmouseover="alert(1))')
    expect(result).not.toContain('" onmouseover="alert(1)')
  })
})
