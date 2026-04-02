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
- `pending-review-created`

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
- Terminal external review markers start at `none` and may later include `pending-review-created`.
