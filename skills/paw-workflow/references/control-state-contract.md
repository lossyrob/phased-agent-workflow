# Control-State Contract

## Shared Core

- Presence of `## Hardened State` inside `WorkflowContext.md` or `ReviewContext.md` means hardened behavior is active. If the section is absent, continue in legacy best-effort mode.
- Embedded hardened state is the durable source of truth. Built-in TODOs are an execution mirror only.
- TODOs mirror only active required items whose status is `pending`, `in_progress`, or `blocked`.
- Shared status values:
  - `pending`
  - `in_progress`
  - `blocked`
  - `resolved`
  - `not_applicable`
- Shared reconciliation markers:
  - `not_run`
  - `current`
  - `stale`
  - `external_unverified`
- Shared item line format:
  - `- \`<item-id>\` | \`<status>\` | \`<kind>\``
- Preserve unknown additive fields or items when updating the section.

## WorkflowContext Embedding

Seed this section in `.paw/work/<work-id>/WorkflowContext.md`:

```markdown
## Hardened State

TODO Mirror: active-required-items
Reconciliation: not_run

### Required Workflow Items
- `init` | `resolved` | `activity`
- `spec` | `<pending|not_applicable>` | `activity`
- `spec-review` | `<pending|not_applicable>` | `activity`
- `code-research` | `pending` | `activity`
- `planning` | `pending` | `activity`
- `plan-review` | `pending` | `activity`
- `planning-docs-review` | `<pending|not_applicable>` | `activity`
- `final-review` | `<pending|not_applicable>` | `activity`
- `final-pr` | `pending` | `activity`

### Gate Items
- `transition:after-spec-review` | `<pending|not_applicable>` | `transition`
- `transition:after-plan-review` | `pending` | `transition`
- `transition:after-planning-docs-review` | `<pending|not_applicable>` | `transition`
- `transition:after-phase:<n>` | `pending` | `transition`
- `transition:after-final-review` | `<pending|not_applicable>` | `transition`

### Configured Procedure Items
- `procedure:planning-review` | `<pending|not_applicable>` | `procedure`
- `procedure:final-review` | `<pending|not_applicable>` | `procedure`
```

Resolve config-dependent rows to concrete values before writing the section:
- Use `not_applicable` for `spec`, `spec-review`, and `transition:after-spec-review` when `Workflow Mode` is `minimal`; otherwise use `pending`.
- Use `pending` for `planning-docs-review`, `transition:after-planning-docs-review`, and `procedure:planning-review` when `Planning Docs Review` is `enabled`; otherwise use `not_applicable`.
- Use `pending` for `final-review`, `transition:after-final-review`, and `procedure:final-review` when `Final Agent Review` is `enabled`; otherwise use `not_applicable`.

## Workflow Item IDs

- Fixed activity IDs:
  - `init`
  - `spec`
  - `spec-review`
  - `code-research`
  - `planning`
  - `plan-review`
  - `planning-docs-review`
  - `final-review`
  - `final-pr`
- Dynamic phase IDs use `phase:<n>:<slug>`.
- Gate IDs use `transition:<boundary>`.
- Configured procedure IDs use `procedure:<name>`.
