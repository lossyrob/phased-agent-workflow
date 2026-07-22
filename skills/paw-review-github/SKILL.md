---
name: paw-review-github
description: Posts finalized review comments to GitHub, leaving the review pending by default or submitting it under explicit verified authorization.
---

# PAW Review GitHub Skill

Post finalized comments to a GitHub review. Pending is the default. Submission is a separate authorized mutation with fail-closed target and head verification.

> **Reference**: Follow Core Review Principles and Authorization Preflight from `paw-review-workflow`.

## Prerequisites

Read both artifacts from `.paw/reviews/<identifier>/`:

- `ReviewComments.md`
  - Status is `finalized`
  - Every comment has a `**Final**:` marker
  - At least one comment is `Ready for GitHub posting`
- `ReviewContext.md`
  - `Review Platform: github`
  - Repository, PR number, and head commit are present
  - `Preflight Status: passed`
  - Authorization fields are complete

If these conditions fail, report the exact blocker. Do not create or submit a review.

For Azure DevOps or local contexts, skip GitHub mutations and use the artifact-only flow.

## Output Policy

| Condition | Action |
|-----------|--------|
| Authorization absent; action `pending` | Create or reuse a pending review, then stop |
| Explicit authorization; action `submit` | Create or reuse the exact pending review, verify the authorization tuple, then submit |
| Authorization ambiguous or preflight blocked | Stop before mutation and report the conflict |
| Requested mutation unavailable | Preserve artifacts and report capability unavailable |
| Review already submitted | Report the terminal state; do not replay |

Allowed submission events are `APPROVE`, `REQUEST_CHANGES`, and `COMMENT`.

## Process

### 1. Load Policy and Finalized Comments

Read the target, head, capability, requested action, authorization, event, and authorized pending-review value from ReviewContext.md.

Filter ReviewComments.md:

- Include comments marked `Ready for GitHub posting`
- Exclude comments marked `Skipped`
- Use updated comment/suggestion text when present
- Posted text contains the final description and suggestion only; keep rationale, assessments, `**Final**:` markers, and PAW artifact names local

If ReviewComments.md already records a review ID, treat it as the candidate existing review. Do not create a duplicate.

### 2. Resolve Current GitHub State

Before any mutation, use GitHub read capabilities to resolve:

- Authenticated repository identity
- PR number and state
- Live head commit
- Existing review ID and state, when recorded

The repository and PR must match ReviewContext.md. A closed PR, missing target, or head mismatch blocks mutation.

If the head changed:

1. Leave any pending review untouched for manual inspection.
2. Record `Preflight Status: blocked: head changed` and the observed head in ReviewContext.md.
3. Report that fresh analysis and authorization are required.

### 3. Create or Reuse the Pending Review

If no review ID is recorded:

1. Create one pending review on the verified repository and PR; omit the submission event.
2. Add each postable inline comment to that pending review.
3. Record the returned review ID in ReviewComments.md.
4. If `Authorized Pending Review` is `bind-created-review`, replace it in ReviewContext.md with the returned ID before any submission attempt.

If a review ID is recorded:

- Re-resolve it from GitHub.
- Reuse it only when it belongs to the verified PR and is still pending.
- If `Authorized Pending Review` is `bind-created-review`, replace it with the re-resolved pending review ID before evaluating submission.
- If it is already submitted, update local status and follow the terminal no-op path.
- Any other state mismatch blocks further mutation and preserves the review.

Update ReviewComments.md after pending creation:

```markdown
**Status**: Posted to GitHub pending review
**Pending Review ID**: <id>
**Comments Posted**: <posted> of <finalized>
```

Each posted comment records its GitHub comment ID. Skipped comments remain unposted in the artifact.

### 4. Apply the Submission Decision

If `Requested Output Action` is `pending`, stop with the pending review.

For `submit`, require:

- `Submission Authorization: explicit`
- Allowed submission event
- Authorized target matching the repository and PR
- Authorized head matching the current live head
- Authorized pending review ID matching the exact pending review

Immediately before submission, re-read live GitHub state and verify this tuple:

```text
repository + PR + live head + pending review ID + event
```

Every value must be present and equal to the authorization recorded in ReviewContext.md. On absence, ambiguity, mismatch, permission failure, or changed state:

- Do not submit or recreate the review.
- Keep the pending review available for inspection.
- Record the blocked reason in ReviewContext.md and ReviewComments.md.
- Report the exact mismatch.

When the tuple matches, submit that review with the authorized event. Record the submitted review ID, event, head, and timestamp in both artifacts.

### 5. Enforce Terminal Idempotence

A submitted review is terminal for this workflow run:

- Repeated authorization before submission confirms the same mutation.
- Repeated authorization after submission returns the recorded submitted state without creating or submitting another review.
- A new head requires fresh analysis, a new pending review, and fresh authorization.

### 6. Multi-PR Reviews

Treat each PR as a separate authorization boundary:

- Use its own ReviewContext.md and ReviewComments.md.
- Create/reuse and optionally submit one review per PR.
- Never reuse authorization, head, review ID, or event across PRs.
- Continue other PRs after a per-PR failure, but report partial success and preserve each failed pending review.

### 7. Artifact-Only Contexts

When the platform is Azure DevOps or local, or executable GitHub capability is unavailable:

- Do not call GitHub mutation tools.
- Keep ReviewComments.md finalized.
- Add manual posting instructions with final comment text.
- Record the platform, capability, requested action, and preflight result.

An explicit unsupported submission request must have been reported before the Understanding stage. Do not silently convert it to artifact-only output.

## Policy Classification

**True invariants**

- Post only finalized comments.
- Keep skipped comments and internal rationale out of external review text.
- Verify the exact target, live head, pending review ID, and event before submission.
- Fail closed without mutating the pending review when verification fails.

**Defaults**

- GitHub output remains pending.
- Azure DevOps and local output remain artifact-only without executable capability.

**User-configurable policy**

- Explicit direction may request GitHub submission and select an allowed event.
- Users may override critique recommendations by changing final comment status before this skill runs.

## Validation

- [ ] ReviewComments.md is finalized and all comments have final markers
- [ ] ReviewContext.md preflight passed for GitHub
- [ ] Only ready comments were posted
- [ ] Pending review ID and comment IDs were recorded
- [ ] Pending-default runs did not submit
- [ ] Submit runs revalidated repository, PR, live head, review ID, and event
- [ ] Verification failures preserved the pending review and reported the mismatch
- [ ] Submitted runs recorded terminal state and replay prevention
- [ ] Multi-PR authorization remained isolated per PR
- [ ] Artifact-only contexts performed no GitHub mutation

## Completion

Report one of:

- Pending review ID and posted/skipped counts
- Submitted review ID, event, verified head, and posted/skipped counts
- Terminal no-op for an already submitted review
- Blocked verification/capability result with the preserved pending review ID
- Artifact-only/manual posting location
