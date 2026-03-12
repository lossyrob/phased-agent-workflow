# Plan

## Problem

Issue `#286` reports that PAW scratch ignore markers (top-level `.paw/work/<work-id>/.gitignore` markers and nested scratch-area markers such as planning/reviews output directories) can leak into commits and PRs even though they are intended to be purely local lifecycle mechanics.

## Approach

Make the policy explicit at the source-of-truth lifecycle layer, enforce it in the git/final-PR guardrails, and restate it at each scratch-marker creation site. Then add a lightweight regression test to lock in the prompt-level behavior and update the small set of user-facing docs that describe stop-tracking and artifact lifecycle behavior.

## Work Items

1. **Lifecycle and PR guardrails**
   - Update the source-of-truth artifact lifecycle guidance plus the git/PR skills so scratch ignore markers are treated as local-only and must be removed from the index if tracked.

2. **Scratch marker creation sites**
   - Update planning/review/SOT skill instructions so any scratch `.gitignore` they create is explicitly left untracked and never staged or committed.

3. **Regression coverage and docs**
   - Add an offline regression test for the new guardrails.
   - Update the human-facing lifecycle / stop-tracking docs so they match the prompt behavior.

## Key Decisions

- Treat scratch ignore markers as local-only regardless of whether they are top-level workflow markers or nested scratch-area markers.
- Keep enforcement in prompt/skill guardrails rather than adding new product code unless a concrete runtime bug is found.
- Use a fast single-model review for this bugfix so the batch can keep moving.
