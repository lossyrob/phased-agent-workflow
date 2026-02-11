---
name: paw-planning-docs-review
description: Holistic review of planning artifacts bundle (Spec.md + ImplementationPlan.md + CodeResearch.md) with configurable multi-model or single-model execution. Catches cross-artifact consistency issues before implementation begins.
---

# Planning Documents Review

> **Execution Context**: This skill runs **directly** in the PAW session (not a subagent), preserving user interactivity for apply/skip/discuss decisions.

Holistic review gate that examines all planning documents as a bundle after plan-review passes, before implementation begins. Focuses on cross-artifact consistency issues that individual reviews of Spec.md or ImplementationPlan.md cannot detect.

## Capabilities

- Review planning artifacts (Spec.md, ImplementationPlan.md, CodeResearch.md) as a holistic bundle
- Multi-model parallel review with synthesis (CLI only)
- Single-model review (CLI and VS Code)
- Interactive resolution routing fixes to paw-spec or paw-planning
- Re-review after revisions with cycle limit
- Generate review artifacts in `.paw/work/<work-id>/reviews/planning/`

## Procedure

### Step 1: Read Configuration

Read WorkflowContext.md for:
- Work ID and target branch
- `Planning Docs Review`: `enabled` | `disabled`
- `Planning Review Mode`: `single-model` | `multi-model`
- `Planning Review Interactive`: `true` | `false` | `smart`
- `Planning Review Models`: comma-separated model names (for multi-model)

If `Planning Docs Review` is `disabled`, report skip and return `complete`.

{{#cli}}
If mode is `multi-model`, parse the models list. Default: `latest GPT, latest Gemini, latest Claude Opus`.
{{/cli}}
{{#vscode}}
**Note**: VS Code only supports `single-model` mode. If `multi-model` is configured, proceed with single-model using the current session's model.
{{/vscode}}

### Step 2: Gather Review Context

**Required context**:
- ImplementationPlan.md — phases, architecture, file paths, success criteria

**Contextual**:
- Spec.md — requirements, user stories, success criteria, scope boundaries (absent in minimal mode — note reduced scope in review output)

**Optional context**:
- CodeResearch.md — existing patterns, conventions, system behavior

If Spec.md or CodeResearch.md is missing, proceed with available artifacts. Note reduced coverage in the review output.

### Step 3: Create Reviews Directory

Create `.paw/work/<work-id>/reviews/planning/` if it doesn't exist.
Create `.paw/work/<work-id>/reviews/.gitignore` with content `*` (if not already present).

### Review Prompt (shared)

Use this prompt for all review executions (single-model or each multi-model subagent):

```
Review these planning documents as a holistic bundle. Focus on cross-artifact consistency
issues that reviewing each document individually would miss.

## Specification
[Include Spec.md content]

## Implementation Plan
[Include ImplementationPlan.md content]

## Code Research
[Include CodeResearch.md content, or note "Not available — reduced coverage review"]

## Cross-Artifact Review Criteria

1. **Spec ↔ Plan Traceability**: Do all functional requirements map to plan phases?
   Do plan phases introduce unspecified work? Are any spec requirements lost in translation?
2. **Assumption Consistency**: Do spec assumptions hold given code research findings?
   Does the plan rely on assumptions not documented in the spec?
3. **Scope Coherence**: Does the plan's exclusions match spec's Out of Scope?
   Any drift between what spec excludes and what plan excludes?
4. **Feasibility Validation**: Does code research support the plan's approach?
   Are there research findings the plan ignores or misinterprets?
5. **Completeness**: Are there spec success criteria with no corresponding plan success criteria?
   Are spec edge cases covered in the plan?

For each finding, provide:
- Issue description (which artifacts conflict and how)
- Evidence from each artifact
- Affected artifact(s): spec, plan, or both
- Suggested resolution direction
- Severity: must-fix | should-fix | consider

Write findings in structured markdown.
```

{{#cli}}
### Step 4: Execute Review (CLI)

**If single-model mode**:
- Execute review using the prompt above
- Save to `reviews/planning/REVIEW.md`

**If multi-model mode**:

Resolve model intents to actual model names (e.g., "latest GPT" → current GPT model). Log resolved models, then spawn parallel subagents using `task` tool with `model` parameter for each model. Each subagent receives the review prompt above. Save per-model reviews to `reviews/planning/REVIEW-{MODEL}.md`.

**After multi-model reviews complete**, generate synthesis.

**REVIEW-SYNTHESIS.md structure**:
```markdown
# Planning Documents Review Synthesis

**Date**: [date]
**Reviewers**: [model list]
**Artifacts Reviewed**: Spec.md, ImplementationPlan.md, CodeResearch.md

## Consensus Issues (All Models Agree)
[Highest priority — all models flagged these cross-artifact gaps]

## Partial Agreement (2+ Models)
[High priority — multiple models flagged]

## Single-Model Insights
[Unique findings worth considering]

## Priority Actions
### Must Fix
[Critical cross-artifact issues]

### Should Fix
[Important consistency gaps]

### Consider
[Minor alignment opportunities]
```

Save to `reviews/planning/REVIEW-SYNTHESIS.md`.
{{/cli}}

{{#vscode}}
### Step 4: Execute Review (VS Code)

**Note**: VS Code only supports single-model mode. If `multi-model` is configured, report to user: "Multi-model not available in VS Code; running single-model review."

Execute single-model review using the shared review prompt above. Save to `reviews/planning/REVIEW.md`.
{{/vscode}}

### Step 5: Resolution

**If no findings**: Report clean review and return `complete`.

**If Interactive = true**:

Present each finding to user with resolution options:
```
## Finding #N: [Title]

**Severity**: [must-fix | should-fix | consider]
**Criteria**: [Which cross-artifact criteria]
**Affected Artifact(s)**: [spec | plan | both]

**Issue**: [Description of cross-artifact gap]

**Evidence**:
- Spec: [relevant section/content]
- Plan: [relevant section/content]
- Research: [relevant section/content, if applicable]

**Suggested Resolution**: [Direction for fix]

---

**Your call**: apply-to-spec, apply-to-plan, apply-to-both, skip, or discuss?
```

Resolution routing:
- **apply-to-spec**: Load `paw-spec` skill (Revise Specification mode) with finding as context
- **apply-to-plan**: Load `paw-planning` skill (Plan Revision mode) with finding as context
- **apply-to-both**: Apply to spec first, then plan (sequential)
- **skip**: Record finding as skipped, proceed to next
- **discuss**: Discuss with user, then apply or skip

Track status for each finding: `applied-to-spec`, `applied-to-plan`, `applied-to-both`, `skipped`, `discussed`.

{{#cli}}
For multi-model mode, process synthesis first (consensus → partial → single-model). Track cross-finding duplicates to avoid re-presenting already-addressed issues.
{{/cli}}

**If Interactive = smart**:

{{#cli}}
If `Planning Review Mode` is `single-model`, smart degrades to interactive behavior (no synthesis to classify). Follow the `Interactive = true` flow.

If `Planning Review Mode` is `multi-model`, classify each synthesis finding, then resolve in phases:

**Classification heuristic** (applied per finding):

| Agreement Level | Severity | Affected Artifact | Classification |
|----------------|----------|-------------------|----------------|
| Consensus | must-fix/should-fix | spec or plan (single) | `auto-apply` → auto-route to appropriate skill |
| Consensus | must-fix/should-fix | both | `interactive` → user chooses routing |
| Partial | must-fix/should-fix | any | `interactive` |
| Single-model | must-fix/should-fix | any | `interactive` |
| Any | consider | any | `report-only` |

Consensus agreement implies models converged on the fix. Single-artifact consensus findings are auto-routed: `spec` → paw-spec (Revise), `plan` → paw-planning (Revision). Multi-artifact findings always pause for user routing even at consensus.

**Phase 1 — Auto-apply**: Apply all `auto-apply` findings without user interaction, routing each to the appropriate skill. Display batch summary:

```
## Auto-Applied Findings (N items)

1. **[Title]** (must-fix) → applied to spec — [one-line description]
2. **[Title]** (should-fix) → applied to plan — [one-line description]
...
```

**Phase 2 — Interactive**: Present each `interactive` finding using the same format as `Interactive = true` (apply-to-spec, apply-to-plan, apply-to-both, skip, or discuss).

**Phase 3 — Summary**: Display final summary of all dispositions:

```
## Resolution Summary

**Auto-applied**: N findings (consensus single-artifact fixes)
**User-applied**: N findings (to-spec: X, to-plan: Y, to-both: Z)
**User-skipped**: N findings
**Reported only**: N findings (consider-severity)
```

If all findings are `auto-apply` or `report-only`, skip Phase 2. If all findings are `interactive`, skip Phase 1.

Smart mode classification applies independently per re-review cycle (Step 6) since synthesis is regenerated from modified artifacts each cycle.
{{/cli}}
{{#vscode}}
Smart mode degrades to interactive behavior in VS Code (single-model has no agreement signal). Follow the `Interactive = true` flow above.
{{/vscode}}

**If Interactive = false**:

Auto-apply all `must-fix` and `should-fix` findings. Skip `consider` items. Route each to the appropriate planning skill based on affected artifact. Report what was applied.

### Step 6: Re-Review (if revisions were made)

If any findings were applied (artifacts revised), re-run the review to verify consistency:

1. Re-execute Steps 2–5 with updated artifacts
2. If no new findings, proceed to completion
3. If new findings emerge, present for resolution
4. **Cycle limit**: After 2 review cycles, present any remaining findings as informational and proceed. Do not loop indefinitely.

### Step 7: Completion

**Report back**:
- Total findings count
- Applied / skipped / discussed counts (by artifact target)
- Summary of key revisions made
- Review artifacts location
- Status: `complete` (ready for implementation)

**Edge cases**:
- All findings skipped → Proceed (user's choice respected)
- Planning Docs Review disabled → Skip with status `complete`
- All models return no findings → Clean pass, proceed

## Review Artifacts

| Mode | Files Created |
|------|---------------|
| single-model | `REVIEW.md` |
| multi-model | `REVIEW-{MODEL}.md` per model, `REVIEW-SYNTHESIS.md` |

Location: `.paw/work/<work-id>/reviews/planning/`
Covered by parent `.gitignore` with `*` pattern in `reviews/`.
