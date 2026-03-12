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
- Spec.md, SpecResearch.md (specification stage)
- CodeResearch.md (research stage)
- ImplementationPlan.md (planning stage)
- Docs.md (documentation if separate from implementation)
- `reviews/` directory (Final Agent Review artifacts)
- `reviews/planning/` directory (Planning Documents Review artifacts)

Note existence vs intentionally skipped (minimal mode skips Spec/Docs).

### Configuration Detection

Read WorkflowContext.md for:
- Workflow Mode, Review Strategy, Review Policy
- Artifact Lifecycle: `commit-and-clean` | `commit-and-persist` | `never-commit`
- Final Agent Review: `enabled` | `disabled`
- Planning Docs Review: `enabled` | `disabled`
- Final Review Mode: `single-model` | `multi-model` | `society-of-thought`
- Final Review Interactive: `true` | `false` | `smart`
- Plan Generation Mode: `single-model` | `multi-model`
- Plan Generation Models: comma-separated model names (for multi-model modes)
- Implementation Model: `none` (session default) | concrete model name
- Planning Review Mode: `single-model` | `multi-model`
- Planning Review Interactive: `true` | `false` | `smart`
- Final Review Specialists: `all` | `adaptive:<N>` | comma-separated list (when society-of-thought)
- Final Review Interaction Mode: `parallel` | `debate` (when society-of-thought)
- Final Review Specialist Models: `none` | model pool | pinned pairs | mixed (when society-of-thought)

### Phase Counting

Parse ImplementationPlan.md with regex: `^## Phase \d+:`
- Count distinct phase numbers
- Report: "Phase N of M" or "Phase N (plan shows M phases total)"
- Never assume total—always verify

### Phase Candidates

Check `## Phase Candidates` section in ImplementationPlan.md:
- Count unresolved (`- [ ]`), promoted (`[promoted]`), skipped (`[skipped]`), deferred (`[deferred]`), not feasible (`[not feasible]`)
- If unresolved exist after last phase: report "N phase candidates pending review"

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

Map state to guidance:

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

## Workflow Mode Behavior

### Full Mode
Expect: Spec → Spec Research (optional) → Code Research → Plan → Planning Docs Review (if enabled) → Implementation (multi-phase, including Documentation phase) → Final Review (if enabled) → Final PR

### Minimal Mode
Expect: Code Research → Plan → Implementation (including Documentation phase) → Final Review (if enabled) → Final PR
Skips: Spec, Spec Research (local strategy enforced)

### Custom Mode
Inspect disk to discover actual stages per Custom Workflow Instructions.

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
- Ground the answer in repository docs before replying: `README.md` (`## What is PAW?`), `docs/index.md`, `docs/guide/index.md`, and `docs/guide/cli-installation.md`.
- Explain briefly:
  - PAW enables **Context-Driven Development**: agents build understanding through durable artifacts (specs, research, plans) before writing code.
  - PAW supports two workflows: implementation and review.
  - Workflow **stages** are top-level milestones; implementation **phases** are subdivisions inside `ImplementationPlan.md`.
- If the user also asks how to get started, tailor the answer by platform:
  - **GitHub Copilot CLI**: install via `copilot plugin install lossyrob/phased-agent-workflow` or `npx @paw-workflow/cli install copilot`, then start with `copilot --agent PAW` (or `/agent PAW` in an existing session).
  - **VS Code**: install the extension, then run `PAW: New PAW Workflow`.
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
- **Artifacts**: Existence and status
- **Phases**: Current progress (N of M)
- **Phase Candidates**: Pending/resolved candidate counts (if any exist)
- **Branch & Git**: Current state, divergence
- **PRs**: Open/merged status, review comments
- **Next Actions**: Recommended commands

## Guardrails

- Verify phase count from ImplementationPlan.md—never assume
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
