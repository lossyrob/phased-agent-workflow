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

## Reconciliation on Skill Load

Every skill that reads `WorkflowContext.md` (or `ReviewContext.md`) as its first action inherits this preamble. Apply it immediately after reading the file and before executing skill-specific procedure steps.

- **Drift check**: Compare each embedded activity/gate/procedure status against live evidence — artifacts in the work directory, `reviews/` outputs, git branch/commit state, and any PR/external state the skill can observe. Terminal statuses (`resolved`, `not_applicable`) must match live evidence.
- **Block on drift**: If any embedded status disagrees with live evidence, or if `Reconciliation` is `not_run`/`stale`/`external_unverified` and the skill is about to perform mutation-affecting work, STOP and report the specific drift. Do not auto-correct embedded state silently.
- **Persistent reconcile todo**: While `## Control State` exists, a SQL todo with id `reconcile:<work-id>` must exist. Create it with `INSERT OR IGNORE` if missing (status `pending`, title `Reconcile control state with live evidence`). Mark it `done` only when reconciliation confirms `Reconciliation: current` and no drift. Re-open it to `pending` whenever the skill advances to a new activity, enters a stage boundary, or detects any condition that invalidates the last reconciliation. The todo stays visible in the per-turn `<todo_status>` so reconciliation is surfaced even when no skill is loaded.
- **Absent control state**: Legacy best-effort mode; no reconcile todo is required, but note explicitly that control-state protections are inactive.
