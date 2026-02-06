---
date: 2026-02-05T12:00:00-05:00
git_commit: 6a5b8ec3d30918933eefc0887cb780af21f9e89f
branch: feature/multi-model-planning-documents-review
repository: phased-agent-workflow
topic: "Multi-model Planning Documents Review"
tags: [research, codebase, paw-planning-docs-review, multi-model, review-gate, skills]
status: complete
last_updated: 2026-02-05
---

# Research: Multi-model Planning Documents Review

## Research Question

What existing patterns, integration points, and architectural touchpoints must be understood to implement a new `paw-planning-docs-review` skill that reviews planning documents (Spec.md + ImplementationPlan.md + CodeResearch.md) as a holistic bundle using multi-model parallel review?

## Summary

The implementation follows a well-established pattern. The `paw-final-review` skill (`skills/paw-final-review/SKILL.md`) provides the primary blueprint: it reads WorkflowContext.md configuration fields, gathers review context, executes single-model or multi-model reviews (parallel via `task` tool with `model` parameter), synthesizes findings with consensus categorization, and resolves findings interactively. The new skill mirrors this structure but operates on planning artifacts (Spec.md, ImplementationPlan.md, CodeResearch.md) instead of implementation diffs, and routes resolution actions to `paw-spec` or `paw-planning` instead of making code changes.

The workflow integration requires changes to 6 existing files:
1. **`paw-init`**: Add 4 new WorkflowContext.md fields (Planning Review, Planning Review Mode, Planning Review Interactive, Planning Review Models)
2. **`paw-transition`**: Add routing entry for `paw-planning-docs-review` after plan-review passes
3. **PAW agent**: Add the new skill to mandatory transitions, hybrid execution model, and stage boundary lists
4. **`paw-specification.md`**: Add the new review gate to Stage 02 — Planning workflow
5. **`paw-status`**: Reflect the new stage in progression guidance
6. **`paw-workflow`**: Add the new skill to activity tables and flow guidance

Plus 1 new file: `skills/paw-planning-docs-review/SKILL.md`

## Documentation System

- **Framework**: MkDocs with Material theme (`mkdocs.yml:19`)
- **Docs Directory**: `docs/` with subdirectories `guide/`, `specification/`, `reference/`
- **Navigation Config**: `mkdocs.yml:61-76` — structured nav with Home, User Guide, Specification, Reference sections
- **Style Conventions**: Admonition blocks for warnings, code blocks with copy button, permalink TOC headers, tabbed light/dark mode
- **Build Command**: `source .venv/bin/activate && mkdocs build --strict` (validates internal links)
- **Standard Files**: `README.md` (repo root), `DEVELOPING.md` (repo root), `LICENSE` (repo root), `docs/index.md` (site home)

## Verification Commands

- **Test Command**: `npm test` (runs `node ./out/test/runTest.js`)
- **Lint Command**: `npm run lint` (runs `eslint src --ext ts`)
- **Build Command**: `npm run compile` (runs `tsc -p ./`)
- **Type Check**: `npm run compile` (TypeScript compilation serves as type check)
- **Agent/Skill Lint**: `npm run lint:agent:all` (runs `./scripts/lint-prompting.sh --all`), `npm run lint:skills` (runs `./scripts/lint-prompting.sh --skills`)
- **Docs Build**: `source .venv/bin/activate && mkdocs build --strict`

## Detailed Findings

### 1. paw-final-review Skill — Primary Pattern to Mirror

**Location**: `skills/paw-final-review/SKILL.md`

**Execution Context**: Runs **directly** in the PAW session (not a subagent), preserving user interactivity for apply/skip/discuss decisions (`skills/paw-final-review/SKILL.md:8`).

**Configuration Reading** (`skills/paw-final-review/SKILL.md:24-32`):
- Reads from WorkflowContext.md: Work ID, target branch, Final Review Mode, Final Review Interactive, Final Review Models
- Mode values: `single-model` | `multi-model`
- Interactive values: `true` | `false`
- Default models: `latest GPT, latest Gemini, latest Claude Opus`
- VS Code constraint: only supports `single-model` mode (`skills/paw-final-review/SKILL.md:33-35`)

**Review Context Gathering** (`skills/paw-final-review/SKILL.md:38-48`):
- Full diff of implementation changes (target branch vs base branch)
- Spec.md requirements and success criteria
- ImplementationPlan.md phases and scope
- CodeResearch.md patterns and conventions

**Reviews Directory** (`skills/paw-final-review/SKILL.md:50-53`):
- Creates `.paw/work/<work-id>/reviews/` directory
- Creates `.paw/work/<work-id>/reviews/.gitignore` with content `*` (all artifacts gitignored)

**Review Prompt** (`skills/paw-final-review/SKILL.md:55-85`):
- Shared prompt for both single-model and multi-model
- Includes: Specification, Implementation Diff, Codebase Patterns
- Review criteria: Correctness, Pattern Consistency, Bugs/Issues, Token Efficiency, Documentation
- Finding format: Issue description, Current code/text, Proposed fix, Severity (must-fix | should-fix | consider)

**Multi-model Execution** (CLI only, `skills/paw-final-review/SKILL.md:87-148`):
- Resolves model intents to actual model names (e.g., "latest GPT" → current GPT model)
- If Interactive=true: presents resolved models for user confirmation before running
- Spawns parallel subagents using `task` tool with `model` parameter
- Saves per-model reviews to `REVIEW-{MODEL}.md`
- Synthesizes into `REVIEW-SYNTHESIS.md` with Consensus/Partial/Single-Model categorization
- Synthesis includes Verification Checklist for interface/data-flow changes

**Single-model Execution** (`skills/paw-final-review/SKILL.md:92-93`):
- Single review pass, saves to `REVIEW.md`

**Interactive Resolution** (`skills/paw-final-review/SKILL.md:160-196`):
- Presents each finding with: severity, issue, current, proposed, rationale
- Options: apply, skip, discuss
- Tracks status: applied, skipped, discussed
- Multi-model: processes synthesis first (consensus → partial → single-model), deduplicates
- Non-interactive: auto-apply must-fix and should-fix, skip consider

**Completion** (`skills/paw-final-review/SKILL.md:198-209`):
- Reports: total findings, applied/skipped/discussed counts, summary, artifacts location
- Status: `complete` (ready for paw-pr)

**Artifact Naming** (`skills/paw-final-review/SKILL.md:210-218`):
- Single-model: `REVIEW.md`
- Multi-model: `REVIEW-{MODEL}.md` per model + `REVIEW-SYNTHESIS.md`
- Location: `.paw/work/<work-id>/reviews/`

**Key Adaptation for Planning Docs Review**:
- The new skill reviews planning documents (Spec.md, ImplementationPlan.md, CodeResearch.md) instead of an implementation diff
- Review criteria must be cross-artifact focused (traceability, consistency, coherence) rather than implementation-focused (correctness, patterns, bugs)
- Resolution routing goes to `paw-spec` or `paw-planning` rather than direct code edits
- Artifacts go to `.paw/work/<work-id>/reviews/planning/` (per FR-011 in Spec.md)

### 2. multi-model-review Skill — Multi-Model Execution Pattern

**Location**: `.github/skills/multi-model-review/SKILL.md`

This is a standalone multi-model review skill used for ad-hoc reviews. The `paw-final-review` skill already internalizes the key pattern, but this skill shows the canonical multi-model execution flow.

**Phase 2: Parallel Model Reviews** (`.github/skills/multi-model-review/SKILL.md:42-70`):
- Models: GPT 5.2, Gemini 3 Pro, Claude Opus 4.5
- Uses `task` tool with `model` parameter for each review
- Output files: `REVIEW-{MODEL}.md` per model
- Reviews are independent (don't share results between model calls)

**Phase 3: Synthesis** (`.github/skills/multi-model-review/SKILL.md:72-104`):
- Structure: Consensus Issues (all 3), Partial Agreement (2 of 3), Single-Model Insights
- Priority Actions: Must Fix, Should Fix, Consider
- Saved to `REVIEW-SYNTHESIS.md`

**Phase 4: Interactive Resolution** (`.github/skills/multi-model-review/SKILL.md:106-141`):
- Cross-referencing: tracks already-addressed findings across model reviews
- If same issue applied → "Already addressed in Finding #N from [Model]"
- If same issue skipped → "Previously skipped. Revisit?"
- If similar but different angle → Present as new finding

**Key Observations**:
- The `task` tool with `model` parameter is the established mechanism for parallel model dispatch
- Model names in the `task` tool correspond to actual model IDs (e.g., `gpt-5.2`, `gemini-3-pro-preview`, `claude-opus-4.5`)
- The pattern of "latest GPT, latest Gemini, latest Claude Opus" as configurable intents (resolved at runtime) is used by `paw-final-review`

### 3. paw-transition Skill — Routing and Stage Boundaries

**Location**: `skills/paw-transition/SKILL.md`

**Mandatory Transitions Table** (`skills/paw-transition/SKILL.md:40-49`):
```
| After Activity          | Required Next                                    | Skippable? |
| paw-init                | paw-spec or paw-work-shaping                    | Per user    |
| paw-implement (any)     | paw-impl-review                                 | NO          |
| paw-spec                | paw-spec-review                                 | NO          |
| paw-planning            | paw-plan-review                                 | NO          |
| paw-impl-review (more)  | paw-implement (next phase)                      | NO          |
| paw-impl-review (last, enabled) | paw-final-review                         | NO          |
| paw-impl-review (last, disabled)| paw-pr                                   | Per Policy  |
| paw-final-review        | paw-pr                                          | NO          |
```

**Current gap**: No entry for `paw-plan-review (passes)` → routing is currently handled by the PAW agent directly, not via transition table. The PAW agent (`agents/PAW.agent.md:21`) has `paw-plan-review (passes) | Planning PR (prs strategy) | NO` but the transition skill doesn't have this row.

**Stage Boundaries** (`skills/paw-transition/SKILL.md:55-60`):
- spec-review passes → code-research
- plan-review passes → implement (Phase 1)
- phase N complete → phase N+1
- all phases complete → paw-final-review (if enabled) or paw-pr
- paw-final-review complete → paw-pr
- paw-pr complete → workflow complete

**New entry needed**: `plan-review passes → paw-planning-docs-review (if enabled) → implement (Phase 1)`

**Stage-to-Milestone Mapping** (`skills/paw-transition/SKILL.md:64-73`):
```
| Stage Boundary              | Milestone Reached                  |
| spec-review passes          | Spec.md complete                   |
| plan-review passes          | ImplementationPlan.md complete     |
| phase N complete (not last) | Phase completion                   |
| all phases complete         | Phase completion (last phase)      |
| paw-final-review complete   | Final Review complete              |
| paw-pr complete             | Final PR                           |
```

**New entry needed**: `paw-planning-docs-review complete | Planning Documents Review complete`

**Pause Determination** (`skills/paw-transition/SKILL.md:75-79`):
- Review Policy `always`/`milestones`: pause at ALL milestones
- Review Policy `planning-only`: pause at Spec.md, ImplementationPlan.md, Final PR; skip Phase completion
- Review Policy `never`: no pauses

The new planning-docs-review gate should follow the same pause logic as the ImplementationPlan.md milestone — it's part of the planning stage, so `planning-only` should pause here.

**Preflight Checks** (`skills/paw-transition/SKILL.md:89-111`):
- For `paw-implement`: correct branch, ImplementationPlan.md exists
- For `paw-code-research`: Spec.md exists (unless minimal)
- For `paw-final-review`: all phases complete, on target branch
- For `paw-pr`: all phases complete, final review complete (if enabled)

**New preflight check needed** for `paw-planning-docs-review`:
- Spec.md exists (unless minimal mode)
- ImplementationPlan.md exists
- CodeResearch.md exists (optional — review proceeds with reduced coverage if missing)

### 4. PAW Agent — Orchestration Logic

**Location**: `agents/PAW.agent.md`

**Mandatory Transitions Table** (`agents/PAW.agent.md:15-28`):
```
| After Activity                                        | Required Next                          | Skippable? |
| paw-plan-review (passes)                             | Planning PR (prs strategy)             | NO         |
| Planning PR created                                   | paw-transition → paw-implement         | NO         |
| paw-impl-review (passes, last phase, review enabled) | paw-final-review                       | NO         |
| paw-impl-review (passes, last phase, review disabled)| paw-pr                                 | Per Policy |
| paw-final-review                                      | paw-pr                                 | NO         |
```

**Current post plan-review flow** (`agents/PAW.agent.md:31`):
After `paw-plan-review` returns PASS:
- **PRs strategy**: Load `paw-git-operations`, create Planning PR (`_plan` → target branch)
- **Local strategy**: Commit to target branch (no PR)

**New flow needed**: After `paw-plan-review` returns PASS → `paw-planning-docs-review` (if enabled) → Planning PR (PRs strategy) or implement (local strategy)

**Stage Boundaries** (`agents/PAW.agent.md:39-47`):
- spec-review passes
- plan-review passes
- Planning PR created (PRs strategy)
- Phase PR created (PRs strategy) or push complete (local strategy)
- All phases complete
- paw-final-review complete
- paw-pr complete (Final PR created)

**New boundary**: `paw-planning-docs-review complete`

**Hybrid Execution Model** (`agents/PAW.agent.md:147-148`):
- **Direct execution**: `paw-spec`, `paw-planning`, `paw-implement`, `paw-pr`, `paw-final-review`, `paw-init`, `paw-status`, `paw-work-shaping`, `paw-rewind`
- **Subagent delegation**: `paw-spec-research`, `paw-code-research`, `paw-spec-review`, `paw-plan-review`, `paw-impl-review`, `paw-transition`

The new `paw-planning-docs-review` should be **direct execution** — it mirrors `paw-final-review` which runs directly to preserve user interactivity for apply/skip/discuss decisions.

**Session Policy Stage Boundaries** (`agents/PAW.agent.md:74-76`):
```
- spec-review passes → code-research
- plan-review passes → implement
- phase N complete → phase N+1
- all phases complete → final-pr
```

**New entry needed**: Adjust `plan-review passes → implement` to include the new gate.

**Handoff Messaging** (`agents/PAW.agent.md:131-136`):
```
| After               | Default next action    | User says              |
| Spec complete        | Code research          | continue or research   |
| Plan complete        | Implementation         | continue or implement  |
| Phase N complete     | Phase N+1 or review    | continue               |
| All phases complete  | Final PR               | continue or pr         |
```

**New entry needed**: `Planning docs review complete | Implementation | continue or implement`

### 5. paw-init Skill — WorkflowContext.md Fields

**Location**: `skills/paw-init/SKILL.md`

**Input Parameters Table** (`skills/paw-init/SKILL.md:26-39`):
The Final Review pattern uses 4 fields:
```
| final_agent_review     | No | enabled      | enabled, disabled                               |
| final_review_mode      | No | multi-model  | single-model, multi-model                       |
| final_review_interactive| No | true        | boolean                                          |
| final_review_models    | No | latest GPT, latest Gemini, latest Claude Opus | comma-separated |
```

**WorkflowContext.md template** (`skills/paw-init/SKILL.md:80-99`):
```markdown
Final Agent Review: <final_agent_review>
Final Review Mode: <final_review_mode>
Final Review Interactive: <final_review_interactive>
Final Review Models: <final_review_models>
```

**New fields pattern** (mirroring Final Review):
```
| planning_docs_review     | No | enabled      | enabled, disabled                               |
| planning_review_mode     | No | multi-model  | single-model, multi-model                       |
| planning_review_interactive| No | true       | boolean                                          |
| planning_review_models   | No | latest GPT, latest Gemini, latest Claude Opus | comma-separated |
```

**WorkflowContext.md additions**:
```markdown
Planning Docs Review: <planning_docs_review>
Planning Review Mode: <planning_review_mode>
Planning Review Interactive: <planning_review_interactive>
Planning Review Models: <planning_review_models>
```

**Configuration Validation** (`skills/paw-init/SKILL.md:66-68`):
- Currently validates: minimal → local strategy, planning-only/never → local strategy
- No additional validation needed for Planning Docs Review fields — they follow the same pattern as Final Review fields

**Defaults for Workflow Modes** (per FR-013 in Spec.md):
- Full mode: `enabled` (default)
- Minimal mode: `disabled` (planning documents less comprehensive)
- Custom mode: configurable

### 6. paw-plan-review Skill — Boundary with New Holistic Review

**Location**: `skills/paw-plan-review/SKILL.md`

**Purpose** (`skills/paw-plan-review/SKILL.md:6`): Reviews implementation plans for quality, feasibility, and alignment with specification.

**Execution Context**: Runs in a **subagent** session (`skills/paw-plan-review/SKILL.md:8`).

**Quality Criteria** (`skills/paw-plan-review/SKILL.md:27-68`):
- Spec Coverage: all spec requirements mapped to phases
- Phase Feasibility: clear success criteria, logical boundaries
- Completeness: no TBDs, all paths specified
- Research Integration: code research findings incorporated
- Strategic Focus: WHAT not HOW
- Documentation Planning: documentation phase included

**Feedback Categories** (`skills/paw-plan-review/SKILL.md:79-85`):
- BLOCKING: must fix before implementation
- IMPROVE: should address but not blocking
- NOTE: observation for awareness

**Completion** (`skills/paw-plan-review/SKILL.md:87-99`): Returns PASS/FAIL to PAW agent.

**Boundary Distinction**:
- `paw-plan-review`: Single-artifact, single-model, iterative fix loop. Reviews ImplementationPlan.md against Spec.md and CodeResearch.md, but focuses on plan quality (feasibility, completeness, strategic focus). Returns PASS/FAIL for the plan-revision cycle.
- `paw-planning-docs-review` (new): Multi-artifact, multi-model, holistic gate. Reviews the bundle (Spec.md + ImplementationPlan.md + CodeResearch.md) for cross-artifact consistency issues after plan-review has already passed. Routes fixes to the appropriate planning skill.

No changes are needed to `paw-plan-review` itself — it continues to function as the iterative single-artifact review (FR-014 in Spec.md).

### 7. paw-spec and paw-planning — Revision Context Support

**paw-spec** (`skills/paw-spec/SKILL.md`):

**Revise Specification** section (`skills/paw-spec/SKILL.md:103-109`):
```
### Revise Specification
**Desired end state**: Spec aligned with downstream artifacts, traceability maintained
- Identify specific sections needing updates based on alignment requirements
- Make targeted revisions while maintaining ID traceability
- Update version/date in spec header
```

The `paw-spec` skill already has a "Revise Specification" execution context (`skills/paw-spec/SKILL.md:103`) that supports downstream alignment. It makes targeted revisions while maintaining ID traceability. This is exactly what the planning-docs-review needs for applying spec fixes — invoke `paw-spec` with the finding as context and the revision mode will handle it.

**Capabilities list** confirms: "Revise spec based on downstream learnings (e.g., align with implementation plan)" (`skills/paw-spec/SKILL.md:20`).

**paw-planning** (`skills/paw-planning/SKILL.md`):

**Plan Revision** section (`skills/paw-planning/SKILL.md:163-173`):
```
### Plan Revision
When revising based on paw-plan-review feedback:
**Desired end state**: ImplementationPlan.md updated to address all BLOCKING issues
1. Read paw-plan-review feedback completely
2. Address BLOCKING issues first
3. Address IMPROVE issues if scope permits
4. Acknowledge NOTE items
5. Re-run quality checklist
```

The `paw-planning` skill already has a "Plan Revision" execution context (`skills/paw-planning/SKILL.md:163`) designed for revisions based on review feedback. While currently triggered by `paw-plan-review` feedback, the same mechanism can serve `paw-planning-docs-review` findings — the skill reads feedback and makes targeted revisions.

**Capabilities list** confirms: "Revise plan based on learnings or feedback" (`skills/paw-planning/SKILL.md:17`).

**Assumption validated**: Both `paw-spec` and `paw-planning` support invocation with revision context for targeted edits. No changes needed to these skills.

### 8. paw-specification.md — Workflow Stages and Review Gates

**Location**: `paw-specification.md` (repo root, 48.2 KB)

**Workflow Modes** (`paw-specification.md:20-83`):
- Full Mode stages: `Spec → Spec Research → Code Research → Implementation Plan → Implementation → Final Review (if enabled) → Final PR → Status` (`paw-specification.md:26`)
- Minimal Mode stages: `Code Research → Implementation Plan → Implementation → Final Review (if enabled) → Final PR → Status` (`paw-specification.md:43`)

The new gate would be inserted after "Implementation Plan" and before "Implementation" in both mode stage lists (though disabled by default in Minimal).

**Stage 02 — Planning** (`paw-specification.md:325-348`):
```
Skills: paw-code-research, paw-planning, paw-plan-review

Workflow:
1. paw-code-research maps relevant code areas
2. paw-planning creates detailed plan
3. Iterate collaboratively
4. paw-plan-review validates plan feasibility (mandatory)
5. For PRs strategy: commit artifacts and open Planning PR
```

**New step needed**: After step 4 (plan-review passes) and before step 5 (Planning PR): `paw-planning-docs-review reviews all planning artifacts as a holistic bundle (if enabled)`

**Stage 04 — Finalization** (`paw-specification.md:383-403`):
- `paw-final-review` reviews full implementation diff against spec (if review enabled)
- This is the pattern to mirror for the planning stage equivalent

**Activity Skills Table** (`paw-specification.md:239-255`):
New row needed: `paw-planning-docs-review | Holistic review of planning artifacts bundle | Review artifacts`

**Architecture Section** (`paw-specification.md:222-235`):
- References "27 Skills" — will become 28
- Hybrid execution model description should note the new skill

**Repository Layout** (`paw-specification.md:168-201`):
- `skills/` directory listing should include `paw-planning-docs-review/SKILL.md`
- `.paw/work/<work-id>/` artifact list doesn't need changes (review artifacts go under `reviews/planning/`)

### 9. Documentation Infrastructure — Update Locations

**MkDocs Configuration** (`mkdocs.yml:61-76`):
```yaml
nav:
  - Specification:
    - Implementation Workflow: specification/implementation.md
  - Reference:
    - Agents: reference/agents.md
    - Artifacts: reference/artifacts.md
```

**Files requiring documentation updates**:

1. **`docs/specification/implementation.md`** (`docs/specification/implementation.md:67-91`):
   - Stage 02 — Implementation Plan: Add planning-docs-review step after plan-review
   - Add new Stage 02.5 or subsection for Planning Docs Review (similar to Stage 03.5 for Final Review at `docs/specification/implementation.md:132-163`)
   - Activity Skills section: Add `paw-planning-docs-review` entry

2. **`docs/reference/agents.md`** (`docs/reference/agents.md:35-38`):
   - Hybrid Execution Model table: Add `paw-planning-docs-review` to Direct (in-session) skills
   - Activity Skills table: Add new row for `paw-planning-docs-review`
   - Workflow Stages section: Update Planning Stage to include new review gate

3. **`docs/reference/artifacts.md`** (`docs/reference/artifacts.md:6-30`):
   - Directory Structure: Add `reviews/planning/` subdirectory under work-id
   - WorkflowContext.md field table: Add 4 new Planning Docs Review fields

4. **`docs/guide/stage-transitions.md`** (`docs/guide/stage-transitions.md:39-99`):
   - Review Policies sections: Note that planning-docs-review is a planning-stage milestone
   - Milestone artifacts lists: Add planning-docs-review completion

5. **`docs/guide/workflow-modes.md`** (if this covers the flow stages with planning-docs-review)

6. **`paw-specification.md`**: Multiple sections as detailed in Finding #8

### 10. paw-status Skill — Stage Progression Updates

**Location**: `skills/paw-status/SKILL.md`

**Workflow Stage Progression** (`skills/paw-status/SKILL.md:79-92`):
```
| State                                                | Recommendation                            |
| Plan exists, no phase work                           | "Begin Phase 1: `implement`"              |
| All phases complete, review enabled, no reviews/     | "Run final review: `final-review`"        |
```

**New entry needed** between "Plan exists" and "Begin Phase 1":
```
| Plan exists, planning-docs-review enabled, no reviews/planning/ | "Run planning docs review" |
| Plan exists, planning-docs-review complete (or disabled)        | "Begin Phase 1: `implement`" |
```

**Full Mode Description** (`skills/paw-status/SKILL.md:97`):
```
Expect: Spec → Spec Research (optional) → Code Research → Plan → Implementation → Final Review → Final PR
```
Update to include `→ Planning Docs Review (if enabled)` after `Plan`.

**Minimal Mode Description** (`skills/paw-status/SKILL.md:100`):
```
Expect: Code Research → Plan → Implementation → Final Review → Final PR
```
No change needed if disabled by default in Minimal.

### 11. paw-workflow Skill — Reference Documentation Updates

**Location**: `skills/paw-workflow/SKILL.md`

**Activities Table** (`skills/paw-workflow/SKILL.md:57-68`):
New row needed:
```
| `paw-planning-docs-review` | Holistic review of planning artifacts bundle | REVIEW*.md in reviews/planning/ |
```

**Artifact Directory Structure** (`skills/paw-workflow/SKILL.md:74-92`):
Add `reviews/planning/` under the reviews directory:
```
└── reviews/
    ├── planning/               # Planning docs review artifacts
    │   ├── REVIEW.md
    │   ├── REVIEW-{MODEL}.md
    │   └── REVIEW-SYNTHESIS.md
    ├── REVIEW.md               # Final review artifacts
    ├── REVIEW-{MODEL}.md
    └── REVIEW-SYNTHESIS.md
```

**Planning Stage** (`skills/paw-workflow/SKILL.md:105-108`):
Add: `4. paw-planning-docs-review: Holistic review of planning bundle (if enabled)`

**Execution Model** (`skills/paw-workflow/SKILL.md:137`):
Add `paw-planning-docs-review` to Direct execution list.

### 12. Review Artifact Path Pattern

**Final Review artifacts**: `.paw/work/<work-id>/reviews/` (`skills/paw-final-review/SKILL.md:52`)
- Gitignored via `.gitignore` with `*` pattern

**Planning Docs Review artifacts** (per FR-011): `.paw/work/<work-id>/reviews/planning/`
- Needs its own `.gitignore` with `*` pattern, OR the parent `reviews/.gitignore` with `*` already covers subdirectories

**Observation**: Since `reviews/.gitignore` with `*` uses a wildcard pattern, it will match all files in subdirectories too. The `paw-planning-docs-review` skill should create the `reviews/planning/` directory but can rely on the parent gitignore — no separate gitignore needed.

### 13. Configuration Field Defaults in Current WorkflowContext.md

The current WorkflowContext.md for this work item (`WorkflowContext.md:8-14`) shows the Final Review fields pattern:
```
Final Agent Review: enabled
Final Review Mode: multi-model
Final Review Interactive: true
Final Review Models: latest GPT, latest Gemini, latest Claude Opus
```

The new fields should follow this exact naming pattern:
```
Planning Docs Review: enabled
Planning Review Mode: multi-model
Planning Review Interactive: true
Planning Review Models: latest GPT, latest Gemini, latest Claude Opus
```

### 14. Skills Directory Structure

**Location**: `skills/` (28 directories currently)

Each skill follows the pattern: `skills/<skill-name>/SKILL.md` (one file per skill, per project conventions noted in `.github/copilot-instructions.md`).

The `paw_get_skill` tool returns SKILL.md content as text — it cannot access bundled resources. Only the SKILL.md file should be created.

New skill: `skills/paw-planning-docs-review/SKILL.md`

## Code References

- `skills/paw-final-review/SKILL.md:1-218` — Primary pattern to mirror (full skill)
- `skills/paw-final-review/SKILL.md:8` — Direct execution context (in-session, not subagent)
- `skills/paw-final-review/SKILL.md:24-32` — Configuration reading from WorkflowContext.md
- `skills/paw-final-review/SKILL.md:50-53` — Reviews directory and gitignore creation
- `skills/paw-final-review/SKILL.md:55-85` — Shared review prompt structure
- `skills/paw-final-review/SKILL.md:87-148` — Multi-model execution (CLI) with synthesis
- `skills/paw-final-review/SKILL.md:160-196` — Interactive resolution flow
- `skills/paw-final-review/SKILL.md:210-218` — Artifact naming and location
- `.github/skills/multi-model-review/SKILL.md:42-70` — Parallel model review via `task` tool
- `.github/skills/multi-model-review/SKILL.md:72-104` — Synthesis structure
- `.github/skills/multi-model-review/SKILL.md:106-141` — Cross-model deduplication in resolution
- `skills/paw-transition/SKILL.md:40-49` — Mandatory transitions table (needs new entry)
- `skills/paw-transition/SKILL.md:55-60` — Stage boundaries (needs new entry)
- `skills/paw-transition/SKILL.md:64-73` — Stage-to-milestone mapping (needs new entry)
- `skills/paw-transition/SKILL.md:75-79` — Pause determination logic
- `skills/paw-transition/SKILL.md:89-111` — Preflight checks (needs new section)
- `agents/PAW.agent.md:15-28` — Mandatory transitions table (needs update)
- `agents/PAW.agent.md:31` — Post plan-review flow (needs new gate insertion)
- `agents/PAW.agent.md:39-47` — Stage boundaries list (needs new entry)
- `agents/PAW.agent.md:74-76` — Session Policy stage boundaries (needs update)
- `agents/PAW.agent.md:131-136` — Handoff messaging table (needs new entry)
- `agents/PAW.agent.md:147-148` — Hybrid execution model (add to direct execution)
- `skills/paw-init/SKILL.md:26-39` — Input parameters table (add 4 new fields)
- `skills/paw-init/SKILL.md:80-99` — WorkflowContext.md template (add 4 new fields)
- `skills/paw-plan-review/SKILL.md:1-110` — Boundary: iterative single-artifact review (no changes)
- `skills/paw-spec/SKILL.md:20` — "Revise spec based on downstream learnings" capability
- `skills/paw-spec/SKILL.md:103-109` — Revise Specification execution context
- `skills/paw-planning/SKILL.md:17` — "Revise plan based on learnings or feedback" capability
- `skills/paw-planning/SKILL.md:163-173` — Plan Revision execution context
- `paw-specification.md:26` — Full mode stages list (add new gate)
- `paw-specification.md:43` — Minimal mode stages list (note disabled default)
- `paw-specification.md:239-255` — Activity skills table (add new row)
- `paw-specification.md:325-348` — Stage 02 Planning workflow (add new step)
- `paw-specification.md:383-403` — Stage 04 Finalization (pattern reference for new gate)
- `skills/paw-status/SKILL.md:79-92` — Workflow stage progression (needs new entry)
- `skills/paw-status/SKILL.md:97` — Full mode description (needs update)
- `skills/paw-workflow/SKILL.md:57-68` — Activities table (add new row)
- `skills/paw-workflow/SKILL.md:74-92` — Artifact directory structure (add reviews/planning/)
- `skills/paw-workflow/SKILL.md:105-108` — Planning stage flow (add new step)
- `skills/paw-workflow/SKILL.md:137` — Execution model (add to direct execution)
- `docs/specification/implementation.md:67-91` — Stage 02 documentation (add new gate)
- `docs/specification/implementation.md:132-163` — Stage 03.5 pattern (reference for new Stage 02.5)
- `docs/reference/agents.md:35-38` — Hybrid execution model table (add new skill)
- `docs/reference/agents.md:44-56` — Activity skills table (add new row)
- `docs/reference/artifacts.md:6-30` — Directory structure (add reviews/planning/)
- `docs/reference/artifacts.md:42-54` — WorkflowContext.md fields (add new fields)
- `docs/guide/stage-transitions.md:39-99` — Review policies (note new milestone)
- `mkdocs.yml:61-76` — Navigation config (no structural changes needed)

## Architecture Documentation

### Execution Model Pattern

The new `paw-planning-docs-review` skill follows the same execution model as `paw-final-review`:
- **Direct execution** in the PAW session (not subagent) to preserve interactivity
- Reads configuration from WorkflowContext.md
- Multi-model dispatch via `task` tool with `model` parameter (CLI only)
- VS Code falls back to single-model
- Interactive resolution presents findings for user apply/skip/discuss
- Artifacts stored in `.paw/work/<work-id>/reviews/planning/` (gitignored)

### Workflow Position

```
plan-review passes
    ↓
[paw-planning-docs-review] (if enabled)
    ↓ (findings? → resolve via paw-spec or paw-planning → re-review)
    ↓ (clean? → proceed)
Planning PR (PRs strategy) or implement (local strategy)
```

This positions the holistic review as a gate between iterative plan refinement (plan-review cycle) and commitment to implementation (Planning PR or Phase 1).

### Resolution Routing

Unlike `paw-final-review` which applies code fixes directly, the new skill routes resolution to existing planning skills:
- Spec issues → invoke `paw-spec` (Revise Specification mode) with finding as context
- Plan issues → invoke `paw-planning` (Plan Revision mode) with finding as context
- Both → sequential: paw-spec first, then paw-planning

### Re-Review Loop

After revisions are applied, `paw-planning-docs-review` re-runs (FR-008). Per Spec.md risk mitigation: if findings persist after 2 cycles, present remaining as informational and proceed.

## Open Questions

- **Gitignore coverage**: Verified via test — `*` in `reviews/.gitignore` does cover `reviews/planning/` subdirectory contents. No separate gitignore needed in `reviews/planning/`.
- **Transition table completeness**: The `paw-transition` skill's mandatory transitions table currently omits `paw-plan-review (passes)` — the PAW agent handles this directly. Should the new `paw-planning-docs-review` routing be added to the transition table, or also handled directly by the PAW agent? The existing pattern suggests PAW agent handles post-plan-review routing.
