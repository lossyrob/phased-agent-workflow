---
name: paw-final-review
description: Pre-PR review activity skill for PAW workflow. Reviews implementation against spec before Final PR creation with configurable single-model, multi-model, or society-of-thought execution.
---

# Final Agent Review

> **Execution Context**: This skill runs **directly** in the PAW session (not a subagent), preserving user interactivity for apply/skip/discuss decisions.

Automated review step that runs after all implementation phases complete, before Final PR creation. Examines the full implementation diff against specification to catch issues before external review.

## Capabilities

- Review implementation against spec for correctness, patterns, and issues
- Multi-model parallel review with synthesis (CLI only)
- Society-of-thought review via `paw-sot` engine with specialist personas, parallel/debate execution, and confidence-weighted synthesis (CLI only)
- Single-model review (CLI and VS Code)
- Interactive, smart, or auto-apply resolution modes
- Generate review artifacts in `.paw/work/<work-id>/reviews/`

## Procedure

### Step 1: Read Configuration

Read WorkflowContext.md for:
- Work ID and target branch
- `Final Review Mode`: `single-model` | `multi-model` | `society-of-thought`
- `Final Review Interactive`: `true` | `false` | `smart`
- `Final Review Models`: comma-separated model names (for multi-model)

{{#cli}}
If mode is `multi-model`, parse the models list. Default: `latest GPT, latest Gemini, latest Claude Opus`.

If mode is `society-of-thought`, also read:
- `Final Review Specialists`: `all` (default) | comma-separated specialist names | `adaptive:<N>`
- `Final Review Interaction Mode`: `parallel` (default) | `debate`
- `Final Review Specialist Models`: `none` (default) | model pool | pinned pairs | mixed
{{/cli}}
{{#vscode}}
**Note**: VS Code only supports `single-model` mode. If `multi-model` is configured, proceed with single-model using the current session's model.
{{/vscode}}

### Step 2: Gather Review Context

**Required context** (review subagents gather this themselves via tools):
- Implementation diff: `git diff <base-branch>...<target-branch>`
- Spec.md, ImplementationPlan.md, CodeResearch.md in `.paw/work/<work-id>/`

### Step 3: Create Reviews Directory

Create `.paw/work/<work-id>/reviews/` if it doesn't exist.
Create `.paw/work/<work-id>/reviews/.gitignore` with content `*` (if not already present).

### Review Prompt (shared)

Provide this to all review subagents (single-model or each multi-model subagent). Subagents have full tool access — they gather context themselves rather than receiving it inline.

```
Review this implementation against the specification. Be critical and thorough.

## Context Locations
- **Diff**: Run `git diff <base-branch>...<target-branch>` to see all changes
- **Specification**: Read `.paw/work/<work-id>/Spec.md`
- **Implementation Plan**: Read `.paw/work/<work-id>/ImplementationPlan.md`
- **Codebase Patterns**: Read `.paw/work/<work-id>/CodeResearch.md`

Start by gathering the diff and reading the spec, then review against these criteria:

## Review Criteria
1. **Correctness**: Do changes implement all spec requirements? Any gaps?
2. **Pattern Consistency**: Does implementation follow established codebase patterns?
3. **Bugs and Issues**: Logic errors, edge cases, race conditions, error handling gaps
4. **Token Efficiency**: For prompts/skills, opportunities to reduce verbosity
5. **Documentation**: Missing or outdated documentation

For each finding, provide:
- Issue description
- Current code/text
- Proposed fix
- Severity: must-fix | should-fix | consider

Write findings in structured markdown.
```

{{#cli}}
### Step 4: Execute Review (CLI)

**If single-model mode**:
- Execute review using the prompt above
- Save to `REVIEW.md`

**If multi-model mode**:

Read the resolved model names from WorkflowContext.md. Log the models being used, then start immediately — models were already confirmed during `paw-init`.

Then spawn parallel subagents using `task` tool with `model` parameter for each model. Each subagent receives the review prompt above. Save per-model reviews to `REVIEW-{MODEL}.md`.

**After multi-model reviews complete**, generate synthesis.

**Important**: If any findings involve interface changes, API modifications, or data flow updates, populate the Verification Checklist with specific components that need coordinated updates. This prevents half-fixes where only one side of an interface is updated.

**REVIEW-SYNTHESIS.md structure**:
```markdown
# Review Synthesis

**Date**: [date]
**Reviewers**: [model list]
**Changes**: [branch/diff reference]

## Consensus Issues (All Models Agree)
[Highest priority - all models flagged these]

## Partial Agreement (2+ Models)
[High priority - multiple models flagged]

## Single-Model Insights
[Unique findings worth considering]

## Verification Checklist
[Populate with specific touchpoints for interface/data-flow changes]
- [ ] [Component A] updated
- [ ] [Component B] updated  
- [ ] Data flows end-to-end from [source] → [target]

## Priority Actions
### Must Fix
[Critical issues]

### Should Fix
[High-value improvements]

### Consider
[Nice-to-haves]
```

**If society-of-thought mode**:

Load the `paw-sot` skill and invoke it with a review context constructed from WorkflowContext.md fields and implementation artifacts:

| Review Context Field | Source |
|---------------------|--------|
| `type` | `diff` |
| `coordinates` | Diff: `git diff <base-branch>...<target-branch>`; Artifacts: Spec.md, ImplementationPlan.md, CodeResearch.md paths |
| `output_dir` | `.paw/work/<work-id>/reviews/` |
| `specialists` | `Final Review Specialists` value from WorkflowContext.md |
| `interaction_mode` | `Final Review Interaction Mode` value from WorkflowContext.md |
| `interactive` | `Final Review Interactive` value from WorkflowContext.md |
| `specialist_models` | `Final Review Specialist Models` value from WorkflowContext.md |
| `perspectives` | `Final Review Perspectives` value from WorkflowContext.md |
| `perspective_cap` | `Final Review Perspective Cap` value from WorkflowContext.md |

After paw-sot completes orchestration and synthesis, proceed to Step 5 (Resolution) to process the REVIEW-SYNTHESIS.md findings.

{{/cli}}

{{#vscode}}
### Step 4: Execute Review (VS Code)

**Note**: VS Code only supports single-model mode. If `multi-model` is configured, report to user: "Multi-model not available in VS Code; running single-model review."

If `society-of-thought` is configured, report to user: "Society-of-thought requires CLI for specialist persona loading (see issue #240). Running single-model review."

Execute single-model review using the shared review prompt above. Save to `REVIEW.md`.
{{/vscode}}

### Step 5: Resolution

**If no findings**: Report clean review and proceed.

**If Interactive = true**:

Present each finding to user:
```
## Finding #N: [Title]

**Severity**: [must-fix | should-fix | consider]
**Issue**: [Description]

**Current**:
[Show current code/text]

**Proposed**:
[Show proposed change]

**My Opinion**: [Rationale]

---

**Your call**: apply, skip, or discuss?
```

Track status for each finding:
- `applied` - Change made to codebase
- `skipped` - User chose not to apply
- `discussed` - Modified based on discussion, then applied or skipped

{{#cli}}
For multi-model mode, process synthesis first (consensus → partial → single-model). Track cross-finding duplicates to avoid re-presenting already-addressed issues.

For society-of-thought mode, process REVIEW-SYNTHESIS.md findings by severity (must-fix → should-fix → consider). Present trade-offs from the "Trade-offs Requiring Decision" section for user decision. Track cross-finding duplicates.
{{/cli}}

**If Interactive = smart**:

{{#cli}}
If `Final Review Mode` is `single-model`, smart degrades to interactive behavior (no synthesis to classify). Follow the `Interactive = true` flow.

If `Final Review Mode` is `multi-model`, classify each synthesis finding, then resolve in phases:

**Classification heuristic** (applied per finding):

| Agreement Level | Severity | Classification |
|----------------|----------|----------------|
| Consensus | must-fix | `auto-apply` |
| Consensus | should-fix | `auto-apply` |
| Partial | must-fix/should-fix | `interactive` |
| Single-model | must-fix/should-fix | `interactive` |
| Any | consider | `report-only` |

Consensus agreement implies models converged on the fix — no per-model cross-referencing needed.

If `Final Review Mode` is `society-of-thought`, classify each REVIEW-SYNTHESIS.md finding:

| Confidence | Grounding | Severity | Classification |
|------------|-----------|----------|----------------|
| HIGH | Direct | must-fix | `auto-apply` |
| HIGH | Direct | should-fix | `auto-apply` |
| HIGH | Inferential | must-fix/should-fix | `interactive` |
| MEDIUM/LOW | any | must-fix/should-fix | `interactive` |
| Any | any | consider | `report-only` |
| — | — | trade-off | `interactive` (always) |

**Phase 1 — Auto-apply**: Apply all `auto-apply` findings without user interaction. Display batch summary:

```
## Auto-Applied Findings (N items)

1. **[Title]** (must-fix) — [one-line description]
2. **[Title]** (should-fix) — [one-line description]
...
```

**Phase 2 — Interactive**: Present each `interactive` finding using the same format as `Interactive = true` (apply, skip, or discuss).

**Phase 3 — Summary**: Display final summary of all dispositions:

```
## Resolution Summary

**Auto-applied**: N findings (consensus fixes)
**User-applied**: N findings
**User-skipped**: N findings
**Reported only**: N findings (consider-severity)
```

If all findings are `auto-apply` or `report-only`, skip Phase 2. If all findings are `interactive`, skip Phase 1.
{{/cli}}
{{#vscode}}
Smart mode degrades to interactive behavior in VS Code (single-model has no agreement signal). Follow the `Interactive = true` flow above.
{{/vscode}}

**If Interactive = false**:

Auto-apply all findings marked `must-fix` and `should-fix`. Skip `consider` items. Report what was applied.

{{#cli}}
#### Moderator Mode (society-of-thought only)

After finding resolution completes, if `Final Review Mode` is `society-of-thought` and (`Final Review Interactive` is `true`, or `smart` with significant findings remaining), invoke `paw-sot` a second time for moderator mode — pass the review context `type` (same as orchestration invocation, i.e., `diff`), `output_dir` (containing individual REVIEW-{SPECIALIST}.md files and REVIEW-SYNTHESIS.md), and review coordinates (diff range, artifact paths).

The `paw-sot` moderator mode handles specialist summoning, finding challenges, and deeper analysis. See `paw-sot` skill for interaction patterns.

**Exit**: User says "done", "continue", or "proceed" to exit moderator mode and continue to paw-pr.

**Skip condition**: If `Final Review Interactive` is `false`, or no findings exist, skip moderator mode entirely.
{{/cli}}

### Step 6: Completion

**Report back**:
- Total findings count
- Applied / skipped / discussed counts
- Summary of key changes made
- Review artifacts location
- Status: `complete` (ready for paw-pr)

**Edge cases**:
- Empty diff → Report "no implementation changes to review", proceed to paw-pr
- All findings skipped → Proceed to paw-pr (user's choice respected)

## Review Artifacts

| Mode | Files Created |
|------|---------------|
| single-model | `REVIEW.md` |
| multi-model | `REVIEW-{MODEL}.md` per model, `REVIEW-SYNTHESIS.md` |
| society-of-thought | `REVIEW-{SPECIALIST}.md` per specialist, `REVIEW-SYNTHESIS.md` (produced by `paw-sot`) |

Location: `.paw/work/<work-id>/reviews/`
All files gitignored via `.gitignore` with `*` pattern.
