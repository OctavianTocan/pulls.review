# Diffs userscript

Embeds a Diffs review drawer directly into `github.com` pull request pages.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Open [`diffs-github.user.js`](./diffs-github.user.js?raw=true) and let your extension pick it up (or create a new script and paste its contents in).
3. Visit any `github.com/{owner}/{repo}/pull/{number}` page - a "Diffs" tab appears on the right edge; click it to open the drawer.

Heavily work in progress: the embedded page currently renders the full Diffs UI (its own header included) rather than a layout tuned for a narrow drawer.
