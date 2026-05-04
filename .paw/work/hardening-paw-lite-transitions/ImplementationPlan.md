# Hardening PAW-Lite Transitions Implementation Plan

## Overview

Implement prompt-level workflow hardening for issue #306 by making PAW-Lite stage boundaries explicit, recurring, configuration-aware, and visible through TODOs while keeping `WorkflowContext.md` a durable configuration artifact. The primary implementation targets are `skills/paw-lite/SKILL.md`, `skills/paw-transition/SKILL.md`, and targeted integration tests under `tests/integration/tests/`.

The approach preserves PAW's architecture philosophy: tools and SQL TODOs provide coordination, while skills and agents provide workflow reasoning. No runtime control-state section, deny hook, broad tool-call inspection, MCP dependency, or embedded workflow database is introduced.

## Current State Analysis

- `skills/paw-lite/SKILL.md` orchestrates five stages inline and does not delegate to `paw-transition`; research found no compact boundary guidance, no stage-boundary TODO chain, and no shortcut-warning text at boundaries (`CodeResearch.md:91-120`, `CodeResearch.md:246-257`).
- PAW-Lite Stage 2 creates `Plan.md` and seeds implementation TODOs, then continues toward implementation without a planning-docs-review or implementation boundary checkpoint (`CodeResearch.md:95-108`, `CodeResearch.md:248-252`).
- PAW-Lite Stage 3 dispatches implementation work and commits after completion, but does not read `Final Agent Review` to route enabled configurations to final review or disabled configurations directly to final PR (`CodeResearch.md:101-111`).
- PAW-Lite Stage 4 reads `Final Review Mode` and supports `single-model`, `multi-model`, and `society-of-thought`, but does not state that configured procedures are mandatory or that SoT cannot be replaced by ad-hoc review (`CodeResearch.md:113-121`).
- PAW-Lite Stage 5 loads `paw-pr`, but lacks boundary guidance identifying inline PR creation, inline stop-tracking, or inline remote push as incorrect shortcuts (`CodeResearch.md:215-230`).
- `paw-init`'s WorkflowContext template is already config-only and excludes control-state sections; the current workflow's `## Control State` was created by workflow execution rather than the template (`CodeResearch.md:57-90`, `CodeResearch.md:330-340`).
- Because the observed `## Control State` section was added after init, the implementation must inspect and harden non-init workflow prompt paths that may update `WorkflowContext.md`, not only the init template (`CodeResearch.md:76-83`).
- Preset resolution stores resolved configuration values in `WorkflowContext.md`, including planning review and final review choices; these values need to be treated as obligations downstream regardless of whether they came from defaults, presets, or explicit overrides (`CodeResearch.md:183-214`).
- Standard `paw-transition` emits a structured result and queues next activity plus transition TODOs, but does not explicitly state the review-policy/automated-gate distinction, configured review-mode obligation, or final PR routing in its output (`CodeResearch.md:135-165`).
- `PAW.agent.md` already contains stronger standard-PAW guardrails for review policy and final PR routing, so standard PAW needs transition-output tightening rather than a redesign (`CodeResearch.md:167-181`).
- Existing tests cover adjacent behavior but not PAW-Lite boundary TODO chaining, PAW-Lite boundary guidance, preset-derived obligations, review-policy/automated-gate distinction, or PAW-Lite final PR handoff (`CodeResearch.md:258-294`).

## Desired End State

- Generated `WorkflowContext.md` remains durable configuration only: no runtime control-state section, reconciliation marker, mutable activity/gate status, SQL mirror, or embedded workflow database.
- `WorkflowContext.md` remains config-only across the workflow lifetime: representative post-init PAW-Lite and standard PAW boundary/review paths must not append runtime control state after initialization.
- PAW-Lite emits compact boundary checkpoint guidance at every applicable transition: plan-to-planning-docs-review, plan-to-implementation, planning-docs-review-to-implementation, implementation-to-final-review, implementation-to-final-PR, and final-review-to-final-PR.
- Each PAW-Lite boundary brief states what completed, what comes next, what must happen before advancing, the applicable config/preset obligation, the incorrect shortcut to avoid, and the TODOs needed for the next stage or boundary.
- PAW-Lite maintains a visible boundary TODO chain using existing session TODO mechanisms, with boundary checkpoint TODOs distinguishable from implementation work-item TODOs.
- When `Planning Docs Review: enabled`, PAW-Lite explicitly runs the `paw-planning-docs-review` activity before implementation; boundary wording and TODOs cannot substitute for executing the activity.
- PAW-Lite completion checks distinguish implementation work-item TODOs from boundary checkpoint TODOs so pending future-boundary TODOs do not falsely block review or final PR readiness.
- Preset/config-derived obligations are surfaced as mandatory, including `Planning Docs Review`, `Planning Review Mode`, `Final Agent Review`, `Final Review Mode`, SoT routing, `Review Policy`, `Artifact Lifecycle`, and final PR ownership by `paw-pr`.
- Review policy is consistently described as controlling human pauses only; it does not disable automated gates or configured review procedures.
- PAW-Lite final PR readiness always routes through `paw-pr`; inline PR creation, inline stop-tracking, and inline push are identified as incorrect shortcuts.
- Standard PAW `paw-transition` output continues existing TODO and lifecycle behavior while naming mandatory gates, configured review procedures, review-policy boundaries, and final PR routing.
- Automated coverage includes fast prompt/content tests and targeted SDK workflow tests for the issue acceptance criteria.

## What We're NOT Doing

- Not adding `## Control State`, runtime activity status, gate status, reconciliation markers, SQL mirror data, or mutable workflow bookkeeping to generated `WorkflowContext.md`.
- Not introducing deny hooks, broad tool-call inspection, MCP requirements, shell-command policing, or an external attention layer.
- Not redesigning standard PAW stage orchestration or replacing `paw-transition`.
- Not moving artifact lifecycle cleanup, stop-tracking, push, or PR creation out of `paw-pr`.
- Not changing review policy semantics beyond clarifying that it affects human review pauses only.
- Not changing preset resolution semantics, preset precedence, or model resolution.
- Not requiring full manual PAW-Lite end-to-end runs for every scenario when fast skill tests and targeted SDK workflow tests can validate the behavior.

## Phase Status

- [x] **Phase 1: WorkflowContext and configuration obligation guardrails** - Lock config-only context generation and establish resolved configuration as mandatory workflow obligations.
- [x] **Phase 2: PAW-Lite boundary checkpoint contract and TODO chain** - Add recurring compact boundary briefs and visible boundary TODO maintenance to PAW-Lite.
- [ ] **Phase 3: PAW-Lite review and final PR boundaries** - Harden final review enabled/disabled routing, SoT non-substitution, review-policy language, and paw-pr handoff.
- [ ] **Phase 4: Standard PAW transition output tightening** - Align `paw-transition` output with mandatory gate, configured procedure, and final PR routing expectations.
- [ ] **Phase 5: Integration coverage and regression consolidation** - Add targeted SDK workflow coverage across PAW-Lite and standard transition boundaries.
- [ ] **Phase 6: Documentation** - Capture as-built behavior and update user-facing transition/workflow documentation where warranted.

## Phase Candidates

None initially.

---

## Phase 1: WorkflowContext and Configuration Obligation Guardrails

### Changes Required:

- **`skills/paw-init/SKILL.md`**: Strengthen the WorkflowContext generation instructions near the existing template so generated context remains durable configuration only. Explicitly prohibit adding runtime control-state sections, reconciliation markers, mutable activity/gate status lists, or SQL mirrors during init or later context updates.
- **`skills/paw-init/SKILL.md`**: Clarify in the preset/configuration area that after defaults, user defaults, presets, and explicit overrides resolve, stored `WorkflowContext.md` values are active workflow obligations for downstream skills. This should not change preset resolution behavior or valid configuration combinations.
- **`agents/PAW.agent.md`, `skills/paw-*.md`, and workflow tests**: Search for `Control State`, `TODO Mirror`, `Reconciliation`, mutable activity/gate status instructions, and workflow-context update rules. Remove or replace runtime-state-in-`WorkflowContext.md` instructions with SQL TODO/session-state guidance or config-only guardrails. This task targets the non-init write path implied by CodeResearch, not only the `paw-init` template.
- **`skills/paw-lite/SKILL.md`**: Add a compact configuration-read requirement for PAW-Lite boundaries. The skill should treat resolved `WorkflowContext.md` fields as obligations, including `Planning Docs Review`, `Planning Review Mode`, `Final Agent Review`, `Final Review Mode`, `Review Policy`, `Artifact Lifecycle`, and relevant model fields.
- **`skills/paw-lite/SKILL.md`**: Add the PAW-Lite review-policy rule: review policy controls human pause points only and does not disable automated gates, configured planning docs review, configured final review, or final PR handoff.
- **`tests/integration/tests/skills/workflow-context-guardrails.test.ts`**: Add fast content assertions that the `paw-init` WorkflowContext template remains config-only and does not contain `## Control State`, `TODO Mirror`, `Reconciliation`, mutable activity/gate status lists, or SQL mirror sections.
- **`tests/integration/tests/workflows/paw-init-workflow-context.test.ts`**: Add a generation-level test that runs initialization or the nearest existing SDK-equivalent init path, then inspects the produced `.paw/work/<work-id>/WorkflowContext.md` artifact and asserts it contains durable configuration fields while excluding `## Control State`, `TODO Mirror`, `Reconciliation`, mutable activity/gate status lists, and SQL mirror data.
- **`tests/integration/tests/workflows/workflow-context-lifetime.test.ts`**: Add a regression that starts from a config-only `WorkflowContext.md`, executes representative later workflow paths such as a PAW-Lite boundary and a standard `paw-transition`/planning-docs-review path, and asserts the artifact still excludes `## Control State`, `TODO Mirror`, `Reconciliation`, mutable activity/gate status lists, and SQL mirror data.
- **`tests/integration/tests/skills/paw-lite-boundary-content.test.ts`**: Add initial fast assertions that PAW-Lite contains resolved-configuration obligation language and review-policy human-pause-only language.

### Success Criteria:

#### Automated Verification:
- [ ] Fast WorkflowContext guardrail test passes: `cd tests/integration && npx tsx --test tests/skills/workflow-context-guardrails.test.ts`
- [ ] Generated WorkflowContext test passes: `cd tests/integration && npx tsx --test tests/workflows/paw-init-workflow-context.test.ts`
- [ ] WorkflowContext lifetime regression passes: `cd tests/integration && npx tsx --test tests/workflows/workflow-context-lifetime.test.ts`
- [ ] Fast PAW-Lite content test passes: `cd tests/integration && npx tsx --test tests/skills/paw-lite-boundary-content.test.ts`
- [ ] Prompt lint passes and reports before/after token counts for changed prompt files: `./scripts/lint-prompting.sh skills/paw-init/SKILL.md` and `./scripts/lint-prompting.sh skills/paw-lite/SKILL.md`
- [ ] Repository lint passes: `npm run lint`

#### Manual Verification:
- [ ] `skills/paw-init/SKILL.md` still describes `WorkflowContext.md` as durable configuration rather than runtime state.
- [ ] No new prompt text asks agents to write control-state sections into `WorkflowContext.md`.
- [ ] Non-init workflow prompts and skills have been searched for runtime `WorkflowContext.md` state-writing instructions and updated or covered by tests.
- [ ] Preset-derived, defaulted, and explicitly configured values are described as resolved obligations without changing preset precedence or schema.

---

## Phase 2: PAW-Lite Boundary Checkpoint Contract and TODO Chain

### Changes Required:

- **`skills/paw-lite/SKILL.md`**: Add a PAW-Lite boundary checkpoint contract near the stage overview. The contract should define the compact brief shape at the component level: completed stage, next activity, mandatory gate/procedure, configured mode/value, incorrect shortcut, and next TODOs.
- **`skills/paw-lite/SKILL.md`**: Add planning-stage boundary checkpoints after Stage 2 plan creation and SQL implementation TODO seeding:
  - When `Planning Docs Review: enabled`, guidance states planning completed, PAW-Lite must load and execute `paw-planning-docs-review` before Stage 3 implementation, the configured planning review mode/models are obligations, skipping directly to implementation is incorrect, and next TODOs include the planning-docs-review activity plus the next boundary checkpoint.
  - When `Planning Docs Review: disabled`, guidance states planning completed, implementation begins next, all plan work items and the next boundary checkpoint must be tracked, and planning docs review is intentionally not required.
- **`skills/paw-lite/SKILL.md`**: Add the planning-docs-review activity into the PAW-Lite flow when enabled, using the existing `paw-planning-docs-review` skill rather than treating boundary guidance as a replacement. Implementation must not begin until planning docs review completes and any blocking findings are resolved.
- **`skills/paw-lite/SKILL.md`**: Add planning-docs-review-to-implementation boundary guidance. It should state review completed, implementation begins next, blocking review findings must be addressed before implementation, and the implementation boundary TODO must remain visible.
- **`skills/paw-lite/SKILL.md`**: Define boundary TODOs as stage/checkpoint tracking items maintained in the existing session TODO system. They should be distinguishable from implementation work-item TODOs so PAW-Lite's existing implementation completion and final PR pre-checks remain meaningful.
- **`skills/paw-lite/SKILL.md`**: Update existing non-done TODO checks so implementation/review/PR readiness checks filter for the relevant TODO category. Implementation work-item checks should not be blocked by pending boundary TODOs for future transitions, while boundary TODO checks should still prevent advancing past the corresponding checkpoint.
- **`tests/integration/tests/skills/paw-lite-boundary-content.test.ts`**: Extend fast assertions for plan-to-planning-docs-review, plan-to-implementation, planning-docs-review-to-implementation, compact brief contents, and boundary TODO maintenance.
- **`tests/integration/tests/workflows/paw-lite-boundary-chain.test.ts`**: Add targeted SDK coverage that seeds `WorkflowContext.md` values for planning-docs-review enabled and disabled scenarios, invokes PAW-Lite boundary behavior, and verifies response content plus boundary TODO creation/maintenance.
- **`tests/integration/tests/workflows/paw-lite-planning-docs-review-routing.test.ts`**: Add a targeted workflow test proving `Planning Docs Review: enabled` routes to `paw-planning-docs-review` before implementation and `Planning Docs Review: disabled` routes directly to implementation while still maintaining the next boundary TODO.
- **`tests/integration/tests/workflows/paw-lite-todo-filtering.test.ts`**: Add a targeted workflow or harness-level test proving pending boundary TODOs do not cause implementation work completion or final PR pre-check queries to fail when implementation work-item TODOs are complete.
- **Testability design**: Implement PAW-Lite boundary instructions so tests can deterministically exercise a named boundary from seeded artifacts and `WorkflowContext.md`, without broad end-to-end runs or brittle prompt steering. Acceptable approaches include an explicit stage/resume instruction in the skill text or a shared test harness prompt that asks PAW-Lite to evaluate a named boundary while preserving the same boundary contract used during normal execution.

### Success Criteria:

#### Automated Verification:
- [x] Fast PAW-Lite boundary content test passes: `cd tests/integration && npx tsx --test tests/skills/paw-lite-boundary-content.test.ts`
- [x] Boundary chain workflow test passes: `cd tests/integration && npx tsx --test tests/workflows/paw-lite-boundary-chain.test.ts`
- [x] Planning docs review routing test passes: `cd tests/integration && npx tsx --test tests/workflows/paw-lite-planning-docs-review-routing.test.ts`
- [x] Boundary TODO filtering test passes: `cd tests/integration && npx tsx --test tests/workflows/paw-lite-todo-filtering.test.ts`
- [x] Prompt lint passes and reports before/after token counts for `skills/paw-lite/SKILL.md`.
- [ ] Integration skill suite passes: `cd tests/integration && npm run test:integration:skills` (script absent; actual `npm run test:skills` was attempted and reproduced the pre-existing hang after `pawCommonRules`)
- [x] Repository lint passes: `npm run lint`

#### Manual Verification:
- [x] Planning boundary guidance is compact and operational rather than tutorial prose.
- [x] Planning docs review enabled executes `paw-planning-docs-review` before implementation; a boundary brief or TODO alone is not considered sufficient.
- [x] Disabled planning docs review does not require that review, but still maintains the next implementation boundary TODO.
- [x] Boundary TODO guidance does not mutate `WorkflowContext.md`, and readiness checks separate boundary checkpoint TODOs from implementation work-item TODOs.
- [x] Workflow tests have a deterministic boundary entry strategy and do not rely on unstated PAW-Lite boundary hooks.

---

## Phase 3: PAW-Lite Review and Final PR Boundaries

### Changes Required:

- **`skills/paw-lite/SKILL.md`**: Add implementation-to-review/final-PR boundary guidance after Stage 3 completion. The guidance should read `Final Agent Review` and branch:
  - Enabled: final review is mandatory before final PR; the boundary names the configured `Final Review Mode`, models/specialists as applicable, and rejects ad-hoc substitutes.
  - Disabled: final review is intentionally skipped by configuration; final PR is next and still must route through `paw-pr`.
- **`skills/paw-lite/SKILL.md`**: Strengthen Stage 4 review routing so `single-model`, `multi-model`, and `society-of-thought` are treated as configured procedures. For `society-of-thought`, require `paw-sot` through the configured review path and identify generic self-review or ad-hoc single-model review as incorrect.
- **`skills/paw-lite/SKILL.md`**: Add final-review-to-final-PR boundary guidance after review completion. It should state final review completed, findings are resolved or intentionally carried forward, final PR is next, and inline PR creation, inline `git push`, and inline stop-tracking/artifact cleanup are incorrect shortcuts.
- **`skills/paw-lite/SKILL.md`**: Strengthen Stage 5 so it remains a handoff to `paw-pr`, preserving `paw-pr` as the owner of artifact lifecycle detection, stop-tracking, push, and PR creation.
- **`skills/paw-pr/SKILL.md`**: Modify only if PAW-Lite boundary text is insufficient. If touched, add a small guardrail aligned with existing guardrails that final PR preparation and artifact lifecycle cleanup are owned by `paw-pr`.
- **`tests/integration/tests/skills/paw-lite-boundary-content.test.ts`**: Extend fast assertions for implementation-to-final-review, implementation-to-final-PR, final-review-to-final-PR, SoT non-substitution, review-policy human-pause distinction, disabled final review routing, and final PR shortcut warnings.
- **`tests/integration/tests/workflows/paw-lite-preset-obligations.test.ts`**: Add a preset-derived scenario using a real preset path, preferably `auto-full` or `thorough`, that verifies resolved `WorkflowContext.md` fields include planning docs review and SoT final review settings, then verifies PAW-Lite boundary guidance treats those preset-derived values as mandatory obligations.
- **`tests/integration/tests/workflows/paw-lite-review-policy.test.ts`**: Add targeted workflow scenarios for `Final Agent Review: enabled`, `Final Agent Review: disabled`, `Final Review Mode: society-of-thought`, and review policies such as `final-pr-only` and `planning-only`.
- **`tests/integration/tests/workflows/paw-lite-final-pr-handoff.test.ts`**: Verify final-review-to-final-PR and implementation-to-final-PR guidance routes through `paw-pr` and identifies inline PR creation, inline stop-tracking, and inline remote push as incorrect shortcuts.

### Success Criteria:

#### Automated Verification:
- [ ] Fast PAW-Lite boundary content test passes: `cd tests/integration && npx tsx --test tests/skills/paw-lite-boundary-content.test.ts`
- [ ] Preset obligation workflow test passes: `cd tests/integration && npx tsx --test tests/workflows/paw-lite-preset-obligations.test.ts`
- [ ] PAW-Lite review policy workflow test passes: `cd tests/integration && npx tsx --test tests/workflows/paw-lite-review-policy.test.ts`
- [ ] PAW-Lite final PR handoff workflow test passes: `cd tests/integration && npx tsx --test tests/workflows/paw-lite-final-pr-handoff.test.ts`
- [ ] Prompt lint passes and reports before/after token counts for `skills/paw-lite/SKILL.md` and, if changed, `skills/paw-pr/SKILL.md`.
- [ ] Repository lint passes: `npm run lint`

#### Manual Verification:
- [ ] Final review enabled/disabled routing is explicit and matches `WorkflowContext.md`.
- [ ] Preset-derived SoT final review cannot be interpreted as optional or replaceable by self-review.
- [ ] At least one test proves obligations came through actual preset resolution, not only manually seeded fields.
- [ ] Review policy text does not imply automated gates or configured review procedures can be skipped.
- [ ] PAW-Lite does not duplicate stop-tracking, artifact cleanup, push, or PR creation steps owned by `paw-pr`.

---

## Phase 4: Standard PAW Transition Output Tightening

### Changes Required:

- **`skills/paw-transition/SKILL.md`**: Tighten Step 1, Step 2, and Step 3 guidance so transition output explicitly distinguishes human pause policy from mandatory automated gates and configured procedures.
- **`skills/paw-transition/SKILL.md`**: Extend or clarify the structured `TRANSITION RESULT` block to name the applicable configured obligation at boundaries, especially planning docs review, final review mode/procedure, and final PR routing. Preserve existing fields consumed by `PAW.agent.md`; any new field should be additive and optional for older agents.
- **`skills/paw-transition/SKILL.md`**: Strengthen Queue Next Activity guidance so queued TODO text keeps both the next activity and next transition visible, with enough obligation wording to prevent review-mode substitution.
- **`skills/paw-transition/SKILL.md`**: Add output-validity guardrails for: review policy never disables automated gates, configured final review procedure must be named before final PR, final PR readiness routes to `paw-pr`, and transition output must not depend on hooks/MCP/tool-call inspection.
- **`agents/PAW.agent.md`**: Make only minimal alignment edits if transition output gains an additive obligation field. Preserve existing standard PAW boundary delegation, review-policy rule, transition response handling, and final PR guardrail.
- **`tests/integration/tests/workflows/transition-review-policy.test.ts`**: Extend existing review-policy coverage to assert output states human pauses are separate from automated gates.
- **`tests/integration/tests/workflows/transition-obligations.test.ts`**: Add standard PAW transition scenarios for post-plan-review planning docs review, implementation-to-final-review with configured mode, final-review-to-final-PR, and final-agent-review-disabled-to-`paw-pr`.
- **`tests/integration/tests/skills/paw-agent-guardrails.test.ts`**: Update or extend fast guardrail assertions only if `PAW.agent.md` wording changes.

### Success Criteria:

#### Automated Verification:
- [ ] Existing transition review-policy test passes with new assertions: `cd tests/integration && npx tsx --test tests/workflows/transition-review-policy.test.ts`
- [ ] New standard transition obligation test passes: `cd tests/integration && npx tsx --test tests/workflows/transition-obligations.test.ts`
- [ ] Fast PAW agent guardrail test passes: `cd tests/integration && npx tsx --test tests/skills/paw-agent-guardrails.test.ts`
- [ ] Prompt lint passes and reports before/after token counts for `skills/paw-transition/SKILL.md` and, if changed, `agents/PAW.agent.md`.
- [ ] Repository lint passes: `npm run lint`

#### Manual Verification:
- [ ] `paw-transition` still queues next activity plus next transition TODOs.
- [ ] Output tightening is additive and does not require embedded runtime state, hooks, MCPs, or broad tool-call inspection.
- [ ] Standard PAW final PR readiness still routes through `paw-pr` and does not inline PR creation.
- [ ] Existing `pause_at_milestone` semantics remain tied to human pauses only.

---

## Phase 5: Integration Coverage and Regression Consolidation

### Changes Required:

- **`tests/integration/tests/skills/paw-lite-boundary-content.test.ts`**: Consolidate fast assertions so prompt obligations are protected even when full workflow tests are not run. Cover all FR-002/FR-003 boundary names, TODO chaining, preset/config obligations, review-policy distinction, SoT non-substitution, and final PR handoff warnings.
- **`tests/integration/tests/skills/workflow-context-guardrails.test.ts`**: Ensure generated-template content remains config-only and does not regress toward mutable control state.
- **`tests/integration/tests/workflows/paw-lite-boundary-chain.test.ts`**: Validate successive PAW-Lite boundary guidance and TODO chaining across plan, optional planning docs review, implementation, review, and PR handoff using custom seeded `WorkflowContext.md` patterns.
- **`tests/integration/tests/workflows/paw-lite-planning-docs-review-routing.test.ts`**: Validate actual PAW-Lite routing for planning-docs-review enabled/disabled configurations, including that implementation is not started before the required review completes when enabled.
- **`tests/integration/tests/workflows/paw-lite-todo-filtering.test.ts`**: Validate implementation work-item completion checks and final PR pre-checks ignore pending future-boundary TODOs while still honoring the active boundary checkpoint.
- **`tests/integration/tests/workflows/paw-lite-preset-obligations.test.ts`**: Validate at least one real preset initialization/resolution path before PAW-Lite boundary assertions so SC-004 covers preset-derived behavior directly.
- **`tests/integration/tests/workflows/paw-lite-review-policy.test.ts`**: Validate review-policy values such as `planning-only` and `final-pr-only` reduce human pauses only and do not remove planning docs review or final review obligations.
- **`tests/integration/tests/workflows/paw-lite-final-pr-handoff.test.ts`**: Validate final PR handoff through `paw-pr` and shortcut rejection after both final review completion and final-review-disabled implementation completion.
- **`tests/integration/tests/workflows/transition-obligations.test.ts`**: Validate standard PAW `paw-transition` tightened output still queues next activity/TODOs and names configured review/final PR obligations.
- **`tests/integration/lib/*`**: Prefer existing `createTestContext`, `loadSkill`, `RuleBasedAnswerer`, custom `WorkflowContext.md` writes, and `response?.data?.content` assertions. Add reusable assertion helpers only if repeated setup becomes hard to read.

### Success Criteria:

#### Automated Verification:
- [ ] Fast skill suite passes: `cd tests/integration && npm run test:integration:skills`
- [ ] Targeted workflow tests pass:
  - [ ] `cd tests/integration && npx tsx --test tests/workflows/paw-lite-boundary-chain.test.ts`
  - [ ] `cd tests/integration && npx tsx --test tests/workflows/paw-lite-planning-docs-review-routing.test.ts`
  - [ ] `cd tests/integration && npx tsx --test tests/workflows/paw-lite-todo-filtering.test.ts`
  - [ ] `cd tests/integration && npx tsx --test tests/workflows/paw-lite-preset-obligations.test.ts`
  - [ ] `cd tests/integration && npx tsx --test tests/workflows/paw-lite-review-policy.test.ts`
  - [ ] `cd tests/integration && npx tsx --test tests/workflows/paw-lite-final-pr-handoff.test.ts`
  - [ ] `cd tests/integration && npx tsx --test tests/workflows/transition-obligations.test.ts`
- [ ] Existing relevant regressions pass:
  - [ ] `cd tests/integration && npx tsx --test tests/workflows/transition-review-policy.test.ts`
  - [ ] `cd tests/integration && npx tsx --test tests/workflows/artifact-lifecycle.test.ts`
  - [ ] `cd tests/integration && npx tsx --test tests/workflows/planning-docs-review.test.ts`
- [ ] Repository lint passes: `npm run lint`
- [ ] Compile passes if test harness or TypeScript code changes: `npm run compile`

#### Manual Verification:
- [ ] Tests are targeted and do not require broad manual PAW-Lite end-to-end execution for every acceptance scenario.
- [ ] Test names and assertions map clearly to FR-001 through FR-010 and SC-001 through SC-008.
- [ ] New tests use semantic pattern assertions rather than brittle exact full-response strings where possible.
- [ ] Tests do not depend on generated `WorkflowContext.md` runtime control state.
- [ ] At least one test validates a generated WorkflowContext artifact, not only the prompt template.
- [ ] At least one test validates preset-derived boundary obligations through real preset resolution.
- [ ] At least one runtime-lifetime test validates later workflow activity does not append control state to `WorkflowContext.md`.

---

## Phase 6: Documentation

### Changes Required:

- **`.paw/work/hardening-paw-lite-transitions/Docs.md`**: Create the as-built technical reference using `paw-docs-guidance`. Include implemented boundary contract, configuration fields read, TODO chain behavior, review-policy distinction, final PR handoff, test coverage, and verification commands.
- **`docs/guide/stage-transitions.md`**: Update user-facing guidance if the new PAW-Lite boundary behavior is visible enough to document. Emphasize compact boundary checkpoints, mandatory automated gates, and review policy as human-pause control.
- **`docs/guide/workflow-modes.md`**: Update PAW-Lite workflow mode guidance if needed to describe boundary checkpoints, preset/config obligations, planning docs review behavior, final review enabled/disabled routing, and final PR through `paw-pr`.
- **`docs/specification/implementation.md` or `paw-specification.md`**: Update only where existing specification/reference material would become inaccurate. Keep changes concise and avoid duplicating skill prompt internals.
- **`README.md` / `DEVELOPING.md`**: No update expected unless implementation changes public command usage or contributor test commands beyond existing documented behavior.
- **Docs verification**: Use `mkdocs build --strict` from CodeResearch.md's documentation system findings.

### Success Criteria:

#### Automated Verification:
- [ ] Prompt lint still passes for all modified agent/skill files: `npm run lint:agent:all`
- [ ] TypeScript lint passes: `npm run lint`
- [ ] Documentation build passes: `mkdocs build --strict`
- [ ] Relevant integration tests from earlier phases still pass after documentation edits.

#### Manual Verification:
- [ ] `Docs.md` accurately describes actual implemented behavior and verification results.
- [ ] User-facing docs describe outcomes and workflow expectations without exposing implementation-only prompt mechanics unnecessarily.
- [ ] Documentation states `WorkflowContext.md` is durable configuration, not runtime state.
- [ ] Documentation states final PR creation remains owned by `paw-pr`.

---

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/306
- Spec: `.paw/work/hardening-paw-lite-transitions/Spec.md`
- Research: `.paw/work/hardening-paw-lite-transitions/CodeResearch.md`
- Planning draft: `.paw/work/hardening-paw-lite-transitions/planning/PLAN-claude-opus-4.7-xhigh.md`
- Planning draft: `.paw/work/hardening-paw-lite-transitions/planning/PLAN-gpt-5.5.md`
- Primary implementation targets: `skills/paw-lite/SKILL.md`, `skills/paw-transition/SKILL.md`, `skills/paw-init/SKILL.md`, `agents/PAW.agent.md`, `skills/paw-pr/SKILL.md`
- Primary test targets: `tests/integration/tests/skills/`, `tests/integration/tests/workflows/`
