# Plan 07: VS Code extension ("devframe")

## Scope

A VS Code extension surfacing Diffs inside the editor: visualize the local
working-tree diff, or the PR matching the currently checked-out branch,
similar in spirit to the official GitHub Pull Requests and Issues extension
but with Diffs' grouping/summarization. Not started; no code exists yet.

## Depends on

- [`04-local-provider.md`](./04-local-provider.md) for the working-tree diff
  case. Blocked until that lands.
- The existing `github` provider covers the "PR matching the checked-out
  branch" case (resolve owner/repo/branch from the workspace's git remote
  and open PR, then reuse `GithubProvider.fetchDiff` as-is).

## Approach

- Reuses the existing pure `app/components/diff/` component tree and
  `AnalyzeAdapter`/`Provider` abstractions unchanged; the extension is a new
  host embedding the same rendering pipeline, the same shape of integration
  as the userscript embed (`app/embed/`) but inside a VS Code webview instead
  of a GitHub page.
- Webview constraints differ from both the main SPA and the userscript
  embed: no arbitrary network origin restrictions (CSP is extension-defined,
  not GitHub's), but message-passing to the extension host is required for
  anything needing Node/filesystem access (i.e., the `local` provider's `git`
  calls run in the extension host process, not the webview).
- Decide packaging: a new `vscode-extension/` (or similar) top-level
  directory, separate build pipeline (`vsce`), consuming `app/` as a
  workspace dependency rather than duplicating components.

## Testing

- Manual, via the VS Code Extension Development Host, against a real local
  repo with uncommitted changes and against a real open PR branch.

## Out of scope

- Anything beyond visualization: no in-editor review submission, no
  merging, consistent with `.agents/00-goal.md`'s non-goals.
