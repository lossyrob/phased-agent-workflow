---
date: 2026-05-04T00:00:00Z
git_commit: 753823c
branch: feature/hardening-paw-lite-transitions
repository: lossyrob/phased-agent-workflow
topic: "Hardening PAW-Lite Transitions and Preset Adherence"
tags: [research, codebase, paw-lite, paw-transition, paw-init, paw-pr, paw-final-review, integration-tests, presets]
status: complete
last_updated: 2026-05-04
---

# Research: Hardening PAW-Lite Transitions and Preset Adherence

## Research Question

Where and how does PAW-Lite manage stage boundaries and transition behavior? How is WorkflowContext.md generated, what does it contain, and what is the scope limitation on its content? How do presets resolve to configuration fields? How does standard PAW paw-transition skill produce its structured output? What integration test patterns exist for extending boundary and policy coverage?

## Summary

PAW-Lite (`skills/paw-lite/SKILL.md`) orchestrates five stages inline without delegating to `paw-transition`. There is no compact boundary guidance, TODO chaining between stage boundaries, or enforcement of preset-derived obligations at boundaries. The PAW-Lite Stage 4 (Review) reads `Final Review Mode` from WorkflowContext.md to select the review procedure, but does not explicitly state that preset-configured procedures are mandatory or that generic substitution is incorrect. Stage 5 (PR) loads `paw-pr` directly but no boundary text warns against inline PR creation.

WorkflowContext.md is generated from a prose template in `skills/paw-init/SKILL.md`. The template contains only durable configuration fields — no Control State section. The current workflow's WorkflowContext.md includes a `## Control State` section (with `TODO Mirror`, `Reconciliation`, `Required Workflow Items`, `Gate Items`, `Configured Procedure Items`) that does not appear in the paw-init template, indicating it was written by an agent during workflow execution, not as part of paw-init generation.

Standard PAW transition (`skills/paw-transition/SKILL.md`) produces a structured `TRANSITION RESULT` block with `pause_at_milestone`, `next_activity`, and `artifact_lifecycle_action` fields, but its structured output contains no named review-mode obligation field and no explicit statement that review policy does not disable automated gates.

Existing integration tests cover review policy legacy mapping, artifact lifecycle detection, and PAW.agent.md guardrail text, but no tests cover PAW-Lite stage boundary TODO chaining, preset-derived obligation surfacing, or the review-policy/automated-gates distinction.

---

## Documentation System

- **Framework**: MkDocs with Material theme (`mkdocs.yml:1-77`)
- **Docs Directory**: `docs/`
- **Navigation Config**: `mkdocs.yml` at repo root
- **Style Conventions**: Concise headings, fenced code blocks, table-heavy reference pages
- **Build Command**: `mkdocs build` (strict: `mkdocs build --strict`); serve: `mkdocs serve`
- **Standard Files**: `README.md` (root), `DEVELOPING.md` (root), `paw-specification.md` (root)
- **Relevant docs pages**: `docs/guide/stage-transitions.md`, `docs/guide/workflow-modes.md`, `docs/specification/implementation.md`

---

## Verification Commands

- **Lint (TypeScript)**: `npm run lint`
- **Lint (agents/skills prompting)**: `npm run lint:agent:all` or `./scripts/lint-prompting.sh agents/<file>.agent.md`
- **Build**: `npm run compile` (TypeScript → `out/`)
- **Docs build**: `source .venv/bin/activate && mkdocs build --strict`
- **Integration tests (all)**: `npm run test:integration` (or `cd tests/integration && npx tsx --test tests/**/*.test.ts`)
- **Integration tests (skills, fast/no-LLM)**: `npm run test:integration:skills`
- **Integration tests (workflows, requires Copilot auth)**: `npm run test:integration:workflows`
- **Single test file**: `cd tests/integration && npx tsx --test tests/workflows/<file>.test.ts`

---

## Detailed Findings

### 1. WorkflowContext.md Generation and Config-Only Behavior

**Template source**: `paw-init` skill defines the WorkflowContext.md template at `skills/paw-init/SKILL.md:197-241`. The template contains exclusively durable configuration fields:

```
Work Title, Work ID, Workflow Identity, Base Branch, Target Branch, Execution Mode,
Repository Identity, Execution Binding, Workflow Mode, Review Strategy, Review Policy,
Session Policy, Final Agent Review, Final Review Mode, Final Review Interactive,
Final Review Models, Final Review Specialists, Final Review Interaction Mode,
Final Review Specialist Models, Final Review Perspectives, Final Review Perspective Cap,
Implementation Model, Plan Generation Mode, Plan Generation Models, Planning Docs Review,
Planning Review Mode, Planning Review Interactive, Planning Review Models,
Planning Review Specialists, Planning Review Interaction Mode, Planning Review Specialist Models,
Planning Review Perspectives, Planning Review Perspective Cap, Custom Workflow Instructions,
Initial Prompt, Issue URL, Remote, Artifact Lifecycle, Artifact Paths, Additional Inputs
```

The paw-init template does **not** include any `## Control State` section, `TODO Mirror`, `Reconciliation`, `Required Workflow Items`, `Gate Items`, or `Configured Procedure Items` sections (`skills/paw-init/SKILL.md:197-241`).

**Current workflow's WorkflowContext.md**: The file at `.paw/work/hardening-paw-lite-transitions/WorkflowContext.md:44-70` contains a `## Control State` section with:
- `TODO Mirror: active-required-items` (line 46)
- `Reconciliation: current` (line 47)
- `### Required Workflow Items` with nine activity/status entries (lines 49-58)
- `### Gate Items` with five transition/status entries (lines 60-65)
- `### Configured Procedure Items` with two procedure/status entries (lines 67-70)

This section is absent from the paw-init template, confirming it was written by an agent during workflow execution rather than produced by paw-init generation (`skills/paw-init/SKILL.md:197-241` vs `.paw/work/hardening-paw-lite-transitions/WorkflowContext.md:44-70`).

**VS Code extension entry point**: `src/commands/initializeWorkItem.ts:157-198` defines `constructPawPromptArguments`, which builds a PAW chat prompt with initialization parameters (target_branch, workflow_mode, execution_mode, review_strategy, review_policy, session_policy, artifact_lifecycle, final_agent_review, final_review_mode, final_review_interactive, issue_url, custom_instructions). This invokes the PAW agent with `paw-init`; the actual WorkflowContext.md file is written by the agent in the session, not by TypeScript code.

**Artifact lifecycle choice** affects whether WorkflowContext.md is committed (`skills/paw-init/SKILL.md:285-289`):
- `commit-and-clean` or `commit-and-persist`: WorkflowContext.md committed with `Initialize PAW workflow for <Work Title>`
- `never-commit`: `.gitignore` with `*` created in work directory; WorkflowContext.md is NOT committed

### 2. PAW-Lite Skill: Stage Boundaries and Transition Behavior

**File**: `skills/paw-lite/SKILL.md`

PAW-Lite executes five inline stages in the calling agent's session (`skills/paw-lite/SKILL.md:7-8`):

| Stage | Lines | Key Behavior |
|-------|-------|--------------|
| 1: Work Shaping (optional) | 19-25 | Loads `paw-work-shaping` skill when request is vague |
| 2: Plan | 27-43 | Creates Plan.md; seeds SQL todos for fleet coordination |
| 3: Implement (fleet-style) | 45-65 | Dispatches background task subagents per SQL todo; commits after completion |
| 4: Review (configurable) | 67-91 | Reads `Final Review Mode` from WorkflowContext.md; dispatches review per mode |
| 5: PR | 93-97 | Loads `paw-pr` skill; pre-checks SQL todos |

**Boundary behavior**: PAW-Lite does not reference or delegate to `paw-transition` at any stage boundary (`skills/paw-lite/SKILL.md:1-120`). There is no compact boundary guidance block produced at transitions. There are no explicit "boundary TODO" entries created for tracking stage checkpoints. No shortcut-warning text appears at stage boundaries.

**Stage 2→3 transition** (plan to implement): After Plan.md creation and SQL todo seeding, the skill moves directly to Stage 3 with no intermediate boundary guidance (`skills/paw-lite/SKILL.md:27-50`). There is no handling for an optional planning docs review stage.

**Stage 3→4 transition** (implement to review): After verifying todos and committing, the skill moves directly to Stage 4 with no boundary guidance, no check for whether Final Agent Review is enabled or disabled, and no routing logic for `disabled` → skip to Stage 5 (`skills/paw-lite/SKILL.md:56-65`). The `Final Agent Review` field in WorkflowContext.md is not read during Stage 3's completion.

**Stage 4→5 transition** (review to PR): After review, the skill states "After review: Present findings to user. Apply fixes if straightforward, discuss trade-offs if not." then Stage 5 begins with "Load the `paw-pr` skill" (`skills/paw-lite/SKILL.md:90-94`). No boundary text identifies inline PR creation, inline stop-tracking, or inline remote push as incorrect shortcuts.

**Review mode routing** (Stage 4): The skill reads `Final Review Mode` from WorkflowContext.md and selects behavior (`skills/paw-lite/SKILL.md:69-88`):

| Mode | Behavior |
|------|----------|
| `single-model` | Agent self-reviews |
| `multi-model` | Parallel task subagents per model; synthesize findings |
| `society-of-thought` | Loads `paw-sot` skill with review context |

SoT invocation table maps WorkflowContext.md fields to `paw-sot` parameters (`skills/paw-lite/SKILL.md:79-88`), but no text states that ad-hoc review substitution is incorrect when SoT is configured.

**PAW-Lite defaults** (`skills/paw-lite/SKILL.md:112-120`):

| Field | Default |
|-------|---------|
| Workflow Mode | `custom` |
| Review Strategy | `local` |
| Review Policy | `final-pr-only` |
| Implementation Model | `none` |
| Artifact Lifecycle | `commit-and-clean` |

The skill's Configuration section describes defaults but does not include `Planning Docs Review`, `Final Agent Review`, `Final Review Mode`, or `Plan Generation Mode` — these come from WorkflowContext.md if set via paw-init.

### 3. Standard PAW Transition Skill (paw-transition)

**File**: `skills/paw-transition/SKILL.md`

The `paw-transition` skill is a subagent-executed gate (`skills/paw-transition/SKILL.md:7-8`) used by the standard PAW workflow (PAW.agent.md), not by PAW-Lite.

**Structured output** (`skills/paw-transition/SKILL.md:155-169`):

```
TRANSITION RESULT:
- session_action: [continue | new_session]
- pause_at_milestone: [true | false]
- next_activity: [activity name and context]
- artifact_lifecycle: [commit-and-clean | commit-and-persist | never-commit]
- artifact_lifecycle_action: [stop-tracking ... | none]
- preflight: [passed | blocked: <reason>]
- work_id: [current work ID]
- inline_instruction: [for new_session only]
- promotion_pending: [true | false]
- candidates: [list] (only if promotion_pending)
```

The output includes no named review-mode obligation field, no explicit statement that review policy does not disable automated gates, and no field for current configured procedure (e.g., `configured_final_review_mode`).

**Step 3: Stage Boundary and Milestone Pause logic** (`skills/paw-transition/SKILL.md:64-106`): Reads `Review Policy` from WorkflowContext.md and maps it to `pause_at_milestone = true/false` per stage. The logic covers `every-stage`, `milestones`, `planning-only`, and `final-pr-only`. No step in the procedure emits a statement about review policy not disabling automated gates.

**Step 2: Mandatory Transitions table** (`skills/paw-transition/SKILL.md:42-51`): Includes `paw-impl-review (passes, last phase, review enabled) → paw-final-review` (NO). The `Final Agent Review` check (enabled/disabled) affects whether next activity is `paw-final-review` or `paw-pr`, but the skill reads this from WorkflowContext.md `Final Agent Review` field (Step 1, line 32).

**Guardrails** (`skills/paw-transition/SKILL.md:193-199`): Six negative rules about output validity. None of the guardrails mention review policy/automated gate distinction or configured procedure obligation.

**Queue Next Activity** (Step 5, `skills/paw-transition/SKILL.md:148-152`): Queues `[ ] <activity-name>` and `[ ] paw-transition`. No guidance to include named review mode or preset-derived obligation in the queued TODO text.

### 4. PAW Agent Transition Handling (Standard PAW)

**File**: `agents/PAW.agent.md`

**Stage Boundary Rule** (`agents/PAW.agent.md:36-51`): After every stage boundary, delegate to `paw-transition` before proceeding. Lists eight stage boundaries.

**Review Policy Behavior** (`agents/PAW.agent.md:69-77`): Explicit statement: "Review Policy controls HUMAN review pauses only. It does NOT affect automated quality gates (paw-spec-review, paw-plan-review, paw-impl-review). Those are mandatory per the Mandatory Transitions table regardless of Review Policy setting."

**Final PR routing** (`agents/PAW.agent.md:193`): "If it returns `next_activity = paw-pr`, load `paw-pr` directly—do NOT create the final PR inline or bypass the skill."

**Transition response handling** (`agents/PAW.agent.md:112-122`): PAW agent acts on `artifact_lifecycle`, `artifact_lifecycle_action`, `pause_at_milestone`, `preflight`, `promotion_pending`, and `session_action`. No handling for a named review-mode field (because that field doesn't exist in the transition output).

**Prerequisites table** (`agents/PAW.agent.md:53-58`): `paw-pr` requires: "Load `paw-pr` skill. Honor `artifact_lifecycle` and `artifact_lifecycle_action` from `paw-transition`. All phase candidates resolved."

**Post plan-review flow** (`agents/PAW.agent.md:32-33`): After `paw-plan-review` returns PASS, check if Planning Docs Review is enabled. If enabled, load `paw-planning-docs-review` directly. After it completes, delegate to `paw-transition`.

### 5. Preset Resolution and WorkflowContext.md Configuration Fields

**Preset file location**: `skills/paw-init/references/presets/` (seven built-in presets).

**Preset resolution procedure** (`skills/paw-init/SKILL.md:120-130`):
1. Lookup: check `~/.paw/presets/` first, then `references/presets/`
2. Inheritance: resolve `extends` recursively (max depth 5)
3. Merge: base → child (most-specific-wins)
4. Validate: run Configuration Validation on merged result
5. Initial activity: if `initial_activity` set, use for completion recommendation

**Precedence** (`skills/paw-init/SKILL.md:78`): table defaults → user-level defaults → preset → explicit overrides.

**Built-in presets** (`skills/paw-init/references/presets/`):

| Preset | File | Key Fields |
|--------|------|------------|
| `quick` | `quick.yaml:1-7` | `workflow_mode: minimal`, `planning_docs_review: disabled`, `final_agent_review: disabled` |
| `auto` | `auto.yaml:1-6` | `workflow_mode: full`, `review_strategy: local`, `review_policy: final-pr-only` |
| `thorough` | `thorough.yaml:1-11` | `planning_docs_review: enabled`, `planning_review_mode: multi-model`, `final_agent_review: enabled`, `final_review_mode: society-of-thought`, `final_review_interaction_mode: debate` |
| `auto-full` | `auto-full.yaml:1-15` | `extends: auto`; adds `planning_docs_review: enabled`, `planning_review_mode: multi-model`, `final_agent_review: enabled`, `final_review_mode: society-of-thought` |

**Non-presetable fields** (`skills/paw-init/SKILL.md:100`): `base_branch`, `target_branch`, `preset`, `issue_url`, `custom_instructions`, `work_description`.

**Model resolution** (`skills/paw-init/SKILL.md:162-163`): Model intents (e.g., `latest Claude Opus`) are resolved to concrete model names at init time. Resolved concrete names are stored in WorkflowContext.md — not intent strings.

**Configuration validation constraints** (`skills/paw-init/SKILL.md:155-159`):
- `workflow_mode: minimal` → `review_strategy` MUST be `local`
- `review_policy: planning-only` or `final-pr-only` → `review_strategy` MUST be `local`
- `final_review_mode: society-of-thought` → `final_agent_review` MUST be `enabled`
- `planning_review_mode: society-of-thought` → `planning_docs_review` MUST be `enabled`

### 6. Final PR Activity (paw-pr)

**File**: `skills/paw-pr/SKILL.md`

PAW-Lite Stage 5 loads `paw-pr` and follows its instructions (`skills/paw-lite/SKILL.md:94`). The paw-pr skill runs directly in the PAW session (`skills/paw-pr/SKILL.md:8`).

**Stop-tracking operation** (commit-and-clean only, `skills/paw-pr/SKILL.md:81-91`):
1. Record HEAD SHA as "last artifact commit"
2. `git rm --cached -r .paw/work/<work-id>/`
3. Create `.paw/work/<work-id>/.gitignore` containing `*`
4. `git commit -m "Stop tracking PAW artifacts for <work-id>"`
5. Verify no tracked `.paw/` files remain

The paw-pr skill contains no statement that identifies inline PR creation as incorrect (that statement lives in PAW.agent.md:193).

**Guardrails** (`skills/paw-pr/SKILL.md:163-167`): Four guardrails about not modifying code, not approving/merging, not addressing review comments, not guessing artifact locations. None state that inline PR creation is incorrect.

**Artifact lifecycle detection** (`skills/paw-pr/SKILL.md:77-79`): Detects lifecycle using same hierarchy as `paw-transition`: WorkflowContext.md `Artifact Lifecycle:` field → legacy field mapping → `.gitignore` fallback → default `commit-and-clean`.

### 7. Final Review Activity (paw-final-review)

**File**: `skills/paw-final-review/SKILL.md`

**Configuration read** (Step 1, `skills/paw-final-review/SKILL.md:24-39`): Reads `Final Review Mode`, `Final Review Interactive`, `Final Review Models`, `Final Review Specialists`, `Final Review Interaction Mode`, `Final Review Specialist Models`, `Final Review Perspectives`, `Final Review Perspective Cap` from WorkflowContext.md.

**SoT invocation** (Step 4, `skills/paw-final-review/SKILL.md:138-154`): When mode is `society-of-thought`, loads `paw-sot` skill with review context sourced from WorkflowContext.md fields.

The skill does not contain a statement that ad-hoc single-model review is an incorrect substitute when SoT is configured. It also does not state that final review is mandatory or that review policy does not disable it.

**Completion status** (Step 6, `skills/paw-final-review/SKILL.md:285-296`): Returns `complete (ready for paw-pr)`. After completion, the PAW agent delegates to `paw-transition`, then `paw-pr` (per PAW.agent.md:193). In PAW-Lite, Stage 5 (paw-pr) follows directly.

### 8. SQL TODO Chain Patterns

**PAW-Lite SQL todos** (`skills/paw-lite/SKILL.md:31-37`): PAW-Lite uses SQL todos for fleet coordination in Stage 3. The todo pattern tracks implementation work items (INSERT with title, description, status; plus `todo_deps` for dependencies), not stage boundary transitions.

**Checking completion** (`skills/paw-lite/SKILL.md:59`): `SELECT id, status FROM todos WHERE status != 'done'`

**Stage 5 pre-check** (`skills/paw-lite/SKILL.md:96`): `SELECT id, status FROM todos WHERE status != 'done'` before invoking paw-pr.

**Standard PAW TODO pattern** (`agents/PAW.agent.md:107-114`): After completing any activity, determine if at a stage boundary. If yes, delegate to `paw-transition`. The transition skill queues `[ ] <activity-name>` and `[ ] paw-transition` TODOs (Step 5, `skills/paw-transition/SKILL.md:148-152`).

PAW-Lite has no equivalent boundary TODO creation. It does not queue `[ ] paw-transition` entries between stages.

### 9. Integration Test Infrastructure

**Test runner**: Node.js `node:test` module with `describe`/`it`. Run via `npx tsx --test` (`tests/integration/package.json:8-10`).

**Test types**:
- **Skill-level tests** (no LLM, fast): `tests/integration/tests/skills/` — read skill/agent files and assert content patterns
- **Workflow tests** (LLM required): `tests/integration/tests/workflows/` — drive SDK sessions

**Key harness components**:
- `createTestContext` (`tests/integration/lib/harness.ts:110-235`): Creates `CopilotClient`, `TestFixture`, and `Session` with tool policy, answerer, and hooks
- `TestFixture.clone(templateName)` (`tests/integration/lib/fixtures.ts:24-40`): Clones fixture template into a fresh temp git repo; supports `"minimal-ts"`
- `TestFixture.seedWorkflowState(workId, stage)` (`tests/integration/lib/fixtures.ts:47-54`): Copies pre-built artifacts from `tests/integration/fixtures/seeds/<stage>/` into the temp repo. Supported stages: `"spec" | "plan" | "planning-review" | "phase1"`
- `loadSkill(name)` (`tests/integration/lib/skills.ts:8-11`): Reads `skills/<name>/SKILL.md` as string for use in system prompts
- `loadAgent(name)` (`tests/integration/lib/skills.ts:13-16`): Reads `agents/<name>.agent.md`
- `RuleBasedAnswerer` (`tests/integration/lib/answerer.ts:25-55`): Rule-based auto-answerer for `ask_user` calls; fail-closed by default
- `Judge` (`tests/integration/lib/judge.ts:17-69`): LLM-as-judge via separate SDK session; evaluates artifacts against rubrics
- `assertSpecStructure`, `assertPlanStructure`, `assertArtifactExists`, `assertToolCalls` (`tests/integration/lib/assertions.ts:7-109`)

**WorkflowContext seeding pattern** (used by `transition-review-policy.test.ts:27-50` and `artifact-lifecycle.test.ts:29-59`): Tests create custom `WorkflowContext.md` files by directly calling `writeFile` on the fixture's `workDir`, allowing targeted scenario setup without `seedWorkflowState`.

**System prompt pattern** (used by `transition-review-policy.test.ts:68-80`): Skill content loaded via `loadSkill`, then composed into a system prompt with CRITICAL RULES. The session is driven by `ctx.session.sendAndWait({ prompt })`.

**Response assertion pattern**: Skill tests assert against `response?.data?.content ?? ""` using `assert.match(response, /pattern/)`.

**Existing tests relevant to this feature**:

| Test file | Type | What it covers | Runtime |
|-----------|------|----------------|---------|
| `tests/integration/tests/workflows/transition-review-policy.test.ts` | workflow | Legacy/current review policy mapping in `paw-transition` | ~2-4 min |
| `tests/integration/tests/workflows/artifact-lifecycle.test.ts` | workflow | Artifact lifecycle detection in `paw-transition` | ~3-5 min |
| `tests/integration/tests/skills/paw-agent-guardrails.test.ts` | skill (fast) | PAW.agent.md final PR routing guardrail text | <1s |
| `tests/integration/tests/skills/plan-deliverable-guardrails.test.ts` | skill (fast) | paw-implement and paw-impl-review deliverable guardrail text | <1s |
| `tests/integration/tests/skills/execution-contract-content.test.ts` | skill (fast) | PAW.agent.md, paw-git-operations, paw-init execution checkout contract text | <1s |
| `tests/integration/tests/workflows/planning-docs-review.test.ts` | workflow | planning-docs-review produces structured findings | ~1-2 min |
| `tests/integration/tests/workflows/minimal-workflow.test.ts` | workflow | Plan + implement (no spec) from brief | ~3-5 min |

**No existing tests** cover: PAW-Lite stage boundary TODO chaining, PAW-Lite boundary guidance content, preset-derived obligation surfacing, review-policy/automated-gates distinction in skill output, or PAW-Lite final PR handoff routing.

### 10. Fixture Seeds

**Seed directory**: `tests/integration/fixtures/seeds/`
- `spec/` — contains `Spec.md`
- `plan/` — planning stage artifacts
- `planning-review/` — planning review stage artifacts (used by `planning-docs-review.test.ts:53`)
- `phase1/` — phase 1 completion artifacts

**Fixture template**: `tests/integration/fixtures/minimal-ts/` — minimal TypeScript Express app used as the implementation target in all workflow tests.

---

## Code References

- `skills/paw-lite/SKILL.md:1-120` — Full PAW-Lite skill: five stages, no paw-transition delegation
- `skills/paw-lite/SKILL.md:19-25` — Stage 1: Work Shaping (optional)
- `skills/paw-lite/SKILL.md:27-43` — Stage 2: Plan creation and SQL todo seeding
- `skills/paw-lite/SKILL.md:45-65` — Stage 3: Fleet-style implementation with SQL coordination
- `skills/paw-lite/SKILL.md:67-91` — Stage 4: Configurable review (single/multi/SoT); reads WorkflowContext.md
- `skills/paw-lite/SKILL.md:79-88` — SoT invocation parameter table from WorkflowContext.md fields
- `skills/paw-lite/SKILL.md:90-91` — Stage 4 completion: present findings to user, no boundary guidance
- `skills/paw-lite/SKILL.md:93-97` — Stage 5: Load paw-pr, check todos; no shortcut warning
- `skills/paw-lite/SKILL.md:112-120` — PAW-Lite defaults table (Review Policy: final-pr-only)
- `skills/paw-transition/SKILL.md:20-30` — Step 1: Read WorkflowContext.md (Review Policy, Final Agent Review)
- `skills/paw-transition/SKILL.md:42-51` — Step 2: Mandatory Transitions table
- `skills/paw-transition/SKILL.md:64-106` — Step 3: Stage boundary/milestone pause logic per review policy
- `skills/paw-transition/SKILL.md:148-152` — Step 5: Queue next activity (activity + paw-transition TODOs)
- `skills/paw-transition/SKILL.md:155-169` — Structured TRANSITION RESULT output fields
- `skills/paw-transition/SKILL.md:193-199` — Guardrails (six output-validity rules)
- `agents/PAW.agent.md:36-51` — Stage Boundary Rule: delegate to paw-transition after every boundary
- `agents/PAW.agent.md:69-77` — Review Policy Behavior: review policy controls HUMAN pauses only
- `agents/PAW.agent.md:107-122` — Workflow Tracking and transition response handling
- `agents/PAW.agent.md:193` — Final PR routing: "do NOT create the final PR inline or bypass the skill"
- `agents/PAW.agent.md:32-33` — Post plan-review flow: check Planning Docs Review; delegate to paw-transition after
- `skills/paw-init/SKILL.md:197-241` — WorkflowContext.md template (config-only, no Control State section)
- `skills/paw-init/SKILL.md:82-130` — Preset system: file schema, built-in list, resolution procedure
- `skills/paw-init/SKILL.md:120-130` — Preset resolution: lookup, inherit, merge, validate
- `skills/paw-init/SKILL.md:155-159` — Configuration validation constraints
- `skills/paw-init/SKILL.md:162-163` — Model resolution: stored as concrete names at init time
- `skills/paw-init/SKILL.md:285-289` — Artifact lifecycle commit behavior
- `skills/paw-init/references/presets/auto.yaml:1-6` — auto preset: review_policy: final-pr-only
- `skills/paw-init/references/presets/thorough.yaml:1-11` — thorough preset: SoT final review, planning_docs_review: enabled
- `skills/paw-init/references/presets/quick.yaml:1-7` — quick: planning_docs_review: disabled, final_agent_review: disabled
- `skills/paw-init/references/presets/auto-full.yaml:1-15` — auto-full: extends auto + SoT final review
- `.paw/work/hardening-paw-lite-transitions/WorkflowContext.md:44-70` — Control State section (not in paw-init template)
- `skills/paw-pr/SKILL.md:81-91` — Stop-tracking operation (commit-and-clean only)
- `skills/paw-pr/SKILL.md:77-79` — Artifact lifecycle detection (same hierarchy as paw-transition)
- `skills/paw-pr/SKILL.md:163-167` — paw-pr guardrails (no inline PR creation warning here)
- `skills/paw-final-review/SKILL.md:24-39` — Step 1: reads Final Review Mode + all SoT config from WorkflowContext.md
- `skills/paw-final-review/SKILL.md:138-154` — SoT invocation: loads paw-sot with review context
- `skills/paw-final-review/SKILL.md:285-296` — Completion: returns `complete (ready for paw-pr)`
- `src/commands/initializeWorkItem.ts:157-198` — VS Code: constructPawPromptArguments builds init prompt
- `src/tools/handoffTool.ts:54-62` — VS Code: paw_new_session tool constructs prompt with work_id + inline_instruction
- `tests/integration/lib/harness.ts:110-235` — createTestContext: SDK session with fixture, tool policy, hooks
- `tests/integration/lib/fixtures.ts:24-40` — TestFixture.clone: fresh temp git repo from template
- `tests/integration/lib/fixtures.ts:47-54` — TestFixture.seedWorkflowState: seed pre-built artifacts
- `tests/integration/lib/skills.ts:8-11` — loadSkill: reads SKILL.md as string
- `tests/integration/lib/assertions.ts:78-109` — assertToolCalls: checks tool call log for required/forbidden/bash patterns
- `tests/integration/lib/judge.ts:17-69` — Judge: LLM-as-judge with rubric scoring
- `tests/integration/lib/answerer.ts:25-55` — RuleBasedAnswerer: fail-closed auto-answerer for ask_user
- `tests/integration/tests/skills/paw-agent-guardrails.test.ts:11-32` — Fast content test: PAW.agent.md final PR routing text
- `tests/integration/tests/workflows/transition-review-policy.test.ts:27-187` — Review policy mapping via seeded WorkflowContext.md
- `tests/integration/tests/workflows/planning-docs-review.test.ts:37-133` — Planning docs review via seedWorkflowState("planning-review")

---

## Architecture Documentation

**PAW runtime separation**: CLI runtime uses `agents/` and `skills/` directories directly. VS Code extension uses `vscode-assets/skills/` (rendered from `skills/` by `scripts/render-vscode-skills.js`). TypeScript in `src/` is VS Code-only automation. Integration tests use `@github/copilot-sdk` to drive CLI sessions against `skills/` files directly.

**PAW-Lite vs standard PAW**: Standard PAW runs through PAW.agent.md (orchestrator) which delegates to paw-transition at every stage boundary. PAW-Lite runs as a single skill loaded directly in the session, orchestrating all five stages inline without an agent intermediary.

**WorkflowContext.md as configuration store**: paw-init template defines WorkflowContext.md as a flat key-value configuration document (lines 197-241). Fields represent init-time decisions (workflow mode, review strategy, preset-resolved model names). The file is read by multiple skills (paw-transition, paw-final-review, paw-pr, paw-lite) to retrieve configuration for their procedures.

**SQL todos in PAW-Lite**: Used exclusively for fleet coordination of implementation work items within Stage 3 (parallel task dispatch). Not used for stage boundary tracking. The pre-existing session SQLite database is the store (`skills/paw-lite/SKILL.md:31-37`).

**Skill-level (fast) test pattern**: Tests in `tests/integration/tests/skills/` import `readFile` and assert string patterns against skill/agent file content. No SDK session or LLM needed. Suitable for verifying that specific text obligations exist in prompts (see `paw-agent-guardrails.test.ts`).

**Workflow test pattern**: Tests in `tests/integration/tests/workflows/` use `createTestContext` + `loadSkill` + `seedWorkflowState`/manual `writeFile` to drive an SDK session. They call `ctx.session.sendAndWait` and assert on `response?.data?.content` plus artifact files.

---

## Open Questions

None requiring user input. All research areas specified in the task prompt are documented with file:line references.
