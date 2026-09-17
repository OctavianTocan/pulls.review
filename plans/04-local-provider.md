# Plan 04: local CLI provider

## Scope

Implement a `local` `Provider` (`app/providers/local/`), diffing a working
tree or a commit/ref range instead of fetching from GitHub. The `Provider`
interface (`app/types/provider.ts`) already carries `id: 'github' | 'local' |
'paste'`, so this is a new implementation registered alongside `github` and
`paste`, not an interface change.

## Approach

- Reuses `app/patch-parser/` directly on `git diff`'s output, the same way
  `app/providers/paste/index.ts` already does. `local` is the third consumer
  of the parser the original plan called out.
- Needs a new `FetchDiffParams` variant (`kind: 'local'` or similar) in the
  discriminated union in `app/types/provider.ts`, carrying whatever `git
diff` invocation params make sense (cwd, ref range, staged/unstaged).
- Capabilities: `supportsAuth: false` (no remote auth needed), same as
  `paste`. `supportsComments: false`.
- This provider only makes sense outside a pure browser SPA context (it
  needs filesystem/`git` access), so it is not reachable from
  diffs.antfu.dev's own web pages. It exists for the VS Code extension
  ([`07-vscode-extension.md`](./07-vscode-extension.md)) to consume, and
  potentially a CLI entry point. Decide during implementation whether that
  means this lives in a Node-only entry point separate from the browser
  bundle, or whether it is conditionally registered.

## Testing

- Co-located `index.test.ts`: run against a real local git repo fixture
  (create one in a temp dir during the test, make a few commits, diff a
  range) and assert the parser output matches what `paste` would produce for
  equivalent diff text.

## Depends on

- `app/patch-parser/` (already implemented, phase 1).

## Out of scope

- The VS Code extension itself; see
  [`07-vscode-extension.md`](./07-vscode-extension.md), which depends on
  this plan.
