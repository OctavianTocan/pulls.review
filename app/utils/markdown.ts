const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&#39;',
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, char => ESCAPE_MAP[char]!)
}

/**
 * Minimal inline-Markdown -> safe-HTML renderer for the short, model-generated blurbs
 * this app renders (`DiffGroup.summary`, `GroupedResult.overallSummary` - both
 * documented as "rendered as Markdown" in their schema `description`s). Not a full
 * CommonMark implementation (no headings/lists/code blocks/tables) - those fields are
 * explicitly scoped to a sentence or two, not a document.
 *
 * Always escapes the raw input first, then re-introduces exactly the few constructs
 * below as HTML - so there is no script/attribute injection surface regardless of what
 * a model (or a pasted diff's description) contains, without needing a sanitizer
 * dependency on top of a full Markdown parser.
 */
export function renderInlineMarkdown(text: string): string {
  let html = escapeHtml(text)

  // `[label](https://...)` - only http(s) links; anything else (`javascript:`, a bare
  // path, ...) is left as literal escaped text rather than turned into a link.
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  // Bold before italic - `**x**` would otherwise be seen as two adjacent italic markers.
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+)\*|_([^_]+)_/g, (_match, star, underscore) => `<em>${star ?? underscore}</em>`)

  return html
}
