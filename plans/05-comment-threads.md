# Plan 05: GitHub PR comment threads

## Scope

Read existing GitHub review comment threads and post new comments/replies,
gated by `Provider.capabilities.supportsComments` (currently `false` on
every provider). This is the biggest remaining feature gap: no code for it
exists today, not even a stub.

## Approach

- `supportsComments` flips to `true` on the `github` provider only; `paste`
  and the future `local` provider have no comment thread to talk to and stay
  `false` permanently.
- New canonical types needed: a `ReviewComment`/`CommentThread` shape
  (author, body, path, line/position, `inReplyTo`, timestamps), following the
  same `valibot`-schema-first convention as everything in `app/types/`.
- Fetching: extend `app/providers/github/api.ts` with the review-comments
  endpoints (`GET /repos/{owner}/{repo}/pulls/{number}/comments`), normalized
  alongside the existing diff fetch in `normalize.ts` or a sibling module.
- Posting: requires a GitHub PAT with write scope (the existing PAT flow in
  `useSettings.ts` covers read-only public access today; posting needs the
  Settings copy/UI to make the write-scope requirement clear before someone
  pastes a read-only token and gets confusing 403s).
- View layer: new pure component(s) rendering a thread anchored to a specific
  line/hunk inside `FileDiff.vue`, following the same props-in/events-out
  rule as the rest of `app/components/` (no direct API calls from
  components; the page composable owns the mutation and calls back into the
  provider).
- Zero-backend invariant applies: posting goes directly from the browser to
  GitHub's API with the user's own PAT, same as fetching does today.

## Testing

- Co-located tests for the new normalize logic (mocked GitHub JSON
  fixtures), same pattern as `app/providers/github/normalize.test.ts`.
- Storybook stories for the new thread component(s), covering an empty
  thread, a multi-reply thread, and a thread on a since-changed line.

## Depends on

- `github` provider (already implemented, phase 1).

## Out of scope

- Formal review submission (approve/request changes) and merging stay out of
  scope per `.agents/00-goal.md`'s explicit non-goals, independent of whether
  this plan lands.
