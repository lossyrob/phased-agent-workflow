# Society-of-Thought for PAW Planning Workflow

## Overview

This feature extends the PAW planning stage with multi-model consensus, bringing the Society-of-Thought pattern forward from `paw-final-review` to where it has the highest leverage — design decisions. Multiple AI models independently create competing implementation plans, optionally debate each other's approaches, then synthesize into a single consensus ImplementationPlan.md. The same multi-model treatment extends to plan review, where multiple models independently validate the plan and produce a weighted verdict.

## Architecture and Design

### High-Level Architecture

Three planning modes are supported, configured via WorkflowContext.md:

| Mode | Flow | LLM Calls | Use When |
|------|------|-----------|----------|
| `single-model` | Current behavior (default) | 1 | Simple features, cost-sensitive |
| `multi-model` | 3 parallel plans → synthesis | 4 | Complex features with design tradeoffs |
| `multi-model-deep` | 3 plans → 3 critiques → synthesis | 7 | High-stakes architectural decisions |

Multi-model plan review follows the same parallel pattern with weighted verdict synthesis.

**Execution flow (multi-model-deep):**
```
Round 1 (parallel):  GPT → PLAN-gpt.md
                     Gemini → PLAN-gemini.md
                     Claude → PLAN-claude.md

Round 2 (parallel):  GPT + all plans → CRITIQUE-gpt.md
                     Gemini + all plans → CRITIQUE-gemini.md
                     Claude + all plans → CRITIQUE-claude.md

Round 3 (single):    Synthesizer + all plans + all critiques → ImplementationPlan.md
```

### Design Decisions

1. **Full ImplementationPlan.md format for drafts** — Each subagent produces a complete plan using the standard template, enabling structured section-by-section comparison during synthesis. Lighter drafts were considered but would lose the specific details (file paths, phase boundaries, success criteria) where model diversity is most valuable.

2. **Self-review in debate round** — In deep mode, each model critiques all plans including its own. Models often spot their own weaknesses when they see alternative approaches side by side.

3. **Orchestrator handles multi-model plan review** — Since `paw-plan-review` runs as a subagent (cannot spawn sub-subagents), the PAW orchestrator intercepts the delegation point and spawns N parallel subagents. This differs from multi-model planning where `paw-planning` spawns its own subagents (direct session execution).

4. **No `planning_interactive` config field** — Unlike `paw-final-review` which has `final_review_interactive`, planning always runs interactively (direct session execution), so model confirmation is always available.

5. **Weighted verdict for plan review** — PASS if majority of models pass, but ALL concerns from all models are surfaced regardless. This prevents a single conservative model from blocking valid plans while ensuring no concern is silently dropped.

### Integration Points

- **`paw-init`** — New config fields: `Planning Mode`, `Planning Models`, `Plan Review Mode`, `Plan Review Models`
- **`paw-planning`** — Extended with mode switch and multi-model execution blocks
- **`PAW.agent.md`** — Orchestrator-managed multi-model plan review
- **`paw-workflow`** — Updated activities table and artifact directory structure
- **`.gitignore`** — New entry for `planning/` subfolder
- **Downstream stages** — Zero impact. All modes produce the same `ImplementationPlan.md`, so implementation, final review, and PR stages are unchanged.

## User Guide

### Configuration

Add these fields to WorkflowContext.md (automatically included by `paw-init`):

```
Planning Mode: multi-model          # single-model | multi-model | multi-model-deep
Planning Models: latest GPT, latest Gemini, latest Claude Opus
Plan Review Mode: multi-model       # single-model | multi-model
Plan Review Models: latest GPT, latest Gemini, latest Claude Opus
```

All fields default to `single-model` if omitted — existing workflows are unaffected.

### Choosing a Mode

- **`single-model`** — Use for straightforward features where one model's plan is sufficient. Zero additional cost.
- **`multi-model`** — Use when there are genuine design tradeoffs (phasing strategy, component boundaries, architecture choices). 4 LLM calls total.
- **`multi-model-deep`** — Use for high-stakes changes where the debate round adds value (models explicitly critique each other's approaches). 7 LLM calls total.

### Artifacts

Multi-model artifacts are saved in a gitignored `planning/` subfolder:

```
.paw/work/<work-id>/
├── ImplementationPlan.md              # Final synthesized plan
└── planning/                          # Gitignored
    ├── PLAN-{MODEL}.md                # Per-model plan drafts
    ├── CRITIQUE-{MODEL}.md            # Debate artifacts (deep mode)
    ├── PLAN-REVIEW-{MODEL}.md         # Per-model review verdicts
    └── PLAN-REVIEW-SYNTHESIS.md       # Weighted review synthesis
```

### Environment Limitations

- **CLI** — Full multi-model support using `task` tool with `model` parameter
- **VS Code** — Single-model only. If multi-model is configured, a fallback message is shown and single-model executes

## Testing

### How to Test

1. **Single-model (backwards compatibility)**: Run a workflow with no `Planning Mode` field in WorkflowContext.md. Verify planning behaves identically to before.

2. **Multi-model**: Set `Planning Mode: multi-model`. During planning, confirm model resolution prompt appears, 3 parallel plans are created, and a synthesized ImplementationPlan.md is produced. Check `planning/` subfolder for `PLAN-{MODEL}.md` files.

3. **Deep mode**: Set `Planning Mode: multi-model-deep`. Verify critique artifacts (`CRITIQUE-{MODEL}.md`) are also created after plan drafts.

4. **Multi-model plan review**: Set `Plan Review Mode: multi-model`. After plan review, check for `PLAN-REVIEW-{MODEL}.md` and `PLAN-REVIEW-SYNTHESIS.md` in `planning/` subfolder.

5. **Gitignore**: After running multi-model planning, verify `git status` does not show files in `planning/` subfolder.

### Edge Cases

- **Partial failure**: If one model's subagent fails, synthesis proceeds with remaining models (minimum 2 required)
- **All failures**: User is offered retry or single-model fallback
- **2-model configurations**: Valid and supported — synthesis works with any count ≥ 2
- **VS Code with multi-model config**: Gracefully falls back to single-model with user notification
- **Missing config fields**: Defaults to `single-model` for full backwards compatibility

## Limitations and Future Work

- **CLI-only**: Multi-model modes require the `task` tool's `model` parameter, unavailable in VS Code
- **No smart interactive mode**: Synthesis findings are not yet presented with the auto-apply/pause heuristic from #219
- **No specialist personas**: Society-of-Thought with role-based perspectives (security, performance, etc.) is a separate pattern from multi-model parallel execution
- **Complementary to #212**: This feature generates plans with multiple models; #212 reviews the complete planning document bundle (Spec + Plan + Research) with multiple models. Both can be used together.
