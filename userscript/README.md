# Diffs userscript

Embeds a Diffs review drawer directly into `github.com` pull request pages.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Open [`diffs-github.user.js`](https://github.com/antfu/diffs/raw/refs/heads/main/userscript/diffs-github.user.js) and let your extension pick it up (or create a new script and paste its contents in).
3. Visit any `github.com/{owner}/{repo}/pull/{number}` page - a "Diffs" tab appears on the right edge; click it to open the drawer.
4. Drag the drawer's left edge to resize it - the width is remembered (`localStorage`, per-browser) for next time.

The drawer renders a Vue custom element (`<diffs-embed-panel>`, `@require`d from
`https://diffs.antfu.dev/embed/diffs-embed.js`) directly inside the GitHub page - not
an `<iframe>`. GitHub's own CSP blocks cross-origin frames outright, with no
per-script workaround; plain injected JS/CSS isn't restricted the same way.

Known limitations (heavily work in progress):

- The embedded panel currently renders the full Diffs UI (its own header included)
  rather than a layout tuned for a narrow drawer.
- Settings (GitHub token) and reviewed-file marks are stored under github.com's own
  origin, separate from `diffs.antfu.dev` - configuring one doesn't carry over to the
  other.
- The `@require`d bundle is a few MB (full Shiki syntax highlighting, not code-split,
  since GitHub's CSP also blocks any further runtime chunk request) and loads on
  every matching PR page visit, whether or not the drawer is opened.
