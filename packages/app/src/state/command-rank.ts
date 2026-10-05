/** Score floor for a needle whose characters only appear scattered, in order, across the text. */
export const SCATTERED = 1_000_000

const TIER = { word: 1_000, inside: 10_000, initials: 100_000 }
const BREAK = /[\s\-_/.:]/

/**
 * Filters and orders items by how well `query` matches each one's text: a match at the very
 * start beats one at a word start, which beats one inside a word, then word initials, then
 * scattered characters. Ties keep the input order; an empty query returns every item.
 *
 * @param items - Candidates, in their default order.
 * @param query - What the user typed; whitespace separates terms that must all match.
 * @param text - The searchable text of an item.
 * @returns The matching items, best first.
 */
export function rankItems<T>(items: readonly T[], query: string, text: (item: T) => string): T[] {
  const needle = query.trim().toLowerCase()
  if (!needle)
    return [...items]
  const scored: { item: T, score: number, at: number }[] = []
  items.forEach((item, at) => {
    const score = rank(text(item).toLowerCase(), needle)
    if (score !== null)
      scored.push({ item, score, at })
  })
  scored.sort((a, b) => a.score - b.score || a.at - b.at)
  return scored.map(entry => entry.item)
}

/**
 * Scores how well `needle` matches `hay`; lower is better.
 *
 * @param hay - Lowercased text to search in.
 * @param needle - Lowercased, trimmed query; whitespace separates terms that must all match.
 * @returns The score, or `null` when it doesn't match at all.
 */
export function rank(hay: string, needle: string): number | null {
  const terms = needle.split(/\s+/).filter(term => term !== '')
  if (terms.length > 1)
    return rankTerms(hay, terms)

  const whole = hay.indexOf(needle)
  if (whole === 0)
    return 0
  if (whole > 0)
    return (BREAK.test(hay[whole - 1] ?? '') ? TIER.word : TIER.inside) + whole

  const initials = onWordStarts(hay, needle)
  if (initials !== null)
    return TIER.initials + initials

  const span = scatteredSpan(hay, needle)
  return span === null ? null : SCATTERED + span
}

/** The worst score among terms that must all match. */
function rankTerms(hay: string, terms: string[]): number | null {
  let worst = 0
  for (const term of terms) {
    const score = rank(hay, term)
    if (score === null)
      return null
    worst = Math.max(worst, score)
  }
  return worst
}

/** Distance from the first to the last character when the needle's characters appear in order. */
function scatteredSpan(hay: string, needle: string): number | null {
  let from = 0
  let first = -1
  let last = -1
  for (const char of needle) {
    if (char === ' ')
      continue
    const found = hay.indexOf(char, from)
    if (found === -1)
      return null
    if (first === -1)
      first = found
    last = found
    from = found + 1
  }
  return last - first
}

/** Where the needle ends when each character starts a word or directly follows the previous one. */
function onWordStarts(hay: string, needle: string): number | null {
  let at = -1
  for (const char of needle.replace(/\s/g, '')) {
    let found = -1
    for (let i = at + 1; i < hay.length; i++) {
      if (hay[i] !== char)
        continue
      if (i === at + 1 || i === 0 || BREAK.test(hay[i - 1] ?? '')) {
        found = i
        break
      }
    }
    if (found === -1)
      return null
    at = found
  }
  return at
}
