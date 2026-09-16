# Diffs — Implementation Plan (Phase 1: Data Structure, Provider, Components, Storybook)

## Scope recap

**In scope this phase:** canonical data types, `Provider` abstraction + `github` implementation (diff/metadata only), a shared unified-diff/patch text parser, a `paste` provider built on that parser (paste/upload an arbitrary `.diff`/`.patch` file), `AnalyzeAdapter` abstraction with the `rule-based` adapter implemented, IndexedDB caching w/ LRU, minimal Settings (GitHub PAT only), pure data-driven Vue components, Storybook for every component, the `/gh/owner/repo/number` and `/paste/[hash]` pages wiring it together.

**Explicitly deferred:** `llm` and `web-llm` analyze adapters (stubbed as TODO, not implemented), comment read/write, review actions, `local` CLI provider (interface must accommodate it, not build it).

---

## 1. Project config changes

- `nuxt.config.ts`: add `ssr: false`, remove `nitro.prerender` server-oriented config, keep `typedPages`. Build target is `nuxt generate` → static `.output/public`.
- Disable Nuxt auto-imports for explicit imports everywhere: `imports: { autoImport: false }` and `components: false`. Consequences to account for:
  - Drop `@vueuse/nuxt` in favor of plain `@vueuse/core`, imported explicitly (`import { useLocalStorage } from '@vueuse/core'`).
  - `@pinia/nuxt` still registers the module/plugin correctly with autoImport off; import `defineStore`/`storeToRefs` explicitly from `pinia`.
  - Nuxt-specific utilities (`useRoute`, `useState`, `definePageMeta`, etc.) are imported explicitly from the `#imports` virtual module instead of relying on global auto-import.
  - All components imported explicitly with `<script setup>` `import` statements — no more auto-registration by filename.
- Delete `Dockerfile` (no server to run) and `netlify.toml` (target is Vercel, not Netlify).
- Add `vercel.json` with a catch-all rewrite to Nuxt's static-hosting fallback file (`/(.*)` → `/200.html`) — needed because `/gh/[owner]/[repo]/[number]` and `/paste/[hash]` are dynamic routes that can't be prerendered at build time; without the rewrite, a direct/refreshed visit to one 404s instead of falling through to client-side routing. Vercel otherwise auto-detects the Nuxt framework and runs `nuxt generate` with no further config.
- Replace Vitesse placeholder content (`app/pages/index.vue`, `app/pages/hi/[id].vue`, `app/pages/[...all].vue`, `app/components/Logos.vue`, `Counter.vue`, `InputEntry.vue`, `PageView.vue`, `server/api/pageview.ts`, `app/composables/count.ts`, `app/composables/user.ts`) — all Vitesse demo cruft, delete.
- Add `@antfu/design` (+ its UnoCSS preset into `uno.config.ts`), `@pierre/diffs`, `@tanstack/vue-virtual`, `unstorage` (persistence, see §7 — using its `indexedDB` driver, chosen so the storage backend can be swapped later, e.g. to sync with a real backend, without touching call sites), `picomatch` for glob-based rule-based-adapter rules, `valibot` for runtime schema validation of the canonical data structures.
- Add Storybook (`storybook` + `@storybook/vue3-vite` builder, matching Nuxt's Vite pipeline) as a devDependency, config at root `.storybook/`.
- Add `vitest` as a devDependency, with a root `vitest.config.ts` (reusing the Nuxt/Vite alias config so `#imports`-style paths resolve the same as in the app). No extra IndexedDB-mocking dependency is needed for `cache/*.test.ts`: they construct an `unstorage` instance with the built-in `memory` driver (`unstorage/drivers/memory`) instead of the `indexedDB` one, exercising the exact same `pr-cache.ts`/`review-cache.ts` code against an in-memory backend. Unit tests are co-located with their source file (`foo.ts` + `foo.test.ts`) wherever possible — this applies to every pure module, especially `patch-parser`, the `rule-based` adapter/rules, and the cache modules. A top-level `tests/` directory is reserved for later higher-level integration tests (multiple modules wired together), not unit tests. Add `"test": "vitest run"` / `"test:watch": "vitest"` to `package.json` scripts.

---

## 2. Module layout

```
app/
  types/
    diff.ts          # canonical diff/PR data structures
    provider.ts       # Provider interface + capability flags
    analyze.ts          # AnalyzeAdapter interface + Group/GroupedResult types
    cache.ts            # unstorage record shapes (PrCacheEntry)
    review.ts            # FileReviewState schema (sha -> reviewed)
  providers/
    github/
      index.ts          # GithubProvider implementing Provider
      api.ts             # thin fetch wrapper around REST API
      normalize.ts        # raw GitHub JSON -> canonical types; falls back to patch-parser
                          #   for any file whose `patch` GitHub omitted (huge diffs)
      normalize.test.ts    # co-located Vitest unit tests (fixture GitHub JSON payloads)
    paste/
      index.ts          # PasteProvider implementing Provider: parses raw text via patch-parser
      index.test.ts       # co-located Vitest unit tests
    types.ts             # re-export Provider interface for consumers
  patch-parser/
    index.ts             # parsePatch(text): FileChange[] — shared unified-diff/git-diff parser,
                          #   used by github's fallback, paste, and (later) the local provider
    index.test.ts          # co-located Vitest unit tests: real .diff/.patch fixtures, rename,
                          #   binary, plain-POSIX-diff, missing-index-line fallback-hash cases
  analyze/
    index.ts             # adapter registry, resolveAdapter(id)
    adapters/
      rule-based/
        index.ts           # implemented now: analyze(diff) -> GroupedResult
        index.test.ts        # co-located Vitest unit tests
        rules.ts             # default glob-pattern rules per category
        rules.test.ts          # co-located Vitest unit tests: one case per category pattern
      llm/
        index.ts           # TODO: deferred, stub throws "not implemented"
      web-llm/
        index.ts           # TODO: deferred, stub throws "not implemented"
  cache/
    storage.ts            # unstorage instance factory: indexedDB driver at runtime,
                          #   memory driver injectable for tests; key-prefix scheme (pr:*, review:*)
    pr-cache.ts           # get/set/evict PR cache entries (prefix "pr:"), LRU logic
    pr-cache.test.ts        # co-located Vitest unit tests (memory-driver storage), incl. LRU eviction
    review-cache.ts        # get/set reviewed shas (prefix "review:"), prune orphaned shas on eviction
    review-cache.test.ts     # co-located Vitest unit tests, incl. pruning against pr-cache state
  composables/
    useProvider.ts        # resolves active provider by id (github | paste for now)
    useAnalyzeAdapter.ts    # resolves active analyze adapter (rule-based only for now)
    usePullRequest.ts      # orchestrates provider fetch + cache + analyze
    useReviewedFiles.ts     # reactive sha -> reviewed map, backed by review-cache.ts
    useSettings.ts          # GitHub PAT read/write (localStorage, not unstorage — see §8)
  components/
    diff/
      DiffView.vue          # top-level pure component, takes GroupedResult + Diff + reviewed map
      GroupTree.vue           # renders 2-level group hierarchy, each group containing a FileTree
      FileTree.vue             # virtualized file-path tree within a group, checkbox per file node
      FileDiff.vue              # wraps @pierre/diffs web component per file, toolbar w/ reviewed checkbox
      PrHeader.vue               # title/description/author/refs, pure props
    settings/
      SettingsModal.vue          # dialog wrapper (reka-ui Dialog via @antfu/design), opened from a header trigger
      SettingsPanel.vue           # pure form content: PAT field, emits update:token
    load/
      LoadDiffModal.vue           # dialog wrapper: paste textarea + file drop zone, opened from a header trigger
      LoadDiffPanel.vue            # pure form content: text/file input, emits submit(text)
    AppHeader.vue                 # global header, includes the settings-trigger + load-diff-trigger buttons + both modals
  layouts/
    default.vue                  # mounts AppHeader (and thus both modals) around every page
  pages/
    index.vue                  # empty/minimal landing (no dashboard per decision)
    gh/[owner]/[repo]/[number].vue
    paste/[hash].vue           # renders a pasted/uploaded diff; hash = content hash of the raw text
  fixtures/                    # shared between Storybook and tests
    real/                      # captured provider+grouping JSON snapshots
    synthetic/                 # hand-authored edge-case fixtures
.storybook/
  main.ts
  preview.ts
```

---

## 3. Canonical data types (`app/types/diff.ts`)

Every canonical shape is defined as a `valibot` schema first; the TS type is derived via `v.InferOutput`. This gives us runtime validation at the two boundaries that actually need it — normalizing untrusted GitHub API JSON, and reading back potentially-stale-shape entries from IndexedDB — instead of only compile-time types that trust the data blindly.

```ts
import * as v from 'valibot'

export const FileChangeStatusSchema = v.picklist(['added', 'removed', 'modified', 'renamed', 'copied'])
export type FileChangeStatus = v.InferOutput<typeof FileChangeStatusSchema>

export const DiffHunkSchema = v.object({
  header: v.string(), // e.g. "@@ -1,5 +1,6 @@"
  oldStart: v.number(),
  oldLines: v.number(),
  newStart: v.number(),
  newLines: v.number(),
  patch: v.string(), // raw hunk text, lines prefixed +/-/space
})
export type DiffHunk = v.InferOutput<typeof DiffHunkSchema>

export const FileChangeSchema = v.object({
  path: v.string(),
  previousPath: v.optional(v.string()), // for renames
  status: FileChangeStatusSchema,
  additions: v.number(),
  deletions: v.number(),
  isBinary: v.boolean(),
  // GitHub blob SHA when available: either straight from the JSON API, or extracted
  // from a parsed patch's `index <old>..<new> <mode>` line (git-generated diffs carry
  // real blob shas even in plain-text form). Falls back to a computed SHA-256 hash of
  // the patch content (via SubtleCrypto) only when no index line is present (e.g. a
  // plain POSIX `diff -u` paste with no git extended headers). Every provider —
  // including the future `local` one — can produce this cheaply and consistently.
  // Lets the cache/staleness check detect exactly which files changed between two
  // fetches of the same PR without diffing full patch text.
  sha: v.string(),
  hunks: v.array(DiffHunkSchema), // empty if binary
})
export type FileChange = v.InferOutput<typeof FileChangeSchema>

export const PullRequestMetaSchema = v.object({
  provider: v.picklist(['github', 'local', 'paste']),
  id: v.string(), // e.g. "github:owner/repo#123" or "paste:<contentHash>"
  title: v.string(), // "Pasted diff" default for paste, no PR title available
  description: v.string(), // raw markdown body; empty for paste
  author: v.optional(v.string()),
  // base/head refs+shas are only meaningful when the source actually has them
  // (github always does; a bare pasted patch usually doesn't unless a git diff
  // preamble is present, so these stay optional at the schema level).
  baseRef: v.optional(v.string()),
  headRef: v.optional(v.string()),
  baseSha: v.optional(v.string()),
  headSha: v.optional(v.string()),
  createdAt: v.optional(v.string()),
  updatedAt: v.optional(v.string()),
  url: v.optional(v.string()), // permalink to source, absent for local/paste
})
export type PullRequestMeta = v.InferOutput<typeof PullRequestMetaSchema>

export const PullRequestDiffSchema = v.object({
  meta: PullRequestMetaSchema,
  files: v.array(FileChangeSchema),
})
export type PullRequestDiff = v.InferOutput<typeof PullRequestDiffSchema>
```

## 4. Analyze types (`app/types/analyze.ts`)

```ts
import * as v from 'valibot'

export const GroupSourceSchema = v.picklist(['rule-based', 'llm', 'web-llm'])
export type GroupSource = v.InferOutput<typeof GroupSourceSchema>

export const DiffCategorySchema = v.picklist(['code', 'tests', 'docs', 'deps', 'config', 'build', 'generated', 'other'])
export type DiffCategory = v.InferOutput<typeof DiffCategorySchema>

// Leaf group shape (no further nesting) — reused for both root groups and their children,
// which structurally enforces the "max depth 2" decision rather than relying on convention.
export const DiffGroupLeafSchema = v.object({
  key: v.string(), // stable id, e.g. "docs/featureA" or "tests"
  label: v.string(), // display label (LLM can override; rule-based = category name)
  category: v.optional(DiffCategorySchema), // present for rule-based; LLM groups may omit or map loosely
  summary: v.optional(v.string()), // per-group blurb, populated only when an llm/web-llm adapter has run
  filePaths: v.array(v.string()), // references into PullRequestDiff.files by path
})
export type DiffGroupLeaf = v.InferOutput<typeof DiffGroupLeafSchema>

export const DiffGroupSchema = v.object({
  ...DiffGroupLeafSchema.entries,
  children: v.optional(v.array(DiffGroupLeafSchema)), // depth capped at 2 total (root -> children)
})
export type DiffGroup = v.InferOutput<typeof DiffGroupSchema>

export const WalkthroughStepSchema = v.object({
  title: v.string(),
  narrative: v.string(),
  filePaths: v.array(v.string()), // hunks/files this step refers to
})
export type WalkthroughStep = v.InferOutput<typeof WalkthroughStepSchema>

export const GroupedResultSchema = v.object({
  source: GroupSourceSchema,
  overallSummary: v.optional(v.string()), // only when an 'llm' or 'web-llm' adapter has run
  groups: v.array(DiffGroupSchema),
  walkthrough: v.optional(v.array(WalkthroughStepSchema)), // only when an llm/web-llm adapter has run; absent for rule-based
  generatedAt: v.string(),
  schemaVersion: v.number(), // bump on breaking shape changes, used for cache invalidation
})
export type GroupedResult = v.InferOutput<typeof GroupedResultSchema>
```

Rendering components accept `GroupedResult` and must degrade gracefully when `summary`/`walkthrough`/`overallSummary` are absent (rule-based case) — this is the "render based on how much info we have" requirement.

## 4b. Review state (`app/types/review.ts`)

Per-file "reviewed" marks (GitHub Files-changed-tab style), keyed by the file's `sha` rather than by path or PR — so if a PR gets new commits and a given file's `sha` is unchanged, its reviewed mark survives; only files whose `sha` actually changed lose their mark.

```ts
import * as v from 'valibot'

export const FileReviewStateSchema = v.object({
  sha: v.string(), // primary key — same sha as FileChange.sha
  reviewedAt: v.number(), // epoch ms
})
export type FileReviewState = v.InferOutput<typeof FileReviewStateSchema>
```

This is intentionally its own small store rather than a field on `PrCacheEntry`/`FileChange`: review state is content-addressed (by sha) and can outlive any single cached PR entry — the same file content reviewed in one PR context should still register as reviewed if referenced again (e.g. a rebase, or the same file touched in a later PR).

## 5. Provider abstraction (`app/types/provider.ts`)

`Provider` itself is a runtime object (holds a function), not serialized data, so it stays a plain TS interface — but the data it produces (`PullRequestDiff`) and the params it accepts are `valibot` schemas, so a provider's output can be validated the moment it's normalized.

```ts
import * as v from 'valibot'

export const ProviderCapabilitiesSchema = v.object({
  supportsAuth: v.boolean(),
  supportsComments: v.boolean(), // false for both github-now and local; flips true when comments phase lands
  requiresNetwork: v.boolean(),
})
export type ProviderCapabilities = v.InferOutput<typeof ProviderCapabilitiesSchema>

// Discriminated by `kind` so each provider only accepts params that make sense
// for its source — adding `local`'s (cwd/ref-range) shape later is a new variant,
// not a reshape of a shared bag of optional fields.
export const FetchDiffParamsSchema = v.variant('kind', [
  v.object({
    kind: v.literal('github-pr'),
    owner: v.string(),
    repo: v.string(),
    number: v.string(),
  }),
  v.object({
    kind: v.literal('patch-text'),
    text: v.string(), // raw unified-diff/patch text, e.g. `git diff > diff.patch` output
    title: v.optional(v.string()), // optional user-supplied title from the paste/upload form
  }),
])
export type FetchDiffParams = v.InferOutput<typeof FetchDiffParamsSchema>

export interface Provider {
  readonly id: 'github' | 'local' | 'paste'
  readonly capabilities: ProviderCapabilities
  fetchDiff: (params: FetchDiffParams, opts: { token?: string }) => Promise<PullRequestDiff>
}
```

`GithubProvider` (`app/providers/github/index.ts`) implements this: calls GitHub REST API (`GET /repos/{owner}/{repo}/pulls/{number}` for metadata + `GET /repos/{owner}/{repo}/pulls/{number}/files` paginated for file list/patches), normalizes into `PullRequestDiff` via `normalize.ts`. Unauthenticated by default; attaches `Authorization: Bearer <PAT>` header when a token is present in settings. When GitHub omits a file's `patch` field (it does this for very large diffs), `normalize.ts` falls back to fetching that file's slice from the raw `.diff` text endpoint and running it through `patch-parser` — the JSON API stays the source of truth for blob `sha`/status/counts whenever it has them.

`useProvider()` composable resolves a provider by id from a small lookup (`{ github: GithubProvider, paste: PasteProvider }`) so adding `local` later is a one-line registration, not a rewrite.

### Patch parser + `paste` provider (`app/patch-parser/index.ts`, `app/providers/paste/index.ts`)

`parsePatch(text: string): FileChange[]` parses unified diff / git-extended-diff text — the same format as GitHub's `.diff` endpoint and `git diff` output — into canonical `FileChange`s:

- Splits on `diff --git a/... b/...` file boundaries (falls back to `--- `/`+++ ` boundaries for plain POSIX diffs without git extended headers, best-effort — no rename detection in that case).
- Reads `rename from`/`rename to` (and `copy from`/`copy to`) for `status`; `--- /dev/null` → `added`, `+++ /dev/null` → `removed`; otherwise `modified`.
- Reads `index <oldSha>..<newSha> <mode>` for `sha` (git-generated diffs carry real blob shas even as plain text); falls back to a computed SHA-256 hash of the file's patch text when no index line is present.
- Detects `Binary files a/... and b/... differ` / `GIT binary patch` → `isBinary: true`, `hunks: []`.
- Parses each `@@ -oldStart,oldLines +newStart,newLines @@` block into a `DiffHunk`; `additions`/`deletions` are counted from `+`/`-` line prefixes.

`PasteProvider` (id `'paste'`, capabilities `{ supportsAuth: false, supportsComments: false, requiresNetwork: false }`) accepts `{ kind: 'patch-text', text, title? }`, runs `parsePatch`, and builds a `PullRequestDiff` with `meta.provider: 'paste'`, `meta.id: 'paste:' + contentHash(text)`, and only the fields it can actually know (title, if supplied; everything else about base/head refs is omitted). The content hash (SHA-256 of the raw text, same primitive used for `FileChange.sha`) becomes both the meta `id` suffix and the `/paste/[hash]` route param — pasting the same diff twice resolves to the same URL and reuses its cache/review state.

Unlike `github`, a paste diff has no live source to refetch: if its `pr-entries` row gets LRU-evicted, the `/paste/{hash}` URL has nothing left to recover — this is an accepted, documented limitation (see `.agents/01-architecture.md`), not a bug to fix.

## 6. Analyze adapters (`app/analyze/`)

Analysis (turning a `PullRequestDiff` into a `GroupedResult`) is behind the same kind of pluggable-adapter abstraction as `Provider`, so swapping in an LLM later — or a fully local in-browser model — never touches the view layer or the pipeline that calls it.

```ts
// app/types/analyze.ts
export interface AnalyzeAdapter {
  readonly id: GroupSource // 'rule-based' | 'llm' | 'web-llm'
  readonly available: boolean // rule-based: always true; llm: true once a key is configured; web-llm: true once a local model is loaded
  analyze: (diff: PullRequestDiff) => Promise<GroupedResult>
}
```

`app/analyze/index.ts` exposes a small registry (`{ 'rule-based': ruleBasedAdapter, llm: llmAdapter, 'web-llm': webLlmAdapter }`) and `resolveAdapter(id)`, so `usePullRequest` picks an adapter by id without knowing its implementation.

### `rule-based` adapter — implemented now (`app/analyze/adapters/rule-based/index.ts`, `app/analyze/adapters/rule-based/rules.ts`)

Default glob rules (evaluated in order, first match wins), using `picomatch`:

```ts
export const defaultRules: { category: DiffCategory, patterns: string[] }[] = [
  { category: 'tests', patterns: ['**/*.test.*', '**/*.spec.*', '**/__tests__/**', '**/test/**'] },
  { category: 'docs', patterns: ['**/*.md', '**/*.mdx', 'docs/**', 'README*'] },
  { category: 'deps', patterns: ['package.json', 'pnpm-lock.yaml', 'yarn.lock', 'package-lock.json', 'pnpm-workspace.yaml'] },
  { category: 'config', patterns: ['*.config.*', '.*rc', '.*rc.*', '.github/**', 'tsconfig*.json'] },
  { category: 'build', patterns: ['Dockerfile', 'vite.config.*', 'rollup.config.*', 'esbuild.config.*'] },
  { category: 'generated', patterns: ['**/*.generated.*', '**/dist/**', '**/*.lock'] },
]
// fallback category: 'code'
```

`ruleBasedAdapter.analyze(diff)` — flat groups only (one level, per decision), one `DiffGroup` per category present, `source: 'rule-based'`, `available: true` always, no `summary`/`walkthrough`/`overallSummary`, `schemaVersion` from a constant.

### `llm` adapter — TODO, deferred (`app/analyze/adapters/llm/index.ts`)

```ts
// TODO(phase: llm-integration): Vercel AI SDK, preferring AI Gateway with vendor-key
// fallback (OpenAI-compatible + Anthropic). Populates overallSummary, per-group
// summary, and walkthrough. available = true once a key/gateway token is configured
// in Settings. Stub for now:
export const llmAdapter: AnalyzeAdapter = {
  id: 'llm',
  available: false,
  analyze: () => { throw new Error('llm adapter not implemented yet') },
}
```

### `web-llm` adapter — TODO, deferred (`app/analyze/adapters/web-llm/index.ts`)

```ts
// TODO(phase: web-llm-integration): fully in-browser model (e.g. WebGPU/WASM local
// inference, no API key or network call needed at analyze time). available = true
// once a local model has been downloaded/loaded. Stub for now:
export const webLlmAdapter: AnalyzeAdapter = {
  id: 'web-llm',
  available: false,
  analyze: () => { throw new Error('web-llm adapter not implemented yet') },
}
```

## 7. Storage (`app/cache/storage.ts`, `pr-cache.ts`, `review-cache.ts`)

Persistence goes through [`unstorage`](https://github.com/unjs/unstorage) rather than talking to IndexedDB directly. `storage.ts` exports a factory returning a single `unstorage` instance (base `diffs-cache`), using the `indexedDB` driver (`unstorage/drivers/indexeddb`) at runtime; tests inject the built-in `memory` driver instead, exercising identical `pr-cache.ts`/`review-cache.ts` code. This is the same swappable-backend shape as `Provider`/`AnalyzeAdapter` — call sites never construct a driver themselves, so switching drivers later (or layering in a remote/sync backend) touches only `storage.ts`.

`unstorage` is a flat key-value store, so the two logical "collections" are key prefixes on one instance rather than separate object stores: `pr:{provider}:{owner}/{repo}#{number}` for `PrCacheEntry` rows, `review:{sha}` for `FileReviewState` rows. `storage.getKeys('pr:')` / `storage.getKeys('review:')` enumerate each collection; `storage.getItems([...])` batch-reads.

```ts
import * as v from 'valibot'

export const PrCacheEntrySchema = v.object({
  key: v.string(),
  diff: PullRequestDiffSchema, // raw normalized diff at headSha
  headSha: v.string(),
  analyzedBy: v.partial(v.record(GroupSourceSchema, GroupedResultSchema)), // keyed by adapter id; only 'rule-based' populated for now
  lastViewedAt: v.number(), // for LRU
  sizeBytes: v.number(), // approx, for budget accounting
})
export type PrCacheEntry = v.InferOutput<typeof PrCacheEntrySchema>
```

Entries read back via `unstorage` are parsed through `PrCacheEntrySchema` before use — a corrupt or previous-shape entry (e.g. from a bumped `schemaVersion`) fails validation and is treated as a cache miss instead of crashing the view layer.

**`pr-cache.ts`** (all keys prefixed `pr:`)
- `getEntry(key)` → `storage.getItem('pr:' + key)`; `putEntry(entry)` → `storage.setItem`; `touchEntry(key)` (updates `lastViewedAt`, re-`setItem`s).
- `enforceBudget()`: `storage.getKeys('pr:')` + `getItems` to sum `sizeBytes` across entries; if over budget (e.g. 50MB or N=50 entries, whichever hit first), `removeItem` the oldest-`lastViewedAt` entries until under budget. Called after every `putEntry`. After evicting, calls `review-cache.ts`'s `pruneOrphanedReviewed(remainingShas)` (see below).
- Staleness check: `usePullRequest` composable fetches live PR metadata (cheap call) on page load, compares `headSha` to cached entry's `headSha`; if different, sets a reactive `isStale` flag driving the refresh banner — does not auto-refetch. On refresh, the per-file `sha` lets the diff view highlight exactly which files actually changed (`sha` mismatch) versus which were merely re-fetched but untouched, without re-diffing every patch, and preserves reviewed marks for unchanged files.

**`review-cache.ts`** (all keys prefixed `review:`)
- `getReviewed(shas: string[]): Promise<Set<string>>` — `storage.getItems(shas.map(sha => 'review:' + sha))`, batch lookup for all files in a diff at once.
- `setReviewed(sha: string, reviewed: boolean): Promise<void>` — `storage.setItem`/`storage.removeItem` on `'review:' + sha`.
- `pruneOrphanedReviewed(remainingShas: Set<string>): Promise<void>` — since review state is content-addressed and not tied 1:1 to a single `pr-entries` row, pruning walks all remaining `pr-entries` (not just the just-evicted one) to build the live sha set, then `removeItem`s any `review:*` key whose sha isn't referenced by any cached PR. Run after `pr-cache.ts`'s `enforceBudget()`.

## 8. Settings (`app/composables/useSettings.ts`, `app/components/settings/SettingsModal.vue` + `SettingsPanel.vue`)

- Not a route — a modal/panel (dialog primitive from `@antfu/design`/`reka-ui`) triggered by a gear icon button in `AppHeader.vue`, mounted once in `layouts/default.vue` so it's reachable from any page (landing or a PR view) without navigating away.
- Single field: GitHub PAT, stored in `localStorage` (not IndexedDB — small, synchronous access needed before provider calls). Simple `useLocalStorage` from VueUse.
- No model/LLM keys yet — panel structure leaves an obvious slot (a "Model Providers" section placeholder or simply omitted, added in the LLM phase).
- `SettingsPanel.vue` stays a pure form component (`modelValue`/`update:modelValue` for the token) so it can still be dropped into Storybook without the dialog chrome; `SettingsModal.vue` is the thin stateful wrapper that opens/closes and wires it to `useSettings`.

## 9. Components (pure, data-driven) + Storybook

All components take only plain data props (`PullRequestDiff`, `GroupedResult`, `FileChange`, etc.) plus a `reviewed` map — zero knowledge of GitHub, fetch, or cache/storage. Reviewed-state mutation always flows out via an `update:reviewed` emit rather than components touching `review-cache.ts` directly, so the persistence side-effect stays confined to the page that owns the composable. This is what makes them provider-agnostic and Storybook-friendly.

| Component | Props | Emits | Notes |
|---|---|---|---|
| `PrHeader.vue` | `meta: PullRequestMeta` | — | title/description/refs/author |
| `GroupTree.vue` | `groups: DiffGroup[]`, `files: FileChange[]`, `reviewed: Set<string>` (shas) | `update:reviewed` | renders up to 2-level accordion/tree; shows `summary` when present; hosts a `FileTree` per group |
| `FileTree.vue` | `files: FileChange[]`, `reviewed: Set<string>` | `update:reviewed` | builds a folder/file tree from `file.path`; virtualized (`@tanstack/vue-virtual`); each file node has a reviewed checkbox + status badge + additions/deletions |
| `FileDiff.vue` | `file: FileChange`, `layout: 'split' \| 'unified'`, `reviewed: boolean` | `update:reviewed` | wraps `@pierre/diffs` custom element; per-file toolbar (GitHub Files-changed-tab style) with the same reviewed checkbox as the tree; virtualizes hunks for huge files; collapses its diff body by default once marked reviewed |
| `DiffView.vue` | `diff: PullRequestDiff`, `grouped: GroupedResult`, `layout`, `reviewed: Set<string>` | `update:reviewed` | composes the above; top-level pure component; toolbar shows "N / M files reviewed" progress, computed from `reviewed` vs `diff.files` |
| `SettingsPanel.vue` | `modelValue: string` (PAT) | `update:modelValue` | pure form content, no direct storage access |
| `SettingsModal.vue` | `open: boolean` | `update:open` | stateful dialog wrapper around `SettingsPanel`, wires to `useSettings` |
| `LoadDiffPanel.vue` | — | `submit(text: string, title?: string)` | pure form content: textarea + file drop zone (reads dropped/selected file as text) |
| `LoadDiffModal.vue` | `open: boolean` | `update:open` | stateful dialog wrapper; on submit, computes the content hash and `navigateTo('/paste/' + hash)` |

Each gets a co-located `*.stories.ts` importing from `app/fixtures/{real,synthetic}/*.json`. Synthetic fixtures to author: empty group, single huge file (10k+ lines), binary file, renamed file, deeply-would-be-nested-but-capped-at-2-levels group, PR with zero files changed, and a partially-reviewed file set (for `FileTree`/`FileDiff`/`DiffView` stories exercising the checkbox + progress states). Real fixtures: capture by running `GithubProvider.fetchDiff` + `ruleBasedAdapter.analyze` against 1–2 real public PRs (small + large) via a one-off script, saved as JSON.

`.storybook/main.ts` uses `@storybook/vue3-vite`, points `stories` at `app/components/**/*.stories.ts`, pulls in the UnoCSS-generated CSS so components render with real styling.

## 10. Page wiring (`app/pages/gh/[owner]/[repo]/[number].vue`, `app/pages/paste/[hash].vue`, `app/layouts/default.vue`)

`gh/[owner]/[repo]/[number].vue` flow: read route params → `usePullRequest({ kind: 'github-pr', owner, repo, number })` → check cache (`getEntry`) → if hit and fresh, use cached `diff` + `analyzedBy['rule-based']`; if hit but stale (headSha mismatch), show banner + use cached data until user clicks refresh; if miss, `provider.fetchDiff()` → `ruleBasedAdapter.analyze()` → `putEntry()` → render. In parallel, `useReviewedFiles()` batch-loads reviewed state for `diff.files` by sha via `review-cache.ts`. Pass resulting `diff`/`grouped`/`reviewed` into `<DiffView>`, and persist on its `update:reviewed` emit via `review-cache.ts`'s `setReviewed`.

`paste/[hash].vue` flow: check cache by key `paste:{hash}` — a hit renders exactly like the github page (same `<DiffView>`, same `useReviewedFiles` wiring, no staleness check since there's no live source). A miss (e.g. direct navigation to a URL whose cache entry was evicted, or never populated) shows an empty/error state prompting the user to re-open `LoadDiffModal` and paste the diff again — there is nothing to fetch. The only way this route gets populated is via `LoadDiffModal`'s submit handler calling `PasteProvider.fetchDiff({ kind: 'patch-text', text })` then `putEntry()` before navigating.

`layouts/default.vue` mounts `AppHeader.vue` (with the settings-trigger + load-diff-trigger buttons, `SettingsModal.vue`, and `LoadDiffModal.vue`) around every page, so both are reachable from the landing page or any PR/paste view without a dedicated route.

---

## 11. Task sequence

1. Config cleanup (ssr:false, disable auto-imports/components, delete Vitesse cruft, fix netlify.toml, remove Dockerfile).
2. Add deps (`@antfu/design`, `@pierre/diffs`, `@tanstack/vue-virtual`, `unstorage`, `picomatch`, `valibot`, Storybook) and dev/test deps (`vitest`); add `vitest.config.ts` and `test`/`test:watch` scripts.
3. Write canonical valibot schemas + inferred types (`diff.ts`, `provider.ts`, `analyze.ts`, `cache.ts`, `review.ts`).
4. Implement `patch-parser` (`parsePatch`) with a co-located `index.test.ts` against real fixtures (a GitHub `.diff` file and a `git diff > diff.patch` output, including a rename, a binary file, and a no-index-line plain-POSIX-diff case exercising the computed-hash fallback).
5. Implement `GithubProvider` (api.ts + normalize.ts, using `patch-parser` for the omitted-patch fallback) with a co-located `normalize.test.ts` (mocked GitHub JSON fixtures) — plus manual testing against a couple of real PR URLs, including one large enough to trigger the fallback if possible.
6. Implement `PasteProvider` on top of `patch-parser`, with a co-located `index.test.ts`.
7. Implement the `rule-based` analyze adapter + default rules, each with a co-located `*.test.ts` (one rules-test case per category pattern; adapter test covering multi-category files and the fallback-to-`code` case); add `llm`/`web-llm` stub files with TODOs and the adapter registry.
8. Implement `storage.ts` (unstorage instance factory) + cache modules (`pr-cache.ts` + `review-cache.ts`) + LRU eviction + orphaned-review pruning, with co-located `*.test.ts` using the `memory` driver (budget eviction, staleness detection, pruning against multi-entry state).
9. Build components bottom-up: `FileDiff` (+ reviewed toolbar) → `FileTree` (+ reviewed checkboxes) → `GroupTree` → `PrHeader` → `DiffView` → `LoadDiffPanel`/`LoadDiffModal`.
10. Set up Storybook; author synthetic fixtures (including partially-reviewed sets); capture real fixtures via a script using the provider + rule-based-adapter pipeline; write stories for every component.
11. Build `useSettings` + `useReviewedFiles` composables, and `SettingsPanel`/`SettingsModal`/`AppHeader`/`layouts/default.vue`.
12. Wire `/gh/owner/repo/number` and `/paste/[hash]` end-to-end; manual test with real public PRs (small, huge, renamed files, binary files, marking/unmarking files reviewed and confirming persistence across a simulated PR update) and with pasted/uploaded `.diff`/`.patch` files.
13. Lint/typecheck/test pass (`pnpm lint`, `pnpm typecheck`, `pnpm test`).

---

## Deferred (future phases, for context — not built now)

- `llm` analyze adapter: Vercel AI SDK, preferring AI Gateway with vendor-key fallback (OpenAI-compatible + Anthropic); populates `overallSummary`, `summary` per group, and `walkthrough` on `GroupedResult`. Stub lives in `app/analyze/adapters/llm/index.ts` from day one.
- `web-llm` analyze adapter: fully in-browser model inference (no network call at analyze time). Stub lives in `app/analyze/adapters/web-llm/index.ts` from day one.
- Comment threads: read existing GitHub review comments/replies, post new comments/replies — gated by `ProviderCapabilities.supportsComments`.
- `local` provider: CLI-driven local diff (e.g. against working tree or a commit range), implementing the same `Provider` interface — no comments support, `supportsAuth: false`. Will reuse `patch-parser` directly on the CLI's `git diff` output, same as `paste` does today.
- Landing/history dashboard: intentionally excluded even later per decision (stateless deep-links only).
- Social/OG previews: intentionally excluded (no backend).
- **Userscript + embedded sidepanel**: a browser userscript (Tampermonkey/Violentmonkey) that, when viewing a PR on github.com, embeds this app (pointed at the matching `/gh/owner/repo/number`) as a sidepanel alongside GitHub's own comment thread — so the grouped/summarized view sits next to the real conversation instead of replacing it. Not built this phase; noted now only so `netlify.toml` and the page shell don't accidentally foreclose it later (e.g. no restrictive `X-Frame-Options`/`frame-ancestors` should be added, and an eventual `?embed=1`-style compact layout — hiding `AppHeader` chrome — is a natural, low-cost hook to leave room for).
