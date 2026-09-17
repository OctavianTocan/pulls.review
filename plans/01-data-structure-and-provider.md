# Phase 1: Data structures, providers, rule-based analysis (done)

Everything this plan described has shipped, and the project has since moved
past several of the plan's own assumptions:

- The app is plain Vite + `vue-router`, not Nuxt (`987e90e refactor: drop
Nuxt for plain Vite`); the whole "Project config changes" / Nuxt
  auto-imports section of the original plan no longer applies.
- Caching uses `idb-keyval`, not `unstorage`.
- The embed/userscript feature this plan listed as a future footnote has
  been built (`app/embed/`, `userscript/diffs-github.user.js`).

What's actually in place today, for reference: canonical `valibot` schemas
(`app/types/`), `patch-parser`, `github`/`paste` providers, the `rule-based`
analyze adapter (with `llm`/`web-llm` left as stubs), `idb-keyval`-backed
`pr-cache`/`review-cache`, the pure Vue components with Storybook stories, and
the `/gh/[owner]/[repo]/[number]` and `/upload` pages.

For current architecture and invariants, see
[`.agents/01-architecture.md`](../.agents/01-architecture.md). For remaining
work, see the plans below, split out from this one:

- [`02-llm-analyze-adapter.md`](./02-llm-analyze-adapter.md)
- [`03-web-llm-analyze-adapter.md`](./03-web-llm-analyze-adapter.md)
- [`04-local-provider.md`](./04-local-provider.md)
- [`05-comment-threads.md`](./05-comment-threads.md)
- [`06-userscript-embed-hardening.md`](./06-userscript-embed-hardening.md)
- [`07-vscode-extension.md`](./07-vscode-extension.md)
