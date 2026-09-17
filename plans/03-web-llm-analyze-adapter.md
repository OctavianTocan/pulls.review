# Plan 03: web-llm analyze adapter

## Scope

Implement `app/analyze/adapters/web-llm/index.ts`, currently a stub that
throws `'web-llm adapter not implemented yet'`. Fully in-browser model
inference, no API key and no network call at analyze time (beyond the
one-time model download). Fits the same `AnalyzeAdapter` interface as
[`02-llm-analyze-adapter.md`](./02-llm-analyze-adapter.md); output is the
same `GroupedResult` shape.

## Approach

- WebGPU/WASM local inference (e.g. via `@mlc-ai/web-llm` or similar).
  Confirm current browser support is acceptable before committing; this
  adapter's `available` should reflect a graceful `false` on unsupported
  browsers, not a hard error.
- `available` flips to `true` once a model has been downloaded and loaded
  into memory. Model load is a distinct, user-triggered step (likely a
  Settings action: "Download model"), not implicit on first `analyze()`
  call, since it can be a multi-hundred-MB download.
- Model choice needs to balance capability against download size and
  in-browser inference speed; a smaller model than the `llm` adapter's
  backing model is expected. Same chunking-by-diff-size concern as plan 02
  applies, likely more aggressively given a smaller context window.
- Zero-backend invariant (`.agents/01-architecture.md`) applies unchanged:
  the model file MUST be fetched directly by the browser (CDN/HF Hub), not
  proxied through anything this project runs.

## Settings

- Extend the "Model Providers" section added in plan 02 with a `web-llm`
  option: model picker, download/load progress, and a way to clear the
  cached model.

## Testing

- Co-located `index.test.ts` for the output-shaping logic (prompt
  construction, response parsing into `GroupedResult`), independent of
  actually running inference in CI.
- Manual test in a real browser: model download, load, analyze on a small
  and a large PR, and the unsupported-browser fallback path.

## Out of scope

- The `llm` (hosted) adapter; see
  [`02-llm-analyze-adapter.md`](./02-llm-analyze-adapter.md).
