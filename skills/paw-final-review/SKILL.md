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
- Society-of-thought review with specialist personas, parallel execution, and confidence-weighted synthesis (CLI only)
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

#### Specialist Discovery

Discover specialist personas at 4 precedence levels (most-specific-wins for name conflicts):

1. **Workflow**: Parse `Final Review Specialists` from WorkflowContext.md — if an explicit comma-separated list, resolve only those names
2. **Project**: Scan `.paw/personas/<name>.md` files in the repository
3. **User**: Scan `~/.paw/personas/<name>.md` files
4. **Built-in**: Scan `references/specialists/<name>.md` files (excluding `_shared-rules.md`)

Resolution rules:
- If `Final Review Specialists` is `all` (default): include all discovered specialists from all levels
- If a fixed list (e.g., `security, performance, testing`): resolve each name against discovered specialists, most-specific-wins
- If `adaptive:<N>`: discover all, then select N most relevant (see Adaptive Selection below)
- Same filename at project level overrides user level overrides built-in
- Skip malformed or empty specialist files with a warning; continue with remaining roster
- If zero specialists found after discovery, fall back to built-in defaults with a warning

#### Adaptive Selection

When `Final Review Specialists` is `adaptive:<N>`, select the N most relevant specialists from the full discovered roster based on diff content analysis.

**Selection process**:
1. Analyze the diff to identify dominant change categories — file types, affected subsystems, nature of changes (new logic, refactoring, config, API surface, data handling, test coverage)
2. For each discovered specialist, assess relevance by matching the specialist's cognitive strategy and domain against the identified change categories
3. Select up to N specialists with the highest relevance to the actual changes
4. Document selection rationale in the REVIEW-SYNTHESIS.md `Selection rationale` field (e.g., "Selected security, performance, testing — diff adds new API endpoint with database queries and no test coverage")

**Edge cases**:
- If N ≥ number of available specialists, include all (equivalent to `all`)
- If the diff is trivial (e.g., single typo fix, comment-only changes), report to user and suggest falling back to `single-model` mode
- If adaptive selection would select 0 specialists (no strong relevance signal):
  - **Interactive mode** (`Final Review Interactive: true`): Present the user with options — fall back to single-model, fall back to multi-model, or specify which specialists to include (including `all`)
  - **Non-interactive mode** (`Final Review Interactive: false` or `smart`): Fall back to multi-model mode using default models, preserving multi-perspective coverage without the full SoT workflow cost

**Compatibility**: Adaptive selection is orthogonal to interaction mode — works with both `parallel` and `debate`.

#### Prompt Composition

Compose the review prompt for each specialist subagent from three layers:

1. **Shared rules** — load `references/specialists/_shared-rules.md` once per review run (anti-sycophancy rules, confidence scoring, Toulmin output format)
2. **Specialist content** — load the discovered specialist `.md` file (identity, cognitive strategy, behavioral rules, demand rationale, examples)
3. **Review coordinates** — base branch, target branch, work ID, and artifact paths so the subagent can self-gather context via `git diff`, `view`, and `grep`

If a specialist file contains `shared_rules_included: true` in its YAML frontmatter, skip shared rules injection to avoid duplication. Otherwise, always inject shared rules.

Replace `[specialist-name]` in the shared rules output format with the specialist's actual name (e.g., `security`, `performance`).

#### Execution

Execution depends on `Final Review Interaction Mode`:

##### Parallel Mode (default)

Spawn parallel subagents using `task` tool with `agent_type: "general-purpose"`. For each specialist:
- Compose prompt: shared rules + specialist content + review coordinates
- Resolve model using precedence chain (see Model Assignment below)
- Instruct the subagent to write its Toulmin-structured findings directly to `REVIEW-{SPECIALIST-NAME}.md` in the reviews directory
- The orchestrator receives only a brief completion status (success/failure, finding count) — NOT the full findings content

**Model Assignment**: Resolve the model for each specialist using this precedence (most-specific-wins):

1. **Specialist frontmatter**: If the specialist `.md` file contains a `model:` field in YAML frontmatter, use that model
2. **WorkflowContext pinning**: If `Final Review Specialist Models` contains a `specialist:model` pair matching this specialist name, use the pinned model
3. **WorkflowContext pool**: If `Final Review Specialist Models` contains unpinned model names, distribute them round-robin across unpinned specialists (sort specialists alphabetically, cycle through pool list)
4. **Session default**: If none of the above apply, use the session's default model

If a specified model is unavailable or invalid, fall back to session default with a user-visible warning.

Log the specialist→model assignment map at review start so users can verify the distribution.

After all specialists complete, proceed to synthesis.

##### Debate Mode

Thread-based multi-round debate where findings become discussion threads with point/counterpoint exchanges. Produces richer evidence than parallel mode at the cost of more subagent calls.

**Edge case**: If only 1 specialist is selected, skip debate and use parallel mode (debate requires ≥2 specialists).

**Round 1 (Initial sweep)**: Run all specialists in parallel (same as parallel mode). Each finding becomes a **thread** with state `open`.

**Rounds 2–3 (Threaded responses)**: After each round, the synthesis agent (operating as PR triage lead) generates a **round summary** organized by thread:
- For each thread: current state (`open`, `agreed`, `contested`), summary of positions, open questions
- This summary is the only inter-specialist communication (hub-and-spoke — specialists never see each other's raw findings)

Re-run specialists with: shared rules + specialist content + review coordinates + round summary (embedded — this is the only new information per round). Specialists can:
- Refine their position on existing threads (cite thread ID)
- Respond to summarized counterarguments
- Add new threads (new findings become new `open` threads)

Each specialist appends round output to its existing `REVIEW-{SPECIALIST-NAME}.md`.

**Adaptive termination**: After each round, the synthesis agent evaluates whether new substantive findings emerged. If no new threads and no position changes on existing threads, global rounds terminate early. Hard cap: 3 global rounds.

**Per-thread continuation** (contested threads only): After global rounds close, threads still marked `contested` enter targeted continuation:
- Only the specialists involved in the contested thread participate (2–3 specialists, not the full roster)
- Max 2 additional exchanges per thread (total cap: 5 exchanges including global rounds)
- **Aggregate budget**: Max 30 subagent calls across all continuation threads
- Synthesis agent monitors each thread for convergence, deadlock, or trade-off identification
- **Trade-off detection**: If a contested thread represents a genuine design trade-off (not a factual dispute), classify as `trade-off` and exit continuation — flag for user decision (interactive) or conservative default resolution (auto)

**Thread states**: `open` → `agreed` | `contested` | `trade-off` | `resolved`

**User escalation** (interactive/smart mode): When the orchestrating skill identifies a trade-off thread from the round summary, pause and present the trade-off to the user with both sides' evidence and positions, ask for a decision, then continue with the user's decision as context. In auto mode, apply conservative defaults (priority hierarchy: Correctness > Security > Reliability > Performance > Maintainability > Developer Experience) and flag in REVIEW-SYNTHESIS.md.

After all threads resolve or budget is exhausted, proceed to synthesis.

#### Synthesis

Spawn a synthesis subagent (`agent_type: "general-purpose"`) that reads all `REVIEW-{SPECIALIST}.md` files directly via `view` tool and produces `REVIEW-SYNTHESIS.md`. The orchestrator sees only the final synthesis output.

The synthesis agent operates as a **PR triage lead** with these structural constraints:
- **May only** merge, deduplicate, classify conflicts, and flag trade-offs
- **Must NOT** generate new findings — it is not an additional reviewer
- **Must** link every output claim to a specific specialist finding with evidence
- **Must** randomize specialist input ordering to prevent position bias

Synthesis requirements:
- **Cluster by code location** before merging — group findings by shared file + line range across specialists
- **Classify disagreements**: factual dispute (one is wrong — resolve with evidence and rebuttal conditions) vs. trade-off (different quality objectives, both valid — escalate or flag)
- **Validate grounding** for every finding: Direct (cites specific diff lines — full inclusion), Inferential (anchored in diff but requires reasoning — include with chain shown), Contextual (beyond the diff — demote to observations)
- **Confidence-weighted aggregation**: weigh by stated confidence AND evidence quality, not count of specialists
- **Merge agreements, preserve dissent**: compatible claims → single finding with combined evidence; unresolved disagreements → include both positions with "unresolved" flag
- **Proportional output**: weight by evidence quality, not word count or finding count
- **Trade-off handling**: in `interactive`/`smart` mode, escalate to user with shared facts, decision axis, options, and recommendation per priority hierarchy. In `auto` mode, apply priority hierarchy (`Correctness > Security > Reliability > Performance > Maintainability > Developer Experience`), document the decision, flag prominently

**REVIEW-SYNTHESIS.md structure (society-of-thought)**:
```markdown
# REVIEW-SYNTHESIS.md

## Review Summary
- Mode: society-of-thought (parallel | debate)
- Specialists: [list of participating specialists]
- Selection rationale: [if adaptive mode was used]
- Rounds: [number of rounds completed, debate mode only]
- Threads: [total threads, agreed/contested/trade-off/resolved counts, debate mode only]

## Must-Fix Findings
[Findings with severity: must-fix, each with specialist attribution, confidence, grounding tier]

## Should-Fix Findings
[Findings with severity: should-fix]

## Consider
[Findings with severity: consider]

## Trade-offs Requiring Decision
[Unresolved trade-offs with both sides' evidence and recommendation per priority hierarchy]

## Observations
[Contextual-tier findings — require knowledge beyond this diff]

## Dissent Log
[Findings where specialists disagreed and how the disagreement was resolved]

## Debate Trace
[Debate mode only — thread-by-thread progression]
For each thread:
- Thread ID and initial finding
- Round-by-round responses from participating specialists
- Thread state at completion (agreed/contested/trade-off/resolved)
- Resolution method (evidence, user decision, conservative default, or budget exhaustion)

## Synthesis Trace
[For each finding: source specialist(s), grounding tier, conflict resolution method if any]
```
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

After finding resolution completes, if `Final Review Mode` is `society-of-thought` and (`Final Review Interactive` is `true`, or `smart` with significant findings remaining), enter moderator mode.

Announce moderator mode with a brief prompt: available specialists, interaction options, and how to exit.

**Interaction patterns**:

1. **Summon specialist**: User references a specialist by name (e.g., "ask the security specialist about the auth flow"). Load the specialist's persona file, compose prompt with persona + shared rules + diff + REVIEW-SYNTHESIS.md context, and spawn a subagent that responds in-character using its cognitive strategy.

2. **Challenge finding**: User disagrees with a finding and provides reasoning. Spawn the originating specialist as a subagent with its full persona, the challenged finding, and the user's counter-argument. The specialist must respond with independent evidence — anti-sycophancy rules require it to either defend with new evidence or concede with specific reasoning for why the user's argument changes the assessment.

3. **Request deeper analysis**: User asks for focused analysis on a specific code area. Select the most relevant specialist (or user-specified) and spawn as subagent with focused scope.

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
| society-of-thought | `REVIEW-{SPECIALIST}.md` per specialist, `REVIEW-SYNTHESIS.md` |

Location: `.paw/work/<work-id>/reviews/`
All files gitignored via `.gitignore` with `*` pattern.
