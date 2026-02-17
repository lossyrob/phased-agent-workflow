# Feature Specification: Extract Society of Thought (SoT) Engine into paw-sot Skill

**Branch**: feature/extract-sot-engine  |  **Created**: 2026-02-17  |  **Status**: Draft
**Input Brief**: Extract the SoT orchestration engine from paw-final-review into a reusable paw-sot skill, making paw-final-review a thin adapter.

## Overview

The Society of Thought (SoT) orchestration engine — specialist discovery, debate, synthesis, and moderator mode — is currently embedded within the `paw-final-review` skill. This tight coupling prevents reuse in other scenarios where multi-perspective deliberative review would be valuable: planning document review, external PR review, and ad-hoc user-initiated analysis.

This feature extracts the SoT machinery into a standalone `paw-sot` skill that any calling context can load with a scenario-agnostic review context describing what to review. The `paw-final-review` skill becomes a thin adapter that gathers diff/spec/plan context, constructs a review context, and delegates to `paw-sot`. Specialist persona files move from `paw-final-review` to `paw-sot`, becoming a shared roster available to all future scenarios.

The extraction preserves all existing SoT behavior — specialist discovery with 4-level precedence, parallel and debate interaction modes, confidence-weighted synthesis, model assignment, and interactive moderator mode — while introducing a context-adaptive framing mechanism so specialists can review non-code artifacts (plans, specs, designs) without needing per-scenario persona variants.

## Objectives

- Enable any PAW skill or user to invoke SoT deliberation on arbitrary review targets without coupling to final review
- Preserve all existing SoT behavior identically after extraction (zero behavioral regression)
- Establish a review context abstraction that cleanly separates "what to review" from "how to orchestrate review"
- Support context-adaptive specialist framing so code-oriented personas can meaningfully review non-code artifacts
- Make `paw-final-review` a thin adapter that delegates orchestration to `paw-sot`

## User Scenarios & Testing

### User Story P1 – SoT Engine Invocation via Review Context
Narrative: A calling skill (e.g., paw-final-review) needs multi-perspective deliberative review. It constructs a review context describing the review targets, output location, specialist selection, and interaction mode, then loads paw-sot. The engine discovers specialists, spawns them against the targets, orchestrates debate if configured, and produces synthesis output.
Independent Test: Load paw-sot with a review context specifying diff-type review targets and verify specialist review files and synthesis are produced in the output directory.
Acceptance Scenarios:
1. Given a review context with type "diff" and coordinates pointing to a valid diff range, When paw-sot executes with parallel interaction, Then REVIEW-{SPECIALIST}.md files are created for each selected specialist and REVIEW-SYNTHESIS.md is produced
2. Given a review context with type "diff" and debate interaction mode, When paw-sot executes, Then specialists engage in threaded debate rounds before synthesis
3. Given a review context with type "artifacts" pointing to Spec.md and ImplementationPlan.md, When paw-sot executes, Then specialists review the artifacts with context-appropriate framing

### User Story P2 – Specialist Discovery and Selection
Narrative: When paw-sot runs, it discovers available specialists from a 4-level precedence chain (workflow → project → user → built-in) and selects which to invoke based on the review context's specialist configuration (all, explicit list, or adaptive selection).
Independent Test: Configure a review context with `specialists: adaptive:3` and verify that exactly 3 specialists are selected based on content relevance.
Acceptance Scenarios:
1. Given no custom specialist overrides, When paw-sot discovers specialists, Then built-in specialists from paw-sot/references/specialists/ are used
2. Given `specialists: all` in the review context, When paw-sot runs, Then all discovered specialists are invoked
3. Given `specialists: [security, architecture]` in the review context, When paw-sot runs, Then only those two specialists are invoked
4. Given `specialists: adaptive:3` in the review context, When paw-sot runs, Then exactly 3 specialists are selected based on content analysis

### User Story P3 – paw-final-review as Thin Adapter
Narrative: When the PAW agent invokes paw-final-review with society-of-thought mode, the skill gathers implementation context (diff, spec, plan, research), constructs a review context, and delegates to paw-sot. Post-synthesis interactive resolution (apply/skip/discuss) remains in paw-final-review.
Independent Test: Invoke paw-final-review in society-of-thought mode and verify it delegates to paw-sot, producing identical output to the pre-extraction behavior.
Acceptance Scenarios:
1. Given paw-final-review invoked in society-of-thought mode, When it executes, Then it constructs a diff-type review context and delegates orchestration to paw-sot
2. Given paw-sot returns synthesis findings to paw-final-review, When interactive mode is enabled, Then paw-final-review presents findings for apply/skip/discuss resolution
3. Given existing WorkflowContext.md configuration fields (Final Review Specialists, Final Review Interaction Mode, etc.), When paw-final-review constructs the review context, Then these fields are mapped to review context parameters

### User Story P4 – Context-Adaptive Specialist Framing
Narrative: When specialists review non-code artifacts (plans, specs), the SoT engine injects a review context preamble based on the review context type. This tells specialists to apply their cognitive strategies to design decisions and assumptions rather than code, without modifying the specialist persona files themselves.
Independent Test: Invoke paw-sot with type "artifacts" and verify the specialist prompt includes a context preamble that reframes the review task for non-code artifacts.
Acceptance Scenarios:
1. Given a review context with type "diff", When the engine composes specialist prompts, Then the preamble frames the task as code/implementation review
2. Given a review context with type "artifacts", When the engine composes specialist prompts, Then the preamble frames the task as design/planning review, directing cognitive strategies toward design decisions and assumptions
3. Given a review context with type "freeform", When the engine composes specialist prompts, Then the preamble uses the user-provided framing

### User Story P5 – Moderator Mode
Narrative: After synthesis is complete and findings are presented, the user can enter moderator mode to summon specific specialists for deeper analysis, challenge findings, or request cross-specialist dialogue on contested points.
Independent Test: After synthesis completes, summon a specialist by name and verify the specialist responds with deeper analysis on the requested topic.
Acceptance Scenarios:
1. Given synthesis is complete and interactive mode is enabled, When the user summons a specialist by name, Then that specialist provides deeper analysis
2. Given a contested finding in synthesis, When the user challenges the finding, Then relevant specialists re-examine and respond
3. Given moderator mode, When the user requests cross-specialist dialogue, Then the specified specialists engage in focused exchange

### Edge Cases
- Review context with empty coordinates: engine reports error and does not proceed
- Specialist referenced by name but not found in any discovery level: engine reports missing specialist and continues with available ones
- All specialists agree on a finding: synthesis reports high-confidence consensus without artificial dissent
- Debate fails to converge after maximum rounds: synthesis proceeds with contested status preserved
- Model specified for specialist is unavailable: falls back to model pool or default per existing precedence chain

## Requirements

### Functional Requirements
- FR-001: paw-sot skill exists at `skills/paw-sot/SKILL.md` with complete SoT orchestration engine documentation (Stories: P1)
- FR-002: paw-sot accepts a review context with fields: type (diff|artifacts|freeform), coordinates, output_dir, specialists, interaction_mode, interactive, specialist_models, and optional framing (for freeform type — provides caller-specified preamble content) (Stories: P1, P4)
- FR-003: Specialist discovery follows 4-level precedence: workflow-level → project-level → user-level → built-in (Stories: P2)
- FR-004: Specialist selection supports three modes: all, explicit list, and adaptive selection with configurable count (Stories: P2)
- FR-005: Parallel interaction mode spawns all selected specialists concurrently and collects results (Stories: P1)
- FR-006: Debate interaction mode orchestrates multi-round threaded discussion with adaptive termination (Stories: P1)
- FR-007: Synthesis merges findings by code/artifact location, classifies disagreements, validates grounding, and applies confidence-weighted aggregation (Stories: P1)
- FR-008: Context-adaptive preamble injected into specialist prompts based on review context type field (Stories: P4)
- FR-009: Moderator mode enables post-synthesis interactive specialist engagement. paw-sot exposes moderator mode as a separate invocation entry point: the calling skill invokes paw-sot once for orchestration+synthesis, handles resolution itself, then invokes paw-sot again for moderator mode with synthesis output path and review coordinates (Stories: P5)
- FR-010: Specialist persona files relocated from paw-final-review/references/specialists/ to paw-sot/references/specialists/ (Stories: P1, P2)
- FR-011: paw-final-review delegates to paw-sot when mode is society-of-thought, constructing review context from WorkflowContext.md fields and implementation artifacts. paw-final-review invokes paw-sot twice: once for orchestration+synthesis, then after resolution for moderator mode (Stories: P3)
- FR-012: paw-final-review retains post-synthesis interactive resolution (apply/skip/discuss) and single-model/multi-model modes (Stories: P3)
- FR-013: Model assignment follows existing precedence: specialist frontmatter → pinned assignment → model pool → default (Stories: P1, P2)
- FR-014: Output artifacts (REVIEW-{SPECIALIST}.md, REVIEW-SYNTHESIS.md) written to review context's output_dir (Stories: P1)

### Key Entities
- **Review Context**: The input contract for paw-sot — describes what to review, where to write output, and orchestration preferences
- **Specialist Persona**: A domain expert identity with backstory, cognitive strategy, domain boundary, and behavioral rules
- **Review Context Preamble**: A type-dependent framing injected into specialist prompts to adapt code-oriented personas for non-code review

### Cross-Cutting / Non-Functional
- Extraction must preserve all existing SoT behavior with zero behavioral regression
- paw-sot is loaded into the calling agent's session (not spawned as a subagent) to preserve interactivity
- Specialist persona files are skill-internal resources accessed via filesystem tools

## Success Criteria
- SC-001: paw-sot skill can be loaded and invoked with a diff-type review context, producing specialist reviews and synthesis output (FR-001, FR-002, FR-005, FR-007, FR-014)
- SC-002: All SoT engine sections from paw-final-review are present in paw-sot with no content loss; paw-final-review constructs a complete review context mapping all WorkflowContext fields; existing integration tests pass without regression (FR-011, FR-012)
- SC-003: Specialist personas are discoverable from paw-sot/references/specialists/ and the 4-level precedence chain works correctly (FR-003, FR-010)
- SC-004: Review context with type "artifacts" causes specialists to receive artifact-appropriate framing preamble (FR-008)
- SC-005: Adaptive specialist selection correctly identifies relevant specialists based on content analysis (FR-004)
- SC-006: Debate mode produces threaded multi-round discussion before synthesis (FR-006)
- SC-007: Moderator mode allows post-synthesis specialist engagement (FR-009)

## Assumptions
- The dependency on #201 (society-of-thought implementation) is satisfied — PR #241 provides the baseline SoT implementation in paw-final-review
- paw-planning-docs-review conversion to use paw-sot is a separate future issue (per Migration Path item 3)
- PAW Review workflow (#209) integration with paw-sot is a separate future issue (per Migration Path item 2)
- Direct user invocation ("run SoT on X") is a separate future issue (per Migration Path item 4)
- The existing WorkflowContext.md configuration fields for final review continue to work — paw-final-review reads them and maps to review context parameters

## Scope

In Scope:
- Extract SoT engine from paw-final-review/SKILL.md into paw-sot/SKILL.md
- Move specialist personas from paw-final-review/references/specialists/ to paw-sot/references/specialists/
- Define the review context input contract
- Implement context-adaptive preamble injection based on review context type
- Make paw-final-review a thin adapter that delegates to paw-sot for society-of-thought mode
- Preserve single-model and multi-model modes in paw-final-review unchanged
- Update paw-final-review to reference paw-sot for specialist discovery paths

Out of Scope:
- Converting paw-planning-docs-review to use paw-sot (future issue)
- PAW Review workflow integration with paw-sot (#209)
- Direct user invocation of paw-sot from PAW agent
- New specialist personas beyond the existing roster
- Changes to the paw-init skill or WorkflowContext.md schema
- No TypeScript source code changes (src/) — this is primarily prompt/skill-level work. Build/test infrastructure changes for file relocation are in scope.

## Dependencies
- #201 (PR #241) must be merged or its changes present on the working branch — provides the baseline SoT implementation

## Risks & Mitigations
- **Extraction breaks existing behavior**: High impact. Mitigation: Careful diff between pre/post extraction to verify all SoT sections are preserved; integration tests validate society-of-thought mode
- **Context preamble insufficient for non-code review**: Medium impact. Mitigation: Design preamble based on dogfooding observations; validate with artifacts-type review context during implementation
- **Specialist discovery paths break after relocation**: Medium impact. Mitigation: Update all path references in paw-final-review; verify discovery precedence chain in paw-sot

## References
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/242
- Dogfooding comment: https://github.com/lossyrob/phased-agent-workflow/issues/242#issuecomment-3910471106
- SoT implementation PR: #241
- Related: #209 (PAW Review workflow)
