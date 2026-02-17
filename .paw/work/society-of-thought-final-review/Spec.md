# Feature Specification: Society-of-Thought Final Review Mode

**Branch**: feature/society-of-thought-final-review  |  **Created**: 2026-02-15  |  **Status**: Draft
**Input Brief**: Add society-of-thought as a third Final Review mode using specialist personas with distinct cognitive strategies

## Overview

PAW's final review is the last quality gate before a PR is created — the moment where implementation is evaluated against the specification, patterns are checked, and risks are surfaced. Today, this review offers two modes: single-model (one model reviews with fixed criteria) and multi-model (the same review prompt sent to different models in parallel, then synthesized). Both modes provide valuable feedback, but they share a fundamental limitation: every reviewer looks at the code through the same lens, asking the same questions. The only diversity comes from differences in model architecture, not differences in perspective.

Society-of-thought changes this by introducing **perspective diversity**. Instead of one review prompt sent to one or more models, a panel of specialist personas — each with a unique identity, cognitive strategy, and value system — independently reviews the implementation. A security specialist thinks like an attacker and traces data flows through trust boundaries. A performance engineer puts numbers on every loop and calculates whether it matters at projected scale. A devil's advocate asks whether the code should exist at all. Each persona brings not just a different focus area but a fundamentally different *way of analyzing* the code.

This approach is grounded in two bodies of research. The Society of Thought paper (arXiv:2601.10825) demonstrates that reasoning quality improves when models simulate interactions between perspectives characterized by distinct personality traits and expertise. And Perspective-Based Reading research (Basili et al. 1996) shows that inspectors using different perspectives find non-overlapping defects — and that AI agents eliminate PBR's biggest human weakness (only 20% of human reviewers actually follow their assigned perspective).

The feature ships as a third Final Review mode (`society-of-thought`) alongside the existing `single-model` and `multi-model` modes. It is CLI-only for v1. Specialists are managed through a hybrid system with built-in defaults, project-level customizations, and user-level personal additions. Two interaction modes are available: parallel review with synthesis (fast, default) and structured debate with hub-and-spoke mediation (thorough, opt-in).

## Objectives

- Enable genuinely diverse code review perspectives through specialist personas with distinct cognitive strategies
- Surface findings that single-perspective reviews consistently miss (security, scalability, edge cases, maintainability)
- Provide a configurable specialist roster that teams and individuals can customize to their project's needs
- Support both fast parallel review and thorough multi-round debate interaction modes
- Allow users to participate as moderators in the review process, engaging directly with specialist perspectives
- Counter LLM sycophancy through structural anti-agreement rules built into every persona

## User Scenarios & Testing

### User Story P1 – Parallel Society-of-Thought Review
Narrative: A developer completes implementation and triggers final review. The system loads specialist personas, runs them in parallel against the diff, synthesizes findings with confidence weighting and grounding validation, and presents a unified REVIEW-SYNTHESIS.md with specialist-attributed findings organized by severity.

Independent Test: Run final review with `society-of-thought` mode on a completed implementation and verify that the REVIEW-SYNTHESIS.md contains findings attributed to multiple distinct specialists with confidence levels and severity classifications.

Acceptance Scenarios:
1. Given a completed implementation with Final Review Mode set to `society-of-thought`, When final review runs, Then each enabled specialist produces findings independently, and a synthesis step merges them into a single REVIEW-SYNTHESIS.md with specialist attribution, confidence levels, and severity classifications (must-fix, should-fix, consider).
2. Given the default built-in roster with no customization, When final review runs in parallel mode, Then all 9 built-in specialists participate and the REVIEW-SYNTHESIS.md includes findings from multiple cognitive strategies (threat modeling, quantitative estimation, Socratic questioning, boundary enumeration, narrative walkthrough, pattern recognition, coverage gap analysis, specification-implementation correspondence, release-impact analysis).
3. Given specialist findings that reference code not present in the diff, When synthesis runs, Then those findings are flagged as ungrounded and excluded or demoted in the final output.

### User Story P2 – Custom Specialist Roster
Narrative: A team working on a financial application creates a project-level specialist focused on regulatory compliance. A developer also has a personal specialist focused on API ergonomics. When final review runs, the roster combines built-in defaults with project and user specialists per the precedence rules.

Independent Test: Create a custom specialist markdown file at the project level, run final review, and verify the custom specialist participates alongside built-in defaults.

Acceptance Scenarios:
1. Given a custom specialist file at the project level (`.paw/personas/<name>.md`), When final review runs, Then the custom specialist is included in the review panel alongside built-in defaults.
2. Given a user-level specialist at `~/.paw/personas/<name>.md` and a project-level specialist with the same filename, When final review runs, Then the project-level specialist takes precedence (project overrides user).
3. Given a WorkflowContext.md that specifies `Final Review Specialists: security, edge-cases`, When final review runs in fixed selection mode, Then only those two specialists participate.

### User Story P3 – Adaptive Specialist Selection
Narrative: A developer runs final review on a change that primarily affects database queries and API endpoints. The agent analyzes the diff and selects the most relevant specialists (security, performance, edge-cases) from the available roster, up to the configured maximum.

Independent Test: Run final review in adaptive mode on a focused change and verify that the selected specialists are relevant to the change content, and the selection rationale is documented in the output.

Acceptance Scenarios:
1. Given adaptive selection mode with a max of 3 specialists, When final review runs on a diff, Then the agent selects up to 3 specialists and documents the selection rationale in REVIEW-SYNTHESIS.md.
2. Given adaptive selection mode, When final review runs, Then the agent auto-selects without prompting the user for confirmation.

### User Story P4 – Debate Interaction Mode
Narrative: A developer wants a thorough review of a critical change and enables debate mode. Specialists run sequentially; after each round, the synthesis agent summarizes findings, identifies disagreements, and poses targeted questions to specific specialists. The debate terminates when no new substantive findings emerge or after 3 rounds.

Independent Test: Run final review in debate mode and verify that the REVIEW-SYNTHESIS.md contains findings that evolved across rounds, with the synthesis showing how specialist perspectives were reconciled.

Acceptance Scenarios:
1. Given debate interaction mode, When specialists run, Then each specialist in round 2+ sees only the synthesis agent's round summary (not raw findings from other specialists — hub-and-spoke mediation).
2. Given debate mode with round 2 producing no new findings, When the synthesis agent evaluates, Then the debate terminates early (before reaching round 3).
3. Given debate mode, When all rounds complete, Then REVIEW-SYNTHESIS.md includes a section showing how disagreements between specialists were resolved.

### User Story P5 – Interactive Moderator Mode
Narrative: After the review panel produces its synthesis, the developer enters an interactive session where they can summon specific specialists for follow-up, challenge findings, or request deeper analysis on areas of concern. Specialists maintain their persona when responding.

Independent Test: After a society-of-thought review completes with `interactive: true`, summon a specialist by name and verify they respond in-character with their cognitive strategy.

Acceptance Scenarios:
1. Given a completed society-of-thought review with `Final Review Interactive: true`, When the user requests follow-up from a specific specialist, Then the specialist responds maintaining its persona identity and cognitive strategy.
2. Given a completed review, When the user challenges a finding, Then the addressed specialist must respond with independent evidence (not just agree with the challenge).
3. Given `Final Review Interactive: smart`, When findings contain must-fix items, Then interactive mode activates; when only consider items exist, Then the review completes without interactive session.

### User Story P6 – Model-per-Specialist Configuration
Narrative: A power user assigns different models to different specialists to combine perspective diversity with model-architecture diversity. The security specialist runs on Claude Opus (careful reasoning), the performance specialist on GPT (quantitative analysis).

Independent Test: Configure a specialist with a `model:` field in its markdown file, run final review, and verify that specialist runs on the specified model.

Acceptance Scenarios:
1. Given a specialist file containing a `model: claude-opus-4.6` field, When final review runs, Then that specialist's subagent is launched with the specified model.
2. Given a specialist file with no model field, When final review runs, Then that specialist uses the session's default model.

### Edge Cases
- Empty diff: Final review reports no changes to review and skips specialist execution.
- No specialists found at any precedence level: Falls back to built-in defaults (should never happen, but guard against misconfiguration).
- Specialist file is malformed or empty: Skip that specialist with a warning, continue with remaining roster.
- Adaptive mode selects zero specialists (diff too small/trivial): Report that the change is too small for society-of-thought review and suggest using single-model mode.
- Model specified in specialist file is not available: Fall back to session default model with a warning.
- Debate mode with only 1 specialist: Skip debate, run as parallel mode (debate requires multiple perspectives).
- Specialist produces no findings (all findings are "no concerns"): Include in synthesis as a positive signal — specialist provides a detailed examination rationale explaining what was analyzed and why no issues were found.

## Requirements

### Functional Requirements

- FR-001: Support `society-of-thought` as a third value for the `Final Review Mode` configuration field in WorkflowContext.md (Stories: P1)
- FR-002: Ship 9 built-in specialist personas, each with a distinct cognitive strategy, narrative backstory, behavioral rules, anti-sycophancy structural rules, and 2-3 example review comments (Stories: P1, P2)
- FR-003: Discover specialist files at 4 precedence levels — workflow (WorkflowContext.md field), project (`.paw/personas/`), user (`~/.paw/personas/`), built-in (skill-embedded) — with most-specific-wins override semantics (Stories: P2)
- FR-004: Support two specialist selection modes — fixed (explicit list) and adaptive (agent auto-selects up to N based on diff analysis) — configurable via WorkflowContext.md (Stories: P1, P3)
- FR-005: In adaptive mode, auto-select specialists without user confirmation and document selection rationale in the output artifact (Stories: P3)
- FR-006: Support two interaction modes — parallel (all specialists run independently, then synthesize) and debate (sequential rounds with hub-and-spoke mediation via synthesis agent) — configurable via WorkflowContext.md (Stories: P1, P4)
- FR-007: In parallel mode, launch specialist subagents concurrently using the `task` tool, each with its persona prompt and the shared review context (diff, spec, plan) (Stories: P1)
- FR-008: In debate mode, run rounds sequentially — specialists within each round run in parallel, but each round's findings are synthesized before the next round begins. Specialists see only the synthesis agent's round summary, not raw findings from other specialists (Stories: P4)
- FR-009: In debate mode, implement adaptive termination — stop when no new substantive findings emerge, with a hard cap of 3 global rounds. Per-thread continuation for contested threads allows up to 2 additional targeted exchanges (total cap: 5 exchanges per thread including global rounds), with an aggregate budget of 30 subagent calls across all continuation threads (Stories: P4)
- FR-010: Produce a single synthesized `REVIEW-SYNTHESIS.md` artifact in `.paw/work/<work-id>/reviews/` with specialist attribution, confidence levels, and severity classifications (Stories: P1)
- FR-011: Synthesis agent operates as a "PR triage lead" — a functional role with structural constraints (may only merge, deduplicate, classify conflicts, and flag trade-offs; must NOT generate new findings). Performs confidence-weighted aggregation, grounding validation against the actual diff, and evidence-based adjudication examining reasoning traces (Stories: P1)
- FR-012: All specialist personas include mandatory anti-sycophancy structural rules: must identify at least one substantive concern OR provide a detailed examination rationale explaining what was analyzed and why no issues were found (silence is not acceptable, but forced fabrication is worse than a thorough "no concerns" explanation); must present independent evidence before agreeing with another reviewer (Stories: P1, P4)
- FR-013: All specialist personas include a cross-cutting "demand rationale" rule: assess whether the change rationale is clear before evaluating code (Stories: P1)
- FR-014: Support optional `model:` field in specialist markdown files for per-specialist model assignment; fall back to session default when unspecified (Stories: P6)
- FR-015: In interactive mode, support moderator-style hooks: summon a specialist by name for follow-up, request deeper analysis on a specific area, challenge a finding (specialist must respond with independent evidence) (Stories: P5)
- FR-016: Map interactive behavior to existing `Final Review Interactive` config: `false` = no interaction, `true` = always interactive, `smart` = interactive when significant findings exist (Stories: P5)
- FR-017: Add society-of-thought configuration fields to `paw-init` with sensible defaults (Stories: P1, P2, P3, P4)
- FR-018: Specialist markdown files use free-form format — file name serves as identity, content is a full persona description interpreted by the agent (Stories: P2)
- FR-019: Gitignore review artifacts in `.paw/work/<work-id>/reviews/` consistent with existing final review behavior (Stories: P1)

### Key Entities

- **Specialist**: A persona definition (markdown file or built-in) containing identity, cognitive strategy, behavioral rules, anti-sycophancy rules, and optional model assignment
- **Specialist Roster**: The resolved set of specialists for a given review, assembled from 4 precedence levels and filtered by selection mode
- **REVIEW-SYNTHESIS.md**: The synthesized output artifact containing specialist-attributed findings with confidence levels and severity classifications (follows the REVIEW-* naming pattern used by all review artifacts)
- **Synthesis Agent**: The "PR triage lead" — a functional role agent (NOT neutral/persona-less, NOT a domain specialist) that merges specialist findings using confidence-weighted aggregation and grounding validation, with structural constraints preventing it from generating new findings

### Cross-Cutting / Non-Functional

- Society-of-thought mode is CLI-only for v1; VS Code environment disables society-of-thought mode with a notification directing users to issue #240 (VS Code chatSkills contribution point migration). VS Code falls back to multi-model mode when society-of-thought is configured.
- Specialist subagent execution should be parallel where possible (parallel mode) to minimize wall-clock time
- Anti-sycophancy rules are structural (mandatory behavioral constraints) not stylistic (personality suggestions)

## Success Criteria

- SC-001: Running final review with `society-of-thought` mode produces a REVIEW-SYNTHESIS.md with findings attributed to at least 2 distinct specialists, each using their defined cognitive strategy (FR-001, FR-002, FR-007, FR-010)
- SC-002: A custom specialist file placed at any of the 4 precedence levels is discovered and participates in the review when enabled (FR-003, FR-018)
- SC-003: In adaptive mode, the agent selects relevant specialists without user prompting and documents its rationale (FR-004, FR-005)
- SC-004: In debate mode, specialists in round 2+ demonstrate awareness of prior findings (via synthesis summary) without quoting other specialists' raw output (FR-008)
- SC-005: Debate mode terminates before round 3 when round N produces no new findings (FR-009)
- SC-006: REVIEW-SYNTHESIS.md synthesis excludes or demotes findings that reference code not present in the diff (FR-011)
- SC-007: Each specialist's output contains at least one substantive concern OR a detailed examination rationale explaining what was analyzed and why no issues were found (anti-sycophancy structural forcing verified — silence is not acceptable, but forced fabrication is worse) (FR-012)
- SC-008: In interactive mode, a user can summon a specialist by name and receive an in-character response with the specialist's cognitive strategy (FR-015, FR-016)
- SC-009: A specialist with a `model:` field runs on the specified model; without it, runs on the session default (FR-014)
- SC-010: The `paw-init` skill presents society-of-thought configuration options during workflow initialization (FR-017)

## Assumptions

- The existing `task` tool infrastructure supports launching 7 concurrent subagents with different prompts and optional model overrides (validated by spec research — multi-model already does this with 3)
- Free-form markdown is sufficient for persona specification without requiring structured YAML frontmatter (validated during work shaping — user preference for flexibility)
- 9 built-in specialists is the default roster size (5 per DeepMind scaling study sweet spot, plus architecture for codebase pattern fit, testing for coverage gap analysis, correctness for specification-implementation correspondence, and release-manager for deployment-path tracing)
- Built-in specialist definitions are stored as separate markdown files in `skills/paw-final-review/references/specialists/` following the [Agent Skills specification](https://agentskills.io/specification#optional-directories) `references/` directory pattern — loaded on demand when society-of-thought mode is active
- The synthesis agent operates as a "PR triage lead" functional role — not persona-less (research shows true neutrality is unachievable) but structurally constrained to only merge, deduplicate, and classify (user decision informed by synthesis research)

## Scope

In Scope:
- Third Final Review mode (`society-of-thought`) in paw-final-review skill
- 9 built-in specialist personas with full narrative backstories, cognitive strategies, behavioral rules, and example outputs
- 4-level specialist precedence discovery (workflow, project, user, built-in)
- Fixed and adaptive specialist selection modes
- Parallel and debate interaction modes
- Hub-and-spoke debate mediation with adaptive termination
- Synthesized REVIEW-SYNTHESIS.md artifact with confidence weighting and grounding validation
- Interactive moderator mode (summon, challenge, deeper analysis)
- Optional model-per-specialist configuration
- Anti-sycophancy structural rules in all personas
- Cross-cutting "demand rationale" behavioral rule
- WorkflowContext.md configuration fields and paw-init integration
- Documentation for custom specialist creation (template/scaffold guidance)

Out of Scope:
- VS Code native society-of-thought execution (future follow-up — CLI only for v1; graceful fallback to multi-model with notification is in scope as a guard clause)
- Society-of-thought for other review points (paw-impl-review, paw-planning-docs-review, PAW Review workflow)
- Per-specialist output files as final deliverables (single REVIEW-SYNTHESIS.md for v1; intermediate per-specialist files used during synthesis are implementation artifacts, not user-facing outputs)
- Automated persona drift detection or re-injection
- Combining society-of-thought with multi-model as a single mode (they remain separate modes; model-per-specialist provides partial combination)
- Specialist effectiveness metrics or scoring
- VS Code extension UI for specialist management

## Dependencies

- paw-final-review skill (existing infrastructure for review execution, artifact management, interactive resolution)
- `task` tool with `model` parameter support (existing — used by multi-model mode)
- paw-init skill (needs extension for new configuration fields)
- paw-status skill (should display society-of-thought config when active)
- Issue #200 / base Final Agent Review infrastructure (prerequisite — must be implemented)

## Risks & Mitigations

- **Sycophancy undermines specialist diversity**: RLHF training pushes models toward agreement, potentially making specialists too similar. Mitigation: Structural anti-sycophancy rules are mandatory behavioral constraints, not optional personality suggestions. Synthesis validates that specialists produced genuinely distinct findings.
- **Token cost of 5 parallel specialists**: Each specialist receives full diff + persona prompt, multiplying token usage ~5x vs single-model. Mitigation: Adaptive selection mode lets users limit to most relevant specialists; parallel mode is the default (no multi-round cost); debate mode is opt-in for when thoroughness justifies cost.
- **Persona hallucination**: Strong personas may cause specialists to "see" problems that don't exist (e.g., security persona flagging injection in code with no external input). Mitigation: Synthesis agent performs grounding validation against actual diff, excluding ungrounded findings.
- **Debate mode convergence**: Specialists may converge to agreement rather than maintaining distinct perspectives across rounds. Mitigation: Hub-and-spoke mediation (specialists see summaries, not each other's raw output) preserves independence; adaptive termination prevents pointless rounds.
- **Custom specialist quality**: User-defined specialists may be poorly written, leading to low-quality or off-topic findings. Mitigation: Documentation provides scaffold template; malformed specialists are skipped with warnings; synthesis grounding check catches off-topic findings.

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/201
- Related Issue: https://github.com/lossyrob/phased-agent-workflow/issues/209
- Research: .paw/work/society-of-thought-final-review/SpecResearch.md
- Work Shaping: .paw/work/society-of-thought-final-review/WorkShaping.md
- Research Sources: .paw/work/society-of-thought-final-review/ResearchSources.md
