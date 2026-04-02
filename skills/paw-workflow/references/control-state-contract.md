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

## Reconciliation Rules

- When `## Hardened State` is present, it is the durable workflow source of truth. Reconcile it against artifacts, git state, PR state, and other live facts before any mutation-affecting decision.
- Mutation-affecting decisions include delegation, transition advancement, review execution, git mutation, and final PR creation.
- `Reconciliation: current` means the embedded state was checked against the relevant live state and can drive mutation-affecting decisions.
- `Reconciliation: stale` means the embedded state may no longer match artifacts/git/PR state. Mutation-affecting decisions must block until reconciliation succeeds.
- `Reconciliation: external_unverified` means external state (for example git or PR state) could not be proven. Mutation-affecting decisions must block until reconciliation succeeds.
- `Reconciliation: not_run` means reconciliation has not yet happened in the current context. Reconcile before mutation-affecting decisions.
- Read-only status/reporting may continue when reconciliation is `stale` or `external_unverified`, but must explicitly label the result as read-only and unverified.
- When `## Hardened State` is absent, continue in legacy best-effort mode and explicitly report that hardened protections are inactive.
- When hardened state is present, determine the next required workflow activity from the first required activity item whose status is not terminal (`resolved` or `not_applicable`). A preceding `blocked` item blocks advancement.
- Gate items and configured procedure items must be `resolved` or `not_applicable` before later mutation-affecting activities that depend on them can proceed.
- Configured procedure items become `resolved` only when the configured mode actually ran. Unsupported runtime/mode combinations must be recorded as `blocked`, never silently downgraded.
