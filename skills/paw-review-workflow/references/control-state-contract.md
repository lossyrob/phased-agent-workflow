# Control-State Contract

## Shared Core

- Reuse the same shared core meanings as the workflow contract:
  - presence of `## Hardened State` enables hardened behavior
  - absence falls back to legacy best-effort mode
  - built-in TODOs are a mirror, not the durable source of truth
  - shared status values are `pending`, `in_progress`, `blocked`, `resolved`, and `not_applicable`
  - shared reconciliation markers are `not_run`, `current`, `stale`, and `external_unverified`
  - shared item line format is `- \`<item-id>\` | \`<status>\` | \`<kind>\``

## ReviewContext Embedding

Seed this section in `.paw/reviews/<identifier>/ReviewContext.md`:

```markdown
## Hardened State

TODO Mirror: active-required-items
Reconciliation: not_run

### Review Stage Items
- `understanding` | `in_progress` | `stage`
- `evaluation` | `pending` | `stage`
- `output:feedback` | `pending` | `stage`
- `output:critic` | `pending` | `stage`
- `output:critique-response` | `pending` | `stage`
- `output:github` | `pending` | `stage`
- `procedure:review-mode` | `pending` | `procedure`

### Terminal External Review State
- `none`

Pending Review ID: `none`
Pending Review URL: `none`
```

## Review Item IDs

- Review stage IDs:
  - `understanding`
  - `evaluation`
  - `output:feedback`
  - `output:critic`
  - `output:critique-response`
  - `output:github`
- Configured procedure IDs use `procedure:<name>`.
- Terminal external review state stores exactly one current marker:
  - `none`
  - `pending-review-created`
  - `manual-posting-provided`

## Reconciliation Rules

- When `## Hardened State` is present, `ReviewContext.md` is the durable review control-state source of truth.
- Reconcile it against `ReviewComments.md`, evaluation artifacts, and external review facts before stage advancement, critique finalization, or GitHub/manual-posting output.
- Mutation-affecting review decisions include delegated stage advancement, comment finalization, pending review creation, and terminal external-review updates.
- Determine current review position from the first review stage item whose status is not terminal (`resolved` or `not_applicable`).
- Later review stage items must block when an earlier review stage item or configured procedure item remains `pending`, `in_progress`, or `blocked`.
- `procedure:review-mode` becomes `resolved` only when the configured evaluation path actually ran and produced its required artifacts.
- `output:github` becomes `resolved` only after a pending review is created or manual posting instructions are written for non-GitHub contexts.
- `### Terminal External Review State` must contain exactly one current marker.
- `pending-review-created` requires `Pending Review ID` to be populated; `manual-posting-provided` requires `Pending Review ID` and `Pending Review URL` to remain `none`.
- When `## Hardened State` is absent, continue in legacy best-effort mode and explicitly report that hardened protections are inactive.
