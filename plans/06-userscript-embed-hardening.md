# Plan 06: userscript/embed hardening

## Scope

The userscript (`userscript/diffs-github.user.js`) and its embed custom
element (`app/embed/`) are built and working, but `userscript/README.md`
documents four known limitations, each independently fixable:

1. **Drawer-tuned layout.** The embedded panel renders the full Diffs UI
   (own header included) instead of a layout designed for a narrow drawer.
   `.agents/01-architecture.md` already anticipates this as a compact
   `?embed` layout mode; implement it as a prop/route flag on the existing
   pages/components rather than a parallel component tree.
2. **Shared settings/reviewed-state across origins.** GitHub token and
   reviewed-file marks are stored under `github.com`'s origin inside the
   embed, separate from `diffs.antfu.dev`. Needs either a `postMessage`
   bridge to the main origin, or accepting the split and communicating it
   more clearly in-product instead of only in the README.
3. **Bundle size.** The `@require`d embed bundle is a few MB (full Shiki
   highlighting, no code-splitting, since GitHub's CSP blocks further chunk
   requests) and loads on every matching PR page visit regardless of whether
   the drawer opens. Investigate lazy-loading Shiki grammars/themes on
   demand within the single-bundle constraint, or deferring the whole bundle
   fetch until the toggle tab is first clicked.
4. **Tooltips disabled in-embed.** `vue-afloat` teleports popper content to
   `document.body`, escaping the shadow root; currently aliased to a no-op
   (`app/embed/vue-afloat-noop.ts`). Needs a shadow-root-aware teleport
   target instead of dropping tooltips entirely.

Each of the four is independently shippable; do not block one on another.

## Testing

- Manual: install the userscript locally against a real GitHub PR page for
  each fix, since none of this is meaningfully unit-testable (DOM
  injection into a third-party page, shadow root behavior, CSP
  interaction).
- For the layout mode specifically, add a Storybook story exercising the
  compact layout the same way other components are covered.

## Depends on

- `app/embed/`, `userscript/` (already implemented).
