---
name: paw-status
description: Workflow status activity skill for PAW workflow. Diagnoses workflow state, recommends next steps, explains PAW process, and optionally posts updates to Issues/PRs.
---

# Workflow Status

> **Execution Context**: This skill runs **directly** in the PAW session (not a subagent)—simple diagnostic with no context isolation benefit.

Serve as the workflow navigator and historian. Diagnose current workflow state, recommend next actions, and optionally post updates to Issues/PRs.

> **Reference**: Follow Core Implementation Principles from `paw-workflow` skill.

## Capabilities

- Diagnose current workflow state from artifacts and git
- Recommend appropriate next steps
- Explain what PAW is, how the workflow works, and how to get started
- List active work items across workspace
- List available workflow presets (built-in and user-defined)
- Post status updates to Issues/PRs (on explicit request)

## Default Behavior

**Report status in chat**—do NOT post to GitHub unless explicitly asked ("post status to issue", "update the PR summary").

## State Detection

### Artifact Discovery

Check `.paw/work/<work-id>/` for:
- WorkflowContext.md (required for workflow context)
- Standard PAW artifacts: Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md, Docs.md
- PAW Lite artifacts: WorkShaping.md, Plan.md, `reviews/FINAL-REVIEW.md`
- `reviews/` directory (Final Agent Review artifacts)
- `reviews/planning/` directory (Planning Documents Review artifacts)

Note existence vs intentionally skipped. Standard minimal mode skips Spec/Docs; paw-lite skips standard PAW planning artifacts entirely.

### Configuration Detection

Read WorkflowContext.md for:
- Workflow Identity: `paw` | `paw-lite`
- Workflow Mode, Review Strategy, Review Policy
- Artifact Lifecycle: `commit-and-clean` | `commit-and-persist` | `never-commit`
- Final Agent Review: `enabled` | `disabled`
- Planning Docs Review: `enabled` | `disabled`
- Final Review Mode: `single-model` | `multi-model` | `society-of-thought`
- Final Review Interactive: `true` | `false` | `smart`
- Plan Generation Mode: `single-model` | `multi-model`
- Plan Generation Models: comma-separated model names (for multi-model modes)
- Implementation Model: `none` (session default) | concrete model name
- Planning Review Mode: `single-model` | `multi-model` | `society-of-thought`
- Planning Review Interactive: `true` | `false` | `smart`
- Final Review Specialists: `all` | `adaptive:<N>` | comma-separated list (when society-of-thought)
- Final Review Interaction Mode: `parallel` | `debate` (when society-of-thought)
- Final Review Specialist Models: `none` | model pool | pinned pairs | mixed (when society-of-thought)

### Workflow Identity Detection

- `Workflow Identity: paw` → standard PAW profile
- `Workflow Identity: paw-lite` → lite profile
- If `Workflow Identity` is absent, default to standard PAW handling
- Legacy lite compatibility fallback: if `Plan.md` exists and `ImplementationPlan.md` does not, use lite artifact expectations for status reporting and explicitly say workflow identity is missing

### Control State Detection

If `WorkflowContext.md` contains `## Control State`, read:
- `Reconciliation:` marker
- Required activity items
- Gate items
- Configured procedure items

Treat embedded control state as the durable workflow source of truth when present. If the section is absent, continue in legacy best-effort mode and explicitly report that control-state protections are inactive.

### Phase Counting

Parse ImplementationPlan.md with regex: `^## Phase \d+:`
- Count distinct phase numbers
- Report: "Phase N of M" or "Phase N (plan shows M phases total)"
- Never assume total—always verify

Only apply phase counting to the standard PAW profile. Do not invent phases for paw-lite.

### Phase Candidates

Check `## Phase Candidates` section in ImplementationPlan.md:
- Count unresolved (`- [ ]`), promoted (`[promoted]`), skipped (`[skipped]`), deferred (`[deferred]`), not feasible (`[not feasible]`)
- If unresolved exist after last phase: report "N phase candidates pending review"

Only apply phase-candidate reporting to the standard PAW profile.

### Lite Work Item Counting

For the paw-lite profile, parse `Plan.md` `## Work Items` checkboxes:
- Count complete vs incomplete work items
- Report: "Work items X of Y complete"
- Use `FINAL-REVIEW.md` presence only for review-state reporting, not as a substitute for unresolved work items

### Git Status

Determine:
- Current branch: `git branch --show-current`
- Staged/unstaged changes: `git status --porcelain`
- Upstream divergence: commits ahead/behind remote

### PR Discovery

For **prs strategy**:
- Find branches: `<target>_plan`, `<target>_phase*`, `<target>_docs`
- Query PRs by head branch
- Capture: URL, state (open/merged/closed), CI status

For **local strategy**:
- Focus on target branch and Final PR only

### PR Review Comments

When PRs exist:
- Fetch inline review comments and general discussion
- Compare comment timestamps vs commit history
- Summarize: "X comments (Y addressed, Z outstanding)"

## Workflow Stage Progression

Map state to guidance.

When control state is present:
- Derive the current workflow position from the first required activity item whose status is not terminal (`resolved` or `not_applicable`).
- Report any earlier `blocked`, `pending`, or `in_progress` gate/procedure items that should already be terminal as blockers rather than inferring progress past them.
- If `Reconciliation` is `stale` or `external_unverified`, do not imply freshness. Report a read-only/unverified status and name the unresolved control-state items.
- If `Reconciliation` is `not_run`, say reconciliation is still required before mutation-affecting work can safely proceed.
- If the profile is `paw-lite`, map the first non-terminal required activity to lite guidance:
  - `planning` → "Create or continue the lite plan: `plan`"
  - `implementation` → "Continue lite implementation: `implement`"
  - `final-review` → "Run lite final review: `final-review`"
  - `final-pr` → "Create the final PR: `pr`"
- For paw-lite, do not report progress past unresolved work items or an unresolved `FINAL-REVIEW.md` requirement.

| State | Recommendation |
|-------|----------------|
| Missing Spec.md + full mode | "Start specification: `spec`" |
| Spec.md exists, no CodeResearch.md | "Run code research: `research`" |
| CodeResearch.md exists, no Plan | "Create plan: `plan`" |
| Plan exists, planning-docs-review enabled, no reviews/planning/ | "Run planning docs review" |
| Plan exists, no phase work | "Begin Phase 1: `implement`" |
| Phase N complete, Phase N+1 exists | "Continue Phase N+1: `implement`" |
| All phases complete, review enabled, no reviews/ | "Run final review: `final-review`" |
| All phases complete, reviews/ exists | "Create final PR: `pr`" |
| All phases complete, review disabled | "Create final PR: `pr`" |
| All complete + unresolved candidates | "Review phase candidates before PR" |

When control state is absent and legacy lite compatibility mode is active:
- Missing `Plan.md` → "Create the lite plan: `plan`"
- `Plan.md` exists with unresolved work items → "Continue lite implementation: `implement`"
- All work items resolved, final review enabled, and `reviews/FINAL-REVIEW.md` missing → "Run lite final review: `final-review`"
- All work items resolved and review is disabled, or `reviews/FINAL-REVIEW.md` exists → "Create the final PR: `pr`"

## Workflow Mode Behavior

### Full Mode
Expect: Spec → Spec Research (optional) → Code Research → Plan → Planning Docs Review (if enabled) → Implementation (multi-phase, including Documentation phase) → Final Review (if enabled) → Final PR

### Minimal Mode
Expect: Code Research → Plan → Implementation (including Documentation phase) → Final Review (if enabled) → Final PR
Skips: Spec, Spec Research (local strategy enforced)

### Custom Mode
Inspect disk to discover actual stages per Custom Workflow Instructions.

### PAW Lite
Expect: Work Shaping (optional) → Plan → Implementation → Final Review (if enabled) → Final PR
Skips: Spec, Code Research, ImplementationPlan, planning-docs review, phase candidates

## Multi-Work Management

When asked "What PAW work items do I have?":
- Enumerate `.paw/work/` directories with WorkflowContext.md
- Report: Work Title, Work ID, target branch, last modified, current stage
- Sort by most recently modified

## Issue/PR Updates (Opt-in Only)

Only post externally when explicitly asked.

**Issue comments**:
- Prefix: `**🐾 Status Update 🤖:**`
- Include: Artifacts, PRs, phase checklist

**PR body updates**:
- Only modify content inside `<!-- BEGIN:AGENT-SUMMARY -->` / `<!-- END:AGENT-SUMMARY -->` block
- Preserve all other text

**Never**:
- Modify issue descriptions
- Assign reviewers
- Change labels

## Preset Discovery

When asked "What presets are available?" or "List presets":
- **Built-in presets**: `quick` (minimal ceremony), `standard` (balanced with gates), `thorough` (maximum rigor), `team` (PR-based collaboration), `auto` (autonomous, final-pr-only), `auto-full` (auto + full review rigor), `shaping-full` (work shaping then auto-full)
- **User presets**: Scan `~/.paw/presets/*.yaml` files, read name and description from each
- Display: name, description, source (built-in/user), default marker if set, extends target if present
- If user preset has same name as built-in, show user version (it takes precedence)

## Help Mode

For "What is PAW?", "What does PAW stand for?", or similar onboarding questions:
- Use the exact name **Phased Agent Workflow**. Never invent an acronym expansion.
- Ground onboarding answers in these repository sources: `README.md`, `docs/index.md`, `docs/guide/index.md`, `docs/guide/cli-installation.md`.
- For full documentation, see: https://lossyrob.github.io/phased-agent-workflow/ (overview), https://lossyrob.github.io/phased-agent-workflow/guide/ (getting started), https://lossyrob.github.io/phased-agent-workflow/guide/cli-installation/ (CLI install).
- Explain briefly:
  - PAW enables **Context-Driven Development**: agents build understanding through durable artifacts (specs, research, plans) before writing code.
  - PAW supports two workflows: implementation and review.
  - Workflow **stages** are top-level milestones; implementation **phases** are subdivisions inside `ImplementationPlan.md`.
- Keep onboarding guidance aligned across **GitHub Copilot CLI** and **VS Code**.
- If the user also asks how to get started:
{{#cli}}
  - In **GitHub Copilot CLI**, select the PAW custom agent (e.g. `copilot --agent PAW` or `/agent PAW`) and say "start a new PAW workflow".
{{/cli}}
{{#vscode}}
  - In **VS Code**, run `PAW: New PAW Workflow`.
{{/vscode}}
- Prefer concise, sourced onboarding language over improvisation.

When asked "What does <stage> do?", provide:
1. Purpose of the stage
2. Required inputs/artifacts
3. Expected outputs
4. Typical duration
5. Command to run

For implementation details (e.g., two-agent pattern, delegation mechanics), reference `paw-workflow` skill.

For "How do I start?", explain:
- `PAW: New PAW Workflow` command
- Parameters (branch, mode, strategy, issue URL)
- Available presets for quick setup (e.g., "use `quick` for minimal ceremony, `thorough` for full review pipeline")
- That prompt files generate on demand

## Status Dashboard Format

Synthesize findings into sections:
- **Control State**: present vs legacy mode, reconciliation marker, unresolved gate/procedure items
- **Artifacts**: Existence and status
- **Phases / Work Items**: Standard PAW phase progress or paw-lite work-item progress
- **Phase Candidates**: Pending/resolved candidate counts (standard PAW only, if any exist)
- **Branch & Git**: Current state, divergence
- **PRs**: Open/merged status, review comments
- **Next Actions**: Recommended commands

## Guardrails

- Verify phase count from ImplementationPlan.md—never assume
- If control state is present, do not report progress past unresolved required items, gate items, or procedure items
- If reconciliation is `stale` or `external_unverified`, label the result read-only/unverified instead of implying mutation-safe readiness
- If control state is absent, explicitly say legacy best-effort mode is active
- If legacy lite compatibility mode is active, explicitly say workflow identity is missing and the result is compatibility-only
- Never mutate issue descriptions or PR content outside summary blocks
- Never push, merge, or rewrite git history
- Be idempotent: same state → same summary
- If required info missing, state blocker and resolution

## Completion Response

Report:
- Current workflow state
- Recommended next action with command
- Any blockers or warnings
- PR/branch status summary
