---
date: 2026-02-06T12:00:00-05:00
git_commit: d157f06
branch: feature/society-of-thought-planning
repository: phased-agent-workflow
topic: "Society-of-Thought Planning: multi-model plan generation and review"
tags: [research, codebase, paw-planning, paw-plan-review, paw-final-review, paw-init, multi-model]
status: complete
last_updated: 2026-02-06
---

# Research: Society-of-Thought Planning

## Research Question

How is the existing codebase structured for: (1) multi-model parallel execution in paw-final-review, (2) planning and plan-review skills, (3) workflow orchestration, (4) initialization, and (5) project infrastructure — to inform adding multi-model capabilities to the planning stage?

## Summary

The multi-model pattern is fully implemented in `paw-final-review` (`skills/paw-final-review/SKILL.md`) with model intent resolution, parallel `task` tool spawning, per-model artifact saving, and synthesis. The `paw-planning` skill (`skills/paw-planning/SKILL.md`) currently runs as a single-model direct-execution activity with three execution contexts (initial, revision, PR response). The `paw-plan-review` skill (`skills/paw-plan-review/SKILL.md`) runs as a subagent returning PASS/FAIL with BLOCKING/IMPROVE/NOTE categories. The PAW orchestrator (`agents/PAW.agent.md`) has mandatory transitions for planning→plan-review and handles plan-review results. `paw-init` (`skills/paw-init/SKILL.md`) defines the input parameter table and WorkflowContext.md template with existing final-review configuration fields. The `reviews/` subfolder uses a `.gitignore` with `*` content pattern; the `.gitignore` at repo root has `.paw/reviews/` entry. No `planning/` subfolder pattern exists yet.

## Documentation System

- **Framework**: MkDocs with Material theme (`mkdocs.yml:1-61`)
- **Docs Directory**: `docs/` (`docs/index.md`, `docs/guide/`, `docs/specification/`, `docs/reference/`)
- **Navigation Config**: `mkdocs.yml:61-76` (nav section)
- **Style Conventions**: Material theme with code copy, search suggest/highlight, admonition support, syntax highlighting (`mkdocs.yml:18-59`)
- **Build Command**: `mkdocs build` (serve: `mkdocs serve`), documented in `DEVELOPING.md:210-215`
- **Standard Files**: `README.md` (repo root), `DEVELOPING.md` (repo root), `LICENSE` (repo root), `docs/index.md`

## Verification Commands

- **Test Command**: `npm test` → `node ./out/test/runTest.js` (`package.json:128`); CLI tests: `node --test test/*.test.js` (`cli/package.json:17`)
- **Lint Command**: `npm run lint` → `eslint src --ext ts` (`package.json:129`); CLI lint: `eslint .` (`cli/package.json:18`)
- **Build Command**: `npm run compile` → `tsc -p ./` (`package.json:126`)
- **Agent/Skill Lint**: `npm run lint:agent:all` → `./scripts/lint-prompting.sh --all` (`package.json:131`); thresholds: agents 5000/7000 tokens, skills 8000/12000 tokens (`DEVELOPING.md:59-64`, `scripts/lint-prompting.sh:11-16`)
- **Type Check**: Included in `npm run compile` (strict TypeScript, `tsconfig.json`)
- **Docs Build**: `mkdocs build` (requires Python venv with `mkdocs-material`)

## Detailed Findings

### 1. paw-final-review Multi-Model Implementation

The paw-final-review skill is defined in `skills/paw-final-review/SKILL.md`. It runs **directly** in the PAW session (not as a subagent) per `SKILL.md:8`.

#### 1.1 Configuration Reading

Configuration is read from WorkflowContext.md (`SKILL.md:24-28`):
- `Final Review Mode`: `single-model` | `multi-model` (`SKILL.md:26`)
- `Final Review Interactive`: `true` | `false` (`SKILL.md:27`)
- `Final Review Models`: comma-separated model names (`SKILL.md:28`)

Default models value: `latest GPT, latest Gemini, latest Claude Opus` (`SKILL.md:31`).

#### 1.2 Model Intent Resolution

Model intents are resolved to actual model names via natural-language-to-model-name mapping (`SKILL.md:96`):

> "First, resolve model intents to actual model names (e.g., "latest GPT" → current GPT model)."

The resolution is described as a semantic operation — the skill text says "resolve model intents to actual model names" but does not specify a function or lookup table. The agent performing the skill interprets intents like "latest GPT", "latest Gemini", "latest Claude Opus" and maps them to the currently available model identifiers at runtime. This is agent-level reasoning, not a coded function.

#### 1.3 Interactive Model Confirmation

When `Final Review Interactive = true`, resolved models are presented for user confirmation before spawning (`SKILL.md:98-107`):

```
About to run multi-model review with:
- [resolved model 1]
- [resolved model 2]
- [resolved model 3]

Proceed with these models, or specify different ones?
```

The user can confirm or provide alternative model names (`SKILL.md:107`).

#### 1.4 Parallel Subagent Spawning

Subagents are spawned using the `task` tool with `model` parameter (`SKILL.md:109`):

> "Then spawn parallel subagents using `task` tool with `model` parameter for each model."

Each subagent receives the identical review prompt defined at `SKILL.md:59-85`. The `task` tool is the Copilot CLI's built-in tool for launching sub-agents with specific models.

#### 1.5 Per-Model Artifact Saving

Per-model reviews are saved as `REVIEW-{MODEL}.md` files (`SKILL.md:109`):

> "Save per-model reviews to `REVIEW-{MODEL}.md`."

The `{MODEL}` placeholder uses the resolved model name. All artifacts are saved in the `reviews/` subdirectory.

#### 1.6 Reviews Directory Creation

Step 3 creates the reviews directory and gitignore (`SKILL.md:52-53`):

> "Create `.paw/work/<work-id>/reviews/` if it doesn't exist."
> "Create `.paw/work/<work-id>/reviews/.gitignore` with content `*` (if not already present)."

#### 1.7 Synthesis

After multi-model reviews complete, a synthesis document is generated (`SKILL.md:111`). The synthesis structure is defined at `SKILL.md:115-147` as `REVIEW-SYNTHESIS.md`:

Sections in synthesis:
- **Consensus Issues** — all models agree (`SKILL.md:126`)
- **Partial Agreement** — 2+ models flagged (`SKILL.md:129`)
- **Single-Model Insights** — unique findings (`SKILL.md:132`)
- **Verification Checklist** — interface/data-flow touchpoints (`SKILL.md:134-137`)
- **Priority Actions** — Must Fix / Should Fix / Consider (`SKILL.md:139-147`)

The synthesis is performed by the agent in the current session (not a subagent), reading all per-model reviews.

#### 1.8 Single-Model vs Multi-Model Mode Switching

Single-model mode (`SKILL.md:91-92`):
- Executes review using the shared prompt
- Saves to `REVIEW.md`

Multi-model mode (`SKILL.md:94-147`):
- Resolves model intents
- Optionally confirms with user (if interactive)
- Spawns parallel subagents
- Saves per-model reviews
- Generates synthesis

VS Code limitation (`SKILL.md:34`): VS Code only supports `single-model` mode. If `multi-model` is configured, proceeds with single-model using the session's model. This is guarded by `{{#vscode}}` / `{{#cli}}` template conditionals.

#### 1.9 Artifact Summary Table

The artifact output table is at `SKILL.md:212-217`:

| Mode | Files Created |
|------|---------------|
| single-model | `REVIEW.md` |
| multi-model | `REVIEW-{MODEL}.md` per model, `REVIEW-SYNTHESIS.md` |

Location: `.paw/work/<work-id>/reviews/`

#### 1.10 Legacy multi-model-review Skill

A legacy multi-model review skill exists at `.github/skills/multi-model-review/SKILL.md`. It uses hardcoded model names (GPT 5.2, Gemini 3 Pro, Claude Opus 4.5) at `SKILL.md:12,44`. It follows the same pattern: parallel `task` tool with `model` parameter (`SKILL.md:70-71`), per-model `REVIEW-{MODEL}.md` files (`SKILL.md:69`), `REVIEW-SYNTHESIS.md` (`SKILL.md:104`), and interactive resolution (`SKILL.md:106-140`).

---

### 2. paw-planning Skill

The paw-planning skill is defined in `skills/paw-planning/SKILL.md`. It runs **directly** in the PAW session (not a subagent) per `SKILL.md:8`.

#### 2.1 Current Execution Flow

The skill has three execution contexts:

**Initial Planning** (`SKILL.md:144-155`):
1. Read all context: Issue, Spec.md, SpecResearch.md, CodeResearch.md (`SKILL.md:148`)
2. Analyze and verify requirements against actual code (`SKILL.md:149`)
3. Present understanding and resolve blocking questions (`SKILL.md:150`)
4. Research patterns and design options (`SKILL.md:151`)
5. Write plan incrementally (outline, then phase by phase) (`SKILL.md:152`)
6. Handle branching per Review Strategy (`SKILL.md:153`)

**PR Review Response** (`SKILL.md:157-165`):
1. Verify on planning branch (`SKILL.md:163`)
2. Read all unresolved PR comments (`SKILL.md:164`)
3. Create TODOs for comments (`SKILL.md:165`)
4. For each TODO: make changes → commit → push → reply (`SKILL.md:166`)
5. Verify all comments addressed and artifacts consistent (`SKILL.md:167`)

**Plan Revision** (`SKILL.md:169-178`):
1. Read paw-plan-review feedback completely (`SKILL.md:173`)
2. Address BLOCKING issues first (`SKILL.md:174`)
3. Address IMPROVE issues if scope permits (`SKILL.md:175`)
4. Acknowledge NOTE items in commit message (`SKILL.md:176`)
5. Re-run quality checklist (`SKILL.md:177`)

#### 2.2 Input Consumption

The skill reads these artifacts (`SKILL.md:148`):
- Issue (from WorkflowContext.md Issue URL)
- `Spec.md` in the work directory
- `SpecResearch.md` in the work directory (optional)
- `CodeResearch.md` in the work directory

These are read in step 1 of Initial Planning. The skill also references existing code patterns from CodeResearch.md for verification.

#### 2.3 Output Production

Output is a single file: `ImplementationPlan.md` saved to `.paw/work/<work-id>/ImplementationPlan.md` (`SKILL.md:76`).

The completion response reports (`SKILL.md:198-207`):
- Artifact path
- Plan summary (architecture approach, phase overview, what's NOT being done)
- Review Strategy used
- Items requiring user decision

Blocked state (`SKILL.md:209-221`): If planning encounters unresolvable questions, it does NOT write ImplementationPlan.md and returns `blocked` status with open questions.

#### 2.4 ImplementationPlan.md Template Structure

The template is defined at `SKILL.md:78-138`:

```
# [Feature/Task Name] Implementation Plan
## Overview
## Current State Analysis
## Desired End State
## What We're NOT Doing
## Phase Status (checkboxes)
## Phase Candidates (lightweight capture section)
---
## Phase 1: [Name]
### Changes Required (file paths, components, tests)
### Success Criteria
#### Automated Verification (checkboxes)
#### Manual Verification (checkboxes)
---
## Phase N: Documentation (if warranted)
### Changes Required (Docs.md, project docs)
### Success Criteria
---
## References (Issue, Spec, Research links)
```

Phase Status uses checkbox format: `- [ ]` pending, `- [x]` complete (`SKILL.md:140`).

#### 2.5 Strategic Planning Guidelines

The skill operates at C4 container/component abstraction level (`SKILL.md:30`). Key constraints:
- Describe component responsibilities and interfaces (`SKILL.md:33`)
- Limit code snippets to 3-10 lines for critical architectural concepts only (`SKILL.md:37`)
- No complete implementations, pseudo-code, or tutorial-style examples (`SKILL.md:40-43`)

#### 2.6 Documentation Phase Planning

Documentation phase is the **final implementation phase** (`SKILL.md:52`). It produces:
1. `Docs.md` (always) — technical reference (`SKILL.md:56`)
2. Project documentation updates (when warranted) (`SKILL.md:57`)
3. Documentation build verification (`SKILL.md:58`)

Include/omit criteria at `SKILL.md:62-71`.

#### 2.7 Quality Checklist

The quality checklist at `SKILL.md:183-195` has 11 items covering file paths, success criteria, incremental builds, no TBDs, spec traceability, tests, scope boundaries, code block limits, docs phase, phase status, and phase candidates.

#### 2.8 No Existing Mode/Context Switching for Multi-Model

The skill has no concept of `single-model` vs `multi-model` modes. It has no model configuration, no parallel execution, no per-model artifacts. It runs entirely as a single direct-execution activity in the PAW session.

---

### 3. paw-plan-review Skill

The paw-plan-review skill is defined in `skills/paw-plan-review/SKILL.md`. It runs as a **subagent** session, delegated by the PAW orchestrator (`SKILL.md:8`).

#### 3.1 Current Execution Flow

The review process (`SKILL.md:72-77`):
1. Read ImplementationPlan.md completely (`SKILL.md:72`)
2. Cross-reference with Spec.md for coverage (`SKILL.md:73`)
3. Check CodeResearch.md integration (`SKILL.md:74`)
4. Evaluate each quality criteria category (`SKILL.md:75`)
5. Compile specific issues with locations (`SKILL.md:76`)
6. Determine overall PASS/FAIL status (`SKILL.md:77`)

#### 3.2 Input Consumption Pattern

The skill reads:
- `ImplementationPlan.md` — primary review target (`SKILL.md:72`)
- `Spec.md` — for coverage validation (`SKILL.md:73`)
- `CodeResearch.md` — for research integration checks (`SKILL.md:74`)

#### 3.3 Quality Criteria Categories

Six evaluation categories with checklist items (`SKILL.md:29-68`):
1. **Spec Coverage** (`SKILL.md:29-34`) — requirements mapped, user stories covered, success criteria reflected, no orphans
2. **Phase Feasibility** (`SKILL.md:36-41`) — clear success criteria, logical boundaries, explicit dependencies, independent phases
3. **Completeness** (`SKILL.md:43-48`) — no TBDs, file paths specified, tests specified, "Not Doing" section
4. **Research Integration** (`SKILL.md:50-54`) — code research findings, documentation system, existing patterns
5. **Strategic Focus** (`SKILL.md:56-61`) — WHAT not HOW, code block limits, no pseudo-code, trade-off analysis
6. **Documentation Planning** (`SKILL.md:63-68`) — docs phase included, Docs.md specified, project docs if applicable

#### 3.4 Verdict Output Format

Feedback categories table (`SKILL.md:79-84`):

| Category | Description |
|----------|-------------|
| **BLOCKING** | Must fix before implementation (missing requirements, infeasible phases) |
| **IMPROVE** | Should address but not blocking (clarity, organization) |
| **NOTE** | Observation for awareness (minor suggestions, alternatives) |

Completion response (`SKILL.md:88-108`):
- **PASS**: Plan meets quality criteria, ready for implementation (`SKILL.md:91-93`)
- **FAIL**: Plan needs revision before implementation (`SKILL.md:95-98`)

Response content includes (`SKILL.md:102-108`): overall status, spec coverage assessment, phase feasibility assessment, completeness check, specific issues (categorized with plan section references), recommendation.

#### 3.5 Non-Responsibilities

The skill explicitly does NOT (`SKILL.md:110-115`):
- Make orchestration decisions
- Modify the plan directly
- Implement changes
- Handle handoffs

#### 3.6 Orchestrator Invocation Pattern

The PAW orchestrator delegates paw-plan-review as a subagent (`agents/PAW.agent.md:163`). The mandatory transitions table requires planning→plan-review transition (`agents/PAW.agent.md:20`):

> `| paw-planning | paw-plan-review | NO |`

This means after paw-planning completes, paw-plan-review must execute immediately without pausing or asking for confirmation (`agents/PAW.agent.md:29`).

---

### 4. paw-init Skill

The paw-init skill is defined in `skills/paw-init/SKILL.md`. It runs **directly** in the PAW session (`SKILL.md:8`).

#### 4.1 Input Parameter Table

The input parameter table is at `SKILL.md:26-39`:

| Parameter | Required | Default | Values |
|-----------|----------|---------|--------|
| `base_branch` | No | `main` | branch name |
| `target_branch` | No | auto-derive from work ID | branch name |
| `workflow_mode` | No | `full` | `full`, `minimal`, `custom` |
| `review_strategy` | No | `prs` (`local` if minimal) | `prs`, `local` |
| `review_policy` | No | `milestones` | `always`, `milestones`, `planning-only`, `never` |
| `session_policy` | No | `per-stage` | `per-stage`, `continuous` |
| `track_artifacts` | No | `true` | boolean |
| `issue_url` | No | none | URL |
| `custom_instructions` | Conditional | — | text (required if `workflow_mode` is `custom`) |
| `work_description` | No | none | text |
| `final_agent_review` | No | `enabled` | `enabled`, `disabled` |
| `final_review_mode` | No | `multi-model` | `single-model`, `multi-model` |
| `final_review_interactive` | No | `true` | boolean |
| `final_review_models` | No | `latest GPT, latest Gemini, latest Claude Opus` | comma-separated model names or intents |

#### 4.2 Final Review Config Fields Pattern

The final review configuration fields follow this pattern (`SKILL.md:36-39`):
- A feature toggle: `final_agent_review` with `enabled`/`disabled` values
- A mode field: `final_review_mode` with `single-model`/`multi-model` values
- An interactive flag: `final_review_interactive` with boolean values
- A models list: `final_review_models` with comma-separated model names or intents, defaulting to `latest GPT, latest Gemini, latest Claude Opus`

#### 4.3 WorkflowContext.md Template

The WorkflowContext.md template is at `SKILL.md:79-100`:

```markdown
# WorkflowContext

Work Title: <generated_work_title>
Work ID: <generated_work_id>
Base Branch: <base_branch>
Target Branch: <target_branch>
Workflow Mode: <workflow_mode>
Review Strategy: <review_strategy>
Review Policy: <review_policy>
Session Policy: <session_policy>
Final Agent Review: <final_agent_review>
Final Review Mode: <final_review_mode>
Final Review Interactive: <final_review_interactive>
Final Review Models: <final_review_models>
Custom Workflow Instructions: <custom_instructions or "none">
Initial Prompt: <work_description or "none">
Issue URL: <issue_url or "none">
Remote: origin
Artifact Paths: auto-derived
Additional Inputs: none
```

The template uses a simple `Key: Value` format, one per line. There are no planning-specific fields in the current template.

#### 4.4 Handling Missing Parameters

When parameters are not provided (`SKILL.md:41-48`):
1. Apply defaults from the table
2. Check user-level defaults in `copilot-instructions.md` or `AGENTS.md`
3. Present configuration summary and ask for confirmation
4. Allow user to request changes and re-confirm

#### 4.5 Configuration Validation

Validation rules (`SKILL.md:66-68`):
- If `workflow_mode` is `minimal`, `review_strategy` MUST be `local`
- If `review_policy` is `planning-only` or `never`, `review_strategy` MUST be `local`
- Invalid combinations: STOP and report error

---

### 5. PAW Orchestrator (PAW.agent.md)

The PAW orchestrator is defined in `agents/PAW.agent.md`.

#### 5.1 Mandatory Transitions Table

The mandatory transitions table is at `agents/PAW.agent.md:15-27`:

| After Activity | Required Next | Skippable? |
|----------------|---------------|------------|
| paw-init | paw-spec or paw-work-shaping | Per user intent |
| paw-implement (any phase) | paw-impl-review | NO |
| paw-spec | paw-spec-review | NO |
| **paw-planning** | **paw-plan-review** | **NO** |
| paw-plan-review (passes) | Planning PR (prs strategy) | NO |
| Planning PR created | paw-transition → paw-implement | NO |
| paw-impl-review (passes, more phases) | Push & Phase PR (prs strategy) | NO |
| paw-impl-review (passes, last phase, review enabled) | paw-final-review | NO |
| paw-impl-review (passes, last phase, review disabled) | paw-pr | Per Review Policy |
| paw-final-review | paw-pr | NO |

"Skippable = NO" means execute immediately without pausing (`agents/PAW.agent.md:29`).

#### 5.2 How Orchestrator Delegates to paw-plan-review

The orchestrator uses the **subagent** execution model for paw-plan-review (`agents/PAW.agent.md:162-163`):

> **Subagent delegation** (delegate via `runSubagent`):
> - `paw-spec-research`, `paw-code-research`, `paw-spec-review`, **`paw-plan-review`**, `paw-impl-review`

The delegation is through the `runSubagent` mechanism, which spawns the skill in a separate context.

#### 5.3 Handling Plan-Review Results

After paw-plan-review returns PASS (PRs strategy) (`agents/PAW.agent.md:31-32`):

> "After `paw-plan-review` returns PASS, load `paw-git-operations` and create Planning PR (`_plan` → target branch). For local strategy, commit to target branch (no PR)."

This is listed under "Post plan-review flow" at `agents/PAW.agent.md:31-32`.

The orchestrator-handled actions after subagent returns are at `agents/PAW.agent.md:166-172`:
- After `paw-plan-review` returns PASS (PRs strategy): Load `paw-git-operations`, create Planning PR (`agents/PAW.agent.md:167`)
- After Planning PR created: Delegate to `paw-transition` (stage boundary) (`agents/PAW.agent.md:168`)

If plan-review returns FAIL, the orchestrator re-invokes paw-planning in Plan Revision context.

#### 5.4 Hybrid Execution Model

Direct execution activities (`agents/PAW.agent.md:158-160`):
- `paw-spec`, **`paw-planning`**, `paw-implement`, `paw-pr`, **`paw-final-review`**
- `paw-init`, `paw-status`, `paw-work-shaping`, `paw-rewind`

Subagent delegation activities (`agents/PAW.agent.md:162-163`):
- `paw-spec-research`, `paw-code-research`, `paw-spec-review`, **`paw-plan-review`**, `paw-impl-review`
- `paw-transition`

`paw-planning` runs directly (interactive), while `paw-plan-review` runs as a subagent.

#### 5.5 Stage Boundary Rule

The stage boundary rule is at `agents/PAW.agent.md:35-48`. Plan-review passing is explicitly listed as a stage boundary (`agents/PAW.agent.md:41`):

> Stage boundaries:
> - spec-review passes
> - **plan-review passes**
> - Planning PR created (PRs strategy)
> ...

After every stage boundary, the orchestrator must delegate to `paw-transition` (`agents/PAW.agent.md:37`).

#### 5.6 Review Policy Behavior

Review policy handling at `agents/PAW.agent.md:58-67`:
- `always`: Pause after every artifact
- `milestones`: Pause at milestone artifacts only (Spec.md, ImplementationPlan.md, Phase PR completion, Final PR)
- `planning-only`: Pause at Spec.md, ImplementationPlan.md, and Final PR only
- `never`: Auto-proceed unless blocked

---

### 6. paw-transition Skill

The paw-transition skill is defined in `skills/paw-transition/SKILL.md`. It runs as a **subagent** (`SKILL.md:6`).

#### 6.1 Mandatory Transitions Table (Transition's Copy)

The transition skill has its own copy of the transitions table at `SKILL.md:40-49`:

| After Activity | Required Next | Skippable? |
|----------------|---------------|------------|
| paw-init | paw-spec or paw-work-shaping | Per user intent |
| paw-implement (any phase) | paw-impl-review | NO |
| paw-spec | paw-spec-review | NO |
| **paw-planning** | **paw-plan-review** | **NO** |
| paw-impl-review (passes, more phases) | paw-implement (next phase) | NO |
| paw-impl-review (passes, last phase, review enabled) | paw-final-review | NO |
| paw-impl-review (passes, last phase, review disabled) | paw-pr | Per Review Policy |
| paw-final-review | paw-pr | NO |

#### 6.2 Stage Boundaries for Planning Stage

Stage boundaries relevant to the planning stage are at `SKILL.md:66-72`:

> Stage boundaries occur when moving between these stages:
> - spec-review passes → code-research
> - **plan-review passes → implement (Phase 1)**
> - phase N complete → phase N+1
> - all phases complete → paw-final-review (if enabled) or paw-pr (if disabled)
> - paw-final-review complete → paw-pr
> - paw-pr complete → workflow complete

The stage-to-milestone mapping for planning at `SKILL.md:76-84`:

| Stage Boundary | Milestone Reached |
|----------------|-------------------|
| spec-review passes | Spec.md complete |
| **plan-review passes** | **ImplementationPlan.md complete** |
| phase N complete (not last) | Phase completion |
| all phases complete | Phase completion (last phase) |

#### 6.3 Pause Determination for Planning

Pause determination logic at `SKILL.md:86-91`:
- `always` / `milestones`: pause at ALL milestones (including ImplementationPlan.md complete)
- `planning-only`: pause at Spec.md, ImplementationPlan.md, Final PR → `pause_at_milestone = true`
- `never`: `pause_at_milestone = false`

#### 6.4 Preflight Checks

Preflight checks relevant to planning stage at `SKILL.md:104-108`:

**For paw-implement** (the activity after plan-review passes):
- On correct branch per Review Strategy
- ImplementationPlan.md exists and has the target phase

**For paw-code-research** (before planning):
- Spec.md exists (unless minimal mode)

#### 6.5 Structured Output Format

The completion output format at `SKILL.md:139-149`:

```
TRANSITION RESULT:
- session_action: [continue | new_session]
- pause_at_milestone: [true | false]
- next_activity: [activity name and context]
- artifact_tracking: [enabled | disabled]
- preflight: [passed | blocked: <reason>]
- work_id: [current work ID]
- inline_instruction: [for new_session only: resume hint]
- promotion_pending: [true | false]
- candidates: [list of unresolved candidate descriptions]
```

#### 6.6 Routing Logic

The transition skill identifies the last completed activity and uses the transitions table to determine the next activity (`SKILL.md:34-36`). Current routing for planning: after `paw-planning` completes → next is `paw-plan-review`. After `paw-plan-review` passes → next is `paw-implement (Phase 1)`.

The skill does not have any multi-model-specific routing. It does not distinguish between single-model and multi-model planning modes.

---

### 7. .gitignore Patterns

#### 7.1 Repository Root .gitignore

The repository root `.gitignore` is at `.gitignore:1-78`. Relevant entries:

- `.paw/reviews/` — gitignores the entire reviews directory (`/.gitignore:78`)

This is a top-level entry that prevents the `.paw/reviews/` directory from being tracked. There is no `planning/` entry.

#### 7.2 Per-Work-Directory .gitignore Pattern (reviews/)

The `reviews/` subdirectory uses an in-directory `.gitignore` with content `*` (`skills/paw-final-review/SKILL.md:53`):

> "Create `.paw/work/<work-id>/reviews/.gitignore` with content `*` (if not already present)."

This pattern gitignores all files within the `reviews/` subdirectory while allowing the directory itself to exist. This is the pattern used by the final-review skill for per-model artifacts.

#### 7.3 Artifact Tracking Disabled Pattern

When artifact tracking is disabled, a `.gitignore` with content `*` is created in the work directory root (`skills/paw-init/SKILL.md:118-119`):

> "If tracking disabled: `.gitignore` with `*` created in work directory"

#### 7.4 No Existing planning/ .gitignore Pattern

There is no existing `planning/` subfolder, no `planning/` entry in the root `.gitignore`, and no `planning/` directory gitignore pattern anywhere in the codebase. The `reviews/` pattern at `SKILL.md:52-53` serves as the template for how `planning/` should be gitignored.

#### 7.5 paw-workflow Artifact Directory Structure

The artifact directory structure documented in `skills/paw-workflow/SKILL.md:77-92` shows `reviews/` as the only gitignored subfolder. No `planning/` subfolder is documented.

---

### 8. paw-workflow Reference Skill

The paw-workflow reference skill at `skills/paw-workflow/SKILL.md` provides activity tables and stage guidance.

#### 8.1 Activities Table

The activities table at `SKILL.md:57-68` lists all skills with their capabilities and primary artifacts. `paw-planning` produces `ImplementationPlan.md`, `paw-plan-review` produces "Review feedback", `paw-final-review` produces "REVIEW*.md in reviews/".

#### 8.2 Default Flow Guidance

The Planning Stage flow at `SKILL.md:105-108`:
1. `paw-code-research`: Document implementation details
2. `paw-planning`: Create phased implementation plan
3. `paw-plan-review`: Review plan feasibility

#### 8.3 PR Comment Response Routing

Planning PR comments are routed to `paw-planning` (`SKILL.md:130`):

| PR Type | Skill to Load |
|---------|--------------|
| Planning PR | `paw-planning` |

#### 8.4 Execution Model Classification

At `SKILL.md:137-141`:
- **Direct execution**: `paw-spec`, **`paw-planning`**, `paw-implement`, **`paw-final-review`**, `paw-pr`, `paw-init`, `paw-status`, `paw-work-shaping`
- **Subagent delegation**: `paw-spec-research`, `paw-code-research`, `paw-spec-review`, **`paw-plan-review`**, `paw-impl-review`

---

### 9. Template Conditionals (CLI vs VS Code)

The paw-final-review skill uses `{{#cli}}` and `{{#vscode}}` template conditionals to gate multi-model functionality:

- CLI-only multi-model block: `SKILL.md:87-148` (wrapped in `{{#cli}}`)
- VS Code single-model-only block: `SKILL.md:150-156` (wrapped in `{{#vscode}}`)

The PAW.agent.md also uses these conditionals:
- Session policy behavior: `agents/PAW.agent.md:69-86` (CLI vs VS Code sections)
- Session action handling: `agents/PAW.agent.md:100-104`

These conditionals are processed by the prompt template system based on the execution environment.

---

### 10. WorkflowContext.md for Current Work

The current workflow's WorkflowContext.md at `.paw/work/society-of-thought-planning/WorkflowContext.md` has:
- `Final Review Mode: multi-model` (line 12)
- `Final Review Interactive: true` (line 13)
- `Final Review Models: latest GPT, latest Gemini, latest Claude Opus` (line 14)

No planning-mode or plan-review-mode fields exist in the current WorkflowContext.md.

## Code References

- `skills/paw-final-review/SKILL.md:8` — Execution context: runs directly in PAW session
- `skills/paw-final-review/SKILL.md:24-28` — Configuration reading from WorkflowContext.md
- `skills/paw-final-review/SKILL.md:31` — Default models: `latest GPT, latest Gemini, latest Claude Opus`
- `skills/paw-final-review/SKILL.md:34` — VS Code limitation: single-model only
- `skills/paw-final-review/SKILL.md:52-53` — Reviews directory and gitignore creation
- `skills/paw-final-review/SKILL.md:59-85` — Shared review prompt template
- `skills/paw-final-review/SKILL.md:91-92` — Single-model execution path
- `skills/paw-final-review/SKILL.md:96` — Model intent resolution
- `skills/paw-final-review/SKILL.md:98-107` — Interactive model confirmation
- `skills/paw-final-review/SKILL.md:109` — Parallel subagent spawning with `task` tool
- `skills/paw-final-review/SKILL.md:115-147` — REVIEW-SYNTHESIS.md structure
- `skills/paw-final-review/SKILL.md:212-217` — Artifact summary table
- `skills/paw-planning/SKILL.md:8` — Execution context: runs directly in PAW session
- `skills/paw-planning/SKILL.md:30-43` — Strategic planning guidelines (C4 level)
- `skills/paw-planning/SKILL.md:52-71` — Documentation phase planning rules
- `skills/paw-planning/SKILL.md:76` — Output path: `.paw/work/<work-id>/ImplementationPlan.md`
- `skills/paw-planning/SKILL.md:78-138` — ImplementationPlan.md template
- `skills/paw-planning/SKILL.md:144-155` — Initial Planning execution flow
- `skills/paw-planning/SKILL.md:157-167` — PR Review Response context
- `skills/paw-planning/SKILL.md:169-178` — Plan Revision context
- `skills/paw-planning/SKILL.md:183-195` — Quality checklist (11 items)
- `skills/paw-planning/SKILL.md:198-221` — Completion response and blocked handling
- `skills/paw-plan-review/SKILL.md:8` — Execution context: runs as subagent
- `skills/paw-plan-review/SKILL.md:29-68` — Six quality criteria categories
- `skills/paw-plan-review/SKILL.md:72-77` — Review process steps
- `skills/paw-plan-review/SKILL.md:79-84` — BLOCKING/IMPROVE/NOTE feedback categories
- `skills/paw-plan-review/SKILL.md:88-108` — PASS/FAIL completion response structure
- `skills/paw-plan-review/SKILL.md:110-115` — Non-responsibilities
- `skills/paw-init/SKILL.md:26-39` — Input parameter table
- `skills/paw-init/SKILL.md:36-39` — Final review config fields
- `skills/paw-init/SKILL.md:79-100` — WorkflowContext.md template
- `skills/paw-init/SKILL.md:41-48` — Missing parameter handling
- `skills/paw-init/SKILL.md:66-68` — Configuration validation rules
- `agents/PAW.agent.md:6` — Hybrid execution model description
- `agents/PAW.agent.md:15-27` — Mandatory transitions table
- `agents/PAW.agent.md:29` — Skippable = NO: execute immediately
- `agents/PAW.agent.md:31-32` — Post plan-review flow (PRs/local)
- `agents/PAW.agent.md:35-48` — Stage boundary rule
- `agents/PAW.agent.md:58-67` — Review policy behavior
- `agents/PAW.agent.md:158-163` — Hybrid execution model: direct vs subagent
- `agents/PAW.agent.md:166-172` — Orchestrator-handled post-subagent actions
- `skills/paw-transition/SKILL.md:40-49` — Transition mandatory transitions table
- `skills/paw-transition/SKILL.md:66-72` — Stage boundaries
- `skills/paw-transition/SKILL.md:76-84` — Stage-to-milestone mapping
- `skills/paw-transition/SKILL.md:86-91` — Pause determination logic
- `skills/paw-transition/SKILL.md:104-108` — Preflight checks for paw-implement
- `skills/paw-transition/SKILL.md:139-149` — Structured output format
- `skills/paw-workflow/SKILL.md:57-68` — Activities table
- `skills/paw-workflow/SKILL.md:77-92` — Artifact directory structure
- `skills/paw-workflow/SKILL.md:105-108` — Planning stage default flow
- `skills/paw-workflow/SKILL.md:130` — PR comment routing for Planning PR
- `skills/paw-workflow/SKILL.md:137-141` — Execution model classification
- `.gitignore:78` — `.paw/reviews/` entry
- `package.json:126-131` — Build, test, lint scripts
- `DEVELOPING.md:59-64` — Token threshold values
- `mkdocs.yml:1-76` — Documentation configuration
- `.github/skills/multi-model-review/SKILL.md:12,44,69-71,104` — Legacy multi-model skill pattern

## Architecture Documentation

### Multi-Model Execution Pattern

The established multi-model pattern (from paw-final-review) follows this sequence:
1. Read mode config from WorkflowContext.md
2. If `multi-model`: parse comma-separated model intents
3. Resolve intents to actual model names (agent-level semantic reasoning)
4. If interactive: present resolved models for user confirmation
5. Spawn parallel subagents using `task` tool with `model` parameter
6. Each subagent receives identical prompt and inputs
7. Save per-model artifacts as `{PREFIX}-{MODEL}.md`
8. Generate synthesis document merging all per-model outputs
9. Save synthesis as `{PREFIX}-SYNTHESIS.md`

### Gitignore Pattern for Per-Model Artifacts

The established pattern creates an in-directory `.gitignore` with content `*` in the artifact subdirectory (e.g., `reviews/.gitignore`). The root `.gitignore` also has an entry for `.paw/reviews/` as a secondary safeguard.

### Skill Execution Models

Two execution models coexist:
- **Direct execution**: Skill runs in the main PAW session, preserving user interactivity (paw-planning, paw-final-review)
- **Subagent delegation**: Skill runs in an isolated context via `runSubagent` (paw-plan-review, paw-impl-review)

### Template Conditional System

`{{#cli}}` and `{{#vscode}}` template conditionals gate environment-specific behavior. Multi-model features are CLI-only. VS Code falls back to single-model with a user message.

## Open Questions

None — all research objectives addressed with supporting evidence.
