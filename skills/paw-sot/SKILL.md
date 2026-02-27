---
name: paw-sot
description: "Society of Thought (SoT) — multi-perspective deliberative review engine. Orchestrates specialist personas with parallel or debate interaction, confidence-weighted synthesis, and interactive moderator mode. Use for code review, plan review, design analysis, or any scenario requiring diverse expert perspectives."
---

# Society of Thought Engine

> **Execution Context**: This skill is **loaded into the calling agent's session** (not spawned as a subagent), preserving user interactivity for trade-off decisions and moderator mode.

Scenario-agnostic orchestration engine for multi-perspective deliberative review. Discovers specialist personas, spawns them as subagents against review targets, orchestrates parallel or debate interaction, and produces confidence-weighted synthesis.

## Capabilities

- Specialist discovery with 4-level precedence (workflow → project → user → built-in)
- Adaptive specialist selection based on content analysis
- Parallel and debate interaction modes
- Context-adaptive framing for code, artifact, or freeform review targets
- Confidence-weighted synthesis with grounding validation
- Post-synthesis moderator mode for deeper specialist engagement

## Review Context Input Contract

The calling skill provides a **review context** describing what to review and how to orchestrate:

| Field | Required | Values | Description |
|-------|----------|--------|-------------|
| `type` | yes | `diff` \| `artifacts` \| `freeform` | What kind of content is being reviewed |
| `coordinates` | yes | diff range, artifact paths, or content description | What to point specialists at |
| `output_dir` | yes | directory path | Where to write REVIEW-*.md files |
| `specialists` | no | `all` (default) \| comma-separated names \| `adaptive:<N>` | Which specialists to invoke |
| `interaction_mode` | yes | `parallel` \| `debate` | How specialists interact |
| `interactive` | yes | `true` \| `false` \| `smart` | Whether to pause for user decisions on trade-offs |
| `specialist_models` | no | `none` \| model pool \| pinned pairs \| mixed | Model assignment for specialists |
| `framing` | no | free text | Caller-provided preamble for `freeform` type |
| `perspectives` | no | `none` \| `auto` (default) \| comma-separated names | Which perspective overlays to apply |
| `perspective_cap` | no | positive integer (default `2`) | Max perspective overlays per specialist |

## Context-Adaptive Preambles

Before composing specialist prompts, inject a type-dependent preamble that frames how the specialist should interpret its cognitive strategy and domain for the review target.

**Type `diff`** (code/implementation review):
> You are reviewing implementation changes (code diff). Apply your cognitive strategy and domain expertise to the actual code changes. Look for bugs, security issues, performance problems, pattern violations, and correctness gaps in the diff. Cite specific file paths and line numbers.

**Type `artifacts`** (design/planning review):
> You are reviewing design and planning documents, not code. Apply your cognitive strategy to design decisions, architectural choices, and unstated assumptions. Your domain expertise should evaluate whether the planned approach is sound — look for gaps in reasoning, missing edge cases, feasibility risks, and cross-concern conflicts. Reference specific sections and claims in the documents rather than code lines.

**Type `freeform`**:
> Use the caller-provided `framing` field content as the preamble. If no `framing` provided, use a neutral framing: "You are reviewing the provided content. Apply your cognitive strategy and domain expertise to identify issues, risks, and opportunities for improvement."

## Specialist Discovery

Discover specialist personas at 4 precedence levels (most-specific-wins for name conflicts):

1. **Workflow**: Parse `specialists` from the review context — if an explicit comma-separated list, resolve only those names
2. **Project**: Scan `.paw/personas/<name>.md` files in the repository
3. **User**: Scan `~/.paw/personas/<name>.md` files
4. **Built-in**: Scan `references/specialists/<name>.md` files (excluding `_shared-rules.md`)

Resolution rules:
- If `specialists` is `all` (default): include all discovered specialists from all levels
- If a fixed list (e.g., `security, performance, testing`): resolve each name against discovered specialists, most-specific-wins
- If `adaptive:<N>`: discover all, then select N most relevant (see Adaptive Selection below)
- Same filename at project level overrides user level overrides built-in
- Skip malformed or empty specialist files with a warning; continue with remaining roster
- If zero specialists found after discovery, fall back to built-in defaults with a warning

## Adaptive Selection

When `specialists` is `adaptive:<N>`, select the N most relevant specialists from the full discovered roster based on content analysis.

**Selection process**:
1. Analyze the review target to identify dominant change categories — file types, affected subsystems, nature of changes (new logic, refactoring, config, API surface, data handling, test coverage)
2. For each discovered specialist, assess relevance by matching the specialist's cognitive strategy and domain against the identified change categories
3. Select up to N specialists with the highest relevance to the actual changes
4. Document selection rationale in the REVIEW-SYNTHESIS.md `Selection rationale` field (e.g., "Selected security, performance, testing — diff adds new API endpoint with database queries and no test coverage")

**Edge cases**:
- If N ≥ number of available specialists, include all (equivalent to `all`)
- If the review target is trivial (e.g., single typo fix, comment-only changes), report the condition to the calling context — the caller decides whether to proceed or fall back to a simpler review mode
- If adaptive selection would select 0 specialists (no strong relevance signal):
  - **Interactive mode** (`interactive: true`): Present the user with options — proceed with all specialists, specify which to include, or report the condition to the calling context for fallback
  - **Non-interactive mode** (`interactive: false` or `smart`): Report the condition to the calling context — the caller decides how to proceed

**Compatibility**: Adaptive selection is orthogonal to interaction mode — works with both `parallel` and `debate`.

## Perspective Discovery

When `perspectives` is not `none`, discover perspective overlay files at 4 precedence levels (mirroring specialist discovery):

1. **Workflow**: Parse `perspectives` from review context — if explicit comma-separated list, resolve only those names
2. **Project**: Scan `.paw/perspectives/<name>.md` files in the repository
3. **User**: Scan `~/.paw/perspectives/<name>.md` files
4. **Built-in**: Scan `references/perspectives/<name>.md` files

Resolution rules (parallel to specialist discovery):
- Most-specific-wins for name conflicts (project overrides user overrides built-in)
- Skip malformed perspective files (missing required sections) with a warning; continue with remaining roster
- Unknown names: if a name in the comma-separated list matches no discoverable perspective file, warn and skip — consistent with specialist discovery's malformed-file handling
- `none` → skip discovery entirely; engine behaves identically to current implementation with no perspective-related processing
- `auto` → discover all perspectives, then select based on artifact signals (see Perspective Auto-Selection)

## Perspective Auto-Selection

When `perspectives` is `auto`, analyze the review target and select up to `perspective_cap` perspectives per specialist:

- Analyze artifact type, file types touched, affected subsystems, and estimated complexity
- **Temporal perspectives** (premortem, retrospective): relevant for code changes with operational implications, scaling concerns, dependency management, or long-term maintenance impact
- **Adversarial perspectives** (red-team): relevant for changes touching trust boundaries, external interfaces, authentication, authorization, or data handling
- If no perspectives meet relevance threshold: select the built-in `baseline` perspective and note in synthesis

Selection is budget-aware: total subagent calls = specialists × assigned perspectives. The `perspective_cap` bounds per-specialist perspective count.

## Prompt Composition

Compose the review prompt for each specialist subagent from up to five layers:

1. **Shared rules** — load `references/specialists/_shared-rules.md` once per review run (anti-sycophancy rules, confidence scoring, Toulmin output format)
2. **Context preamble** — inject the type-dependent preamble (see Context-Adaptive Preambles above) to frame the specialist's review lens
3. **Specialist content** — load the discovered specialist `.md` file (identity, cognitive strategy, behavioral rules, demand rationale, examples)
4. **Perspective overlay** — when a perspective is assigned, load the perspective file, resolve `{specialist}` placeholder with the specialist's name, and inject as evaluative lens framing. The overlay template includes the `**Perspective**` field instruction for Toulmin output attribution. When no perspective is assigned (`perspectives: none`), skip this layer entirely — composition is identical to the pre-change 4-layer model.
5. **Review coordinates** — review target location (diff range, artifact paths, or content description) and output directory so the subagent can self-gather context via `git diff`, `view`, and `grep`

**Prompt budget overflow**: If the composed prompt approaches model context limits, the perspective overlay (layer 4) is the first candidate for truncation, preserving specialist identity and review coordinates. A warning is emitted when truncation occurs. Given overlays are 50–100 words, this edge case is unlikely in practice.

If a specialist file contains `shared_rules_included: true` in its YAML frontmatter, skip shared rules injection to avoid duplication. Otherwise, always inject shared rules.

Replace `[specialist-name]` in the shared rules output format with the specialist's actual name (e.g., `security`, `performance`).

## Execution

Execution depends on `interaction_mode`:

### Parallel Mode (default)

Spawn parallel subagents using `task` tool with `agent_type: "general-purpose"`. For each specialist (and each assigned perspective):
- Compose prompt: shared rules + context preamble + specialist content + perspective overlay (if assigned) + review coordinates
- Resolve model using precedence chain (see Model Assignment below)
- Instruct the subagent to write its Toulmin-structured findings directly to the output directory:
  - **With perspective**: `REVIEW-{SPECIALIST-NAME}-{PERSPECTIVE}.md`
  - **Without perspective** (`perspectives: none`): `REVIEW-{SPECIALIST-NAME}.md` (backward compatible)
- Each subagent's findings are attributed to the perspective that framed its review
- The orchestrator receives only a brief completion status (success/failure, finding count) — NOT the full findings content

When perspectives are active, each specialist runs once per assigned perspective. With 2 perspectives selected, a specialist runs twice (once per perspective), producing separate review files.

**Model Assignment**: Resolve the model for each specialist using this precedence (most-specific-wins):

1. **Specialist frontmatter**: If the specialist `.md` file contains a `model:` field in YAML frontmatter, use that model
2. **Pinned assignment**: If `specialist_models` contains a `specialist:model` pair matching this specialist name, use the pinned model
3. **Model pool**: If `specialist_models` contains unpinned model names, distribute them round-robin across unpinned specialists (sort specialists alphabetically, cycle through pool list)
4. **Session default**: If none of the above apply, use the session's default model

If a specified model is unavailable or invalid, fall back to session default with a user-visible warning.

Log the specialist→model assignment map at review start so users can verify the distribution.

After all specialists complete, proceed to synthesis.

### Debate Mode

Thread-based multi-round debate where findings become discussion threads with point/counterpoint exchanges. Produces richer evidence than parallel mode at the cost of more subagent calls.

**Edge case**: If only 1 specialist is selected, skip debate and use parallel mode (debate requires ≥2 specialists).

**Round 1 (Initial sweep)**: Run all specialists in parallel (same as parallel mode, including perspective-aware execution if perspectives are active). Each finding becomes a **thread** with state `open`. When perspectives are active, perspective-variant findings from the same specialist participate as distinct positions — thread attribution includes both specialist name and perspective name.

**Rounds 2–3 (Threaded responses)**: After each round, the synthesis agent (operating as PR triage lead) generates a **round summary** organized by thread:
- For each thread: current state (`open`, `agreed`, `contested`), summary of positions, open questions
- When perspectives are active, explicitly contrast findings across different perspectives from the same specialist to ensure the debate loop addresses intra-specialist perspective disagreements
- This summary is the only inter-specialist communication (hub-and-spoke — specialists never see each other's raw findings)

Re-run specialists with: shared rules + context preamble + specialist content + perspective overlay (if assigned) + review coordinates + round summary (embedded — this is the only new information per round). Specialists can:
- Refine their position on existing threads (cite thread ID)
- Respond to summarized counterarguments
- Add new threads (new findings become new `open` threads)

Each specialist appends round output to its existing review file (`REVIEW-{SPECIALIST-NAME}.md` or `REVIEW-{SPECIALIST-NAME}-{PERSPECTIVE}.md` when perspectives are active).

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

## Synthesis

Spawn a synthesis subagent (`agent_type: "general-purpose"`) that reads all `REVIEW-*.md` files in the output directory (covering both `REVIEW-{SPECIALIST}.md` and `REVIEW-{SPECIALIST}-{PERSPECTIVE}.md` patterns) directly via `view` tool and produces `REVIEW-SYNTHESIS.md`. The orchestrator sees only the final synthesis output.

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

**Perspective-aware synthesis** (when perspectives are active):
- Preserve `**Perspective**` attribution from specialist findings — each finding in the synthesis includes the perspective field from the source
- When merging findings from different perspectives on the same specialist, treat perspective-attributed findings as distinct positions even if they address the same code location
- **Parallel mode conflict handling**: Inter-perspective conflicts on the same specialist are surfaced with both positions and their perspective context, flagged as "high-signal perspective disagreement" in the Dissent Log
- **Debate mode conflict handling**: Perspective-variant findings participate in debate as distinct positions; when synthesizing round summaries, explicitly contrast findings across different perspectives from the same specialist
- Findings attributed to `baseline` were produced using the built-in baseline perspective (no evaluative frame shift)

**REVIEW-SYNTHESIS.md structure**:

The Finding sections (Must-Fix, Should-Fix, Consider) are the actionable items presented during interactive resolution. Trade-offs are resolved as part of findings when the user makes a decision. Observations, Dissent Log, Debate Trace, and Synthesis Trace are reference sections — they document the review process but are not presented as individual resolution items.

```markdown
# REVIEW-SYNTHESIS.md

## Review Summary
- Mode: society-of-thought (parallel | debate)
- Specialists: [list of participating specialists]
- Perspectives: [list of perspectives applied, or "none"]
- Perspective cap: [configured cap value]
- Selection rationale: [if adaptive mode was used]
- Rounds: [number of rounds completed, debate mode only]
- Threads: [total threads, agreed/contested/trade-off/resolved counts, debate mode only]

## Perspective Diversity
- Perspectives applied: [perspective-name → specialist list, for each active perspective]
- Selection mode: [auto | guided | none]
- Selection rationale: [if auto, why these perspectives were chosen for this artifact]
- Perspectives skipped: [if any, name + reason (cap, relevance threshold)]

## Must-Fix Findings
[Findings with severity: must-fix, each with specialist attribution, confidence, grounding tier]

## Should-Fix Findings
[Findings with severity: should-fix]

## Consider
[Findings with severity: consider]

## Trade-offs Requiring Decision
[Unresolved trade-offs — presented to user during finding resolution in interactive/smart mode, resolved via priority hierarchy in auto mode. Once resolved, the decision is recorded in the corresponding finding.]

## Observations
[Contextual-tier findings — beyond this diff, not presented during resolution. Retained as reference for future work.]

## Dissent Log
[Findings where specialists disagreed and how the disagreement was resolved. Includes inter-perspective disagreements (same specialist, different perspectives) flagged as high-signal perspective conflicts.]

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

## Output Artifacts

Create `.gitignore` with content `*` in the output directory (if not already present).

| Review Type | Files Created |
|-------------|---------------|
| All modes, no perspectives | `REVIEW-{SPECIALIST-NAME}.md` per specialist |
| All modes, with perspectives | `REVIEW-{SPECIALIST-NAME}-{PERSPECTIVE}.md` per specialist-perspective pair |
| All modes | `REVIEW-SYNTHESIS.md` |

Location: review context's `output_dir`.

## Moderator Mode

> **Invocation**: Moderator mode is a **separate invocation** from orchestration+synthesis. The calling skill invokes paw-sot once for orchestration and synthesis, handles its own resolution flow (apply/skip/discuss), then invokes paw-sot again for moderator mode if conditions are met. The calling skill provides the review context `type`, `output_dir` (containing individual specialist reviews and REVIEW-SYNTHESIS.md), and review coordinates.

After the calling skill completes finding resolution, moderator mode enables deeper interactive engagement with specialist personas.

Announce moderator mode with a brief prompt: available specialists, interaction options, and how to exit.

**Interaction patterns**:

1. **Summon specialist**: User references a specialist by name (e.g., "ask the security specialist about the auth flow"). Load the specialist's persona file, compose prompt with persona + shared rules + context preamble + review coordinates + REVIEW-SYNTHESIS.md context, and spawn a subagent that responds in-character using its cognitive strategy.

2. **Challenge finding**: User disagrees with a finding and provides reasoning. Spawn the originating specialist as a subagent with its full persona, the challenged finding, and the user's counter-argument. The specialist must respond with independent evidence — anti-sycophancy rules require it to either defend with new evidence or concede with specific reasoning for why the user's argument changes the assessment.

3. **Request deeper analysis**: User asks for focused analysis on a specific code area. Select the most relevant specialist (or user-specified) and spawn as subagent with focused scope.

**Exit**: User says "done", "continue", or "proceed" to exit moderator mode.

**Skip condition**: If `interactive` is `false`, no findings exist, or `interactive` is `smart` with no significant findings (only `consider`-tier), skip moderator mode entirely.
