# Embedded playground

Loads the built `<diffs-embed-panel>` custom element directly (no GitHub page, no
userscript manager) for quick manual testing of the embed build.

```bash
pnpm run build:embed      # writes public/embed/diffs-embed.js
pnpm run playground:embedded   # vite dev, opened at /playgrounds/embedded/
```

The page has owner/repo/PR# inputs (defaulting to a real small PR) and a button that
flips `document.documentElement.dataset.colorMode` - the same attribute the userscript
reads from GitHub's own page to seed the embed's dark mode - so both the light/dark
shadow-root styling and a fresh PR load can be exercised without touching github.com.
