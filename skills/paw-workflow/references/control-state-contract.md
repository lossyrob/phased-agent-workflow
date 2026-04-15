# Control State Contract

## Shared Core

- Presence of `## Control State` inside `WorkflowContext.md` or `ReviewContext.md` means control-state behavior is active. If the section is absent, continue in legacy best-effort mode.
- Embedded control state is the durable source of truth. Built-in TODOs are an execution mirror only.
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
- Schema evolution: additive changes only. Unknown fields/items must survive writer mutations.

## Workflow Identity

- `Workflow Identity: paw` (default) or `Workflow Identity: paw-lite` in `WorkflowContext.md`
- Absent → default to `paw`
- Legacy lite fallback: `Plan.md` exists without `ImplementationPlan.md` → read-only compatibility only

## WorkflowContext Embedding

For `Workflow Identity: paw`, seed this section in `.paw/work/<work-id>/WorkflowContext.md`:

```markdown
## Control State

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

## PAW Lite WorkflowContext Embedding

For `Workflow Identity: paw-lite`, seed a simplified `## Control State` with items: `init` (resolved), `planning`, `implementation`, `final-review`, `final-pr`, plus `procedure:final-review`. No gate items. Use `not_applicable` for `final-review` and `procedure:final-review` when `Final Agent Review` is `disabled`.

## Workflow Item IDs

- Standard PAW fixed activity IDs: `init`, `spec`, `spec-review`, `code-research`, `planning`, `plan-review`, `planning-docs-review`, `final-review`, `final-pr`
- PAW Lite fixed activity IDs: `init`, `planning`, `implementation`, `final-review`, `final-pr`
- Dynamic phase IDs: `phase:<n>:<slug>`. Gate IDs: `transition:<boundary>`. Procedure IDs: `procedure:<name>`.

## Reconciliation Rules

- `## Control State` is the durable source of truth. Reconcile against live state before mutation-affecting decisions (delegation, transitions, review, git mutation, PR creation).
- `current` → safe for mutations. `stale`/`external_unverified`/`not_run` → block mutations, allow read-only reporting.
- Absent `## Control State` → legacy best-effort mode, report protections inactive.
- `Workflow Identity` selects the required item set. For `paw-lite`: `init` → `planning` → `implementation` → `final-review` → `final-pr`.
- Next activity = first non-terminal required item. `blocked` items block advancement.
- Gate/procedure items must be terminal before dependent activities proceed.
- Procedure items become `resolved` only when the configured mode actually ran.
