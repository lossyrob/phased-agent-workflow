# Hardening PAW-Lite Transitions

## Overview

This work hardens PAW-Lite and standard PAW stage transitions so configured workflow obligations remain visible throughout autonomous runs. It addresses issue #306 by making PAW-Lite boundaries explicit, treating preset-derived configuration as active obligations, and keeping final PR creation centralized in `paw-pr`.

The implementation deliberately avoids a runtime control database in generated `WorkflowContext.md`. Workflow context generation remains durable configuration only; boundary reliability comes from recurring prompt guidance, visible TODO categories, standard transition output, and regression tests.

## Architecture and Design

### High-Level Architecture

The change has four cooperating parts:

1. `paw-init` preserves `WorkflowContext.md` as resolved workflow configuration. Generated contexts contain configuration fields such as review policy, planning docs review, final review mode, and artifact lifecycle, but not mutable activity or gate state.
2. `paw-lite` now has a configuration contract and named boundary checkpoints. Because PAW-Lite runs inline rather than through `paw-transition`, it emits compact boundary briefs and TODO guidance at every stage handoff.
3. `paw-transition` now surfaces configured obligations in standard PAW through `obligation_summary`, while preserving existing transition fields and TODO chaining.
4. Integration tests cover both fast content checks and seeded SDK-style boundary evaluations so regressions are caught without requiring a full manual PAW-Lite run for every scenario.

### Boundary Contract

PAW-Lite recognizes these named boundaries:

| Boundary | Required behavior |
|----------|-------------------|
| `plan->planning-docs-review` | Run `paw-planning-docs-review` before implementation when planning docs review is enabled |
| `plan->implement` | Proceed to implementation only when planning docs review is disabled |
| `planning-docs-review->implement` | Proceed after planning review findings are resolved or intentionally accepted |
| `implement->final-review` | Run the configured final review when final agent review is enabled |
| `implement->final-pr` | Skip final review only when final agent review is disabled, then hand off to `paw-pr` |
| `final-review->final-pr` | Hand final PR creation to `paw-pr` after final review is complete |

Each boundary brief states what completed, the next activity, the required gate or procedure, the relevant configured value, an incorrect shortcut to avoid, and the next TODOs. PAW-Lite also supports deterministic named-boundary evaluation for tests and troubleshooting: when asked to evaluate a named boundary, it returns the brief and TODO guidance without advancing unrelated stages.

### TODO Categories

PAW-Lite separates implementation work from boundary checkpoints:

- Work-item TODOs use `lite:<work-id>:work:<item>`.
- Boundary TODOs use `lite:<work-id>:boundary:<boundary-name>`.

Completion checks for implementation and final PR readiness filter by category. Pending future-boundary TODOs do not block completed implementation work, while the active named boundary still gates the next workflow step.

### Configuration Obligations

Resolved `WorkflowContext.md` values are treated as obligations whether they came from defaults, presets, user defaults, or explicit overrides. The important fields are:

- `Planning Docs Review` and planning review mode fields
- `Final Agent Review` and final review mode fields
- `Review Policy`
- `Artifact Lifecycle`

`Review Policy` controls human pause points only. It does not disable mandatory automated gates, configured planning docs review, configured final review, or final PR routing.

### Final PR Ownership

Final PR creation remains owned by `paw-pr`. PAW-Lite and `paw-transition` identify inline PR creation, inline artifact stop-tracking, and inline remote push as incorrect shortcuts. This keeps pre-flight validation, artifact lifecycle handling, PR creation, and description scaling centralized.

### Integration Points

- `skills/paw-init/SKILL.md`: WorkflowContext template and resolved-configuration guardrails.
- `skills/paw-lite/SKILL.md`: PAW-Lite configuration contract, boundary checkpoints, TODO categories, review routing, and final PR handoff.
- `skills/paw-transition/SKILL.md`: Standard PAW obligation summary and preflight output tightening.
- `skills/paw-status/SKILL.md`: Help-mode wording for CLI and VS Code.
- `tests/integration/lib/paw-lite-boundary.ts`: Shared seeded boundary evaluation helper for runtime-style workflow tests.
- `tests/integration/lib/tool-policy.ts`: Windows-safe path normalization for integration tool policy checks.

## User Guide

### Prerequisites

Use the normal PAW initialization flow or load PAW-Lite with a `WorkflowContext.md` that records resolved configuration. No new runtime service, hook, MCP, or external monitor is required.

### Basic Usage

For PAW-Lite, run the workflow as before. At each handoff, the agent should produce a compact boundary brief before moving forward. The brief should make the configured obligation obvious, for example:

- Planning docs review enabled: run `paw-planning-docs-review` before implementation.
- Final agent review enabled: run the configured final review mode before final PR.
- Final agent review disabled: skip final review by configuration, but still use `paw-pr`.

For standard PAW, use `continue` as before. `paw-transition` now includes an obligation summary alongside the existing transition result so the next activity and its required procedure remain visible.

### Advanced Usage

When using presets, check `WorkflowContext.md` to see the resolved values. PAW-Lite treats those values exactly like explicitly requested options. For example, a preset that resolves to `Final Review Mode: society-of-thought` requires the SoT path; a generic self-review or ad-hoc single-model review is not a valid substitute.

If a review policy such as `planning-only` or `final-pr-only` is selected, expect fewer human pauses, not fewer automated gates. Configured planning docs review, final review, implementation review, and final PR handoff still run when enabled by the workflow configuration.

## API Reference

### Key Components

| Component | Purpose |
|-----------|---------|
| `WorkflowContext.md` | Durable resolved configuration read by workflow skills |
| PAW-Lite boundary brief | Compact transition reminder with next activity and required obligations |
| PAW-Lite boundary TODO | Visible checkpoint for the next PAW-Lite handoff |
| `obligation_summary` | Standard PAW transition output field naming the configured gate, procedure, or PR routing obligation |
| `paw-pr` | Owner of final PR preflight, artifact lifecycle action, push, and PR creation |

### Configuration Options

| Field | Effect |
|-------|--------|
| `Planning Docs Review` | Enables or disables the planning-docs-review gate before implementation |
| `Planning Review Mode` | Selects the planning review procedure when planning docs review is enabled |
| `Final Agent Review` | Enables or disables final review before final PR |
| `Final Review Mode` | Selects single-model, multi-model, or society-of-thought final review |
| `Review Policy` | Controls human pause points only |
| `Artifact Lifecycle` | Controls `.paw/work/` artifact tracking and cleanup behavior, executed by `paw-pr` at final PR time |

## Testing

### How to Test

Run the fast skill suite:

```bash
cd tests/integration && npm run test:integration:skills
```

Run the targeted workflow regression group:

```bash
cd tests/integration && npx tsx --test tests/workflows/paw-lite-boundary-chain.test.ts tests/workflows/paw-lite-planning-docs-review-routing.test.ts tests/workflows/paw-lite-todo-filtering.test.ts tests/workflows/paw-lite-preset-obligations.test.ts tests/workflows/paw-lite-review-policy.test.ts tests/workflows/paw-lite-final-pr-handoff.test.ts tests/workflows/transition-obligations.test.ts tests/workflows/paw-init-workflow-context.test.ts tests/workflows/workflow-context-lifetime.test.ts
```

Run standard project checks:

```bash
npm run compile
npm run lint
npm run lint:agent:all
mkdocs build --strict
```

### Edge Cases

- Planning docs review disabled routes from planning directly to implementation.
- Final agent review disabled routes implementation completion directly to `paw-pr`.
- Society-of-thought modes require the configured SoT procedure.
- Review policies reduce human pauses but do not bypass configured automated procedures.
- Generated `WorkflowContext.md` artifacts must remain free of runtime control-state markers.
- Windows integration test paths are normalized before tool policy checks.

## Limitations and Future Work

This work hardens prompts and tests; it does not add enforcement hooks, tool-call blocking, MCP dependencies, or a runtime state database. PAW-Lite still relies on the executing agent to follow the boundary contract. Future improvements could add more targeted seeded boundary tests as new presets or workflow modes are introduced.
