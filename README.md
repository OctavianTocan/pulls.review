# Diffs

[diffs.antfu.dev](https://diffs.antfu.dev)

> [!WARNING]
> Heavily work in progress. Expect breaking changes, missing polish, and things that don't work yet.

Review pull request with grouped, summarized, and beautiful diffs to be more focused and efficient.

## Userscript

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Open [`diffs-github.user.js`](https://diffs.antfu.dev/diffs-github.user.js) and let your extension pick it up (or create a new script and paste its contents in).
3. Visit any `github.com/{owner}/{repo}/pull/{number}` page - a "Diffs" tab appears on the right edge; click it to open the drawer.
4. Drag the drawer's left edge to resize it - the width is remembered (`localStorage`, per-browser) for next time.
