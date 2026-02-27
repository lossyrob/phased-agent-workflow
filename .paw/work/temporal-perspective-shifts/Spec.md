# Feature Specification: Perspective Shifts for SoT Engine

**Branch**: feature/temporal-perspective-shifts  |  **Created**: 2026-02-27  |  **Status**: Draft
**Input Brief**: Extend the Society of Thought engine with composable perspective overlays that shift the evaluative frame of specialist personas — temporal, adversarial, or custom — to increase the diversity and coverage of review findings.

## Overview

The Society of Thought engine currently achieves review diversity through two axes: specialist domain (security, architecture, performance, etc.) and model assignment (running different specialists on different LLMs). These axes determine *who* reviews and *what capabilities* power the review. But they leave a third axis unexplored: *from what vantage point* is the specialist reviewing?

Ad hoc experimentation has shown that pairing the same specialist with different temporal framings — one reviewing as a pre-launch audit ("find the cracks before we ship") and another as a post-launch retrospective ("six months after launch, what broke?") — produces meaningfully more diverse findings than either model or persona diversity alone. This is consistent with research showing that prompt/perspective diversity explains roughly 36% of output quality variance (comparable to model diversity's 41%), and that the two axes are largely non-redundant.

Perspective shifts formalize this observation into a composable engine-level feature. A perspective is an evaluative lens — a set of temporal constraints, scenario assumptions, and novelty directives — that layers onto an existing specialist persona without replacing its identity. The security specialist remains the security specialist; the perspective changes *when* and *under what conditions* they're evaluating. This is analogous to the cognitive science technique of prospective hindsight (premortem), which has been shown to increase the breadth and actionability of failure-mode identification in both human and LLM-assisted evaluation.

The feature applies to all SoT usages (final review, plan review, freeform) as an engine-level capability. It ships with three built-in perspective presets and a discovery mechanism for custom perspectives, giving users a three-tier configuration model: automatic selection, guided presets, and expert-defined custom perspectives.

## Objectives

- Enable the SoT engine to produce more diverse findings by varying the evaluative frame independently of specialist identity and model assignment
- Provide built-in temporal and adversarial perspective presets that work out of the box with existing specialists
- Support user-defined custom perspectives that compose with any specialist persona
- Integrate perspective selection into the existing budget-aware adaptive specialist selection, preventing combinatorial explosion
- Preserve specialist identity coherence when perspectives are applied — the lens shifts, the expert does not change
- Leverage existing interaction mode semantics for handling inter-perspective conflicts (parallel → surface; debate → resolve through cross-examination)

## User Scenarios & Testing

### User Story P1 – Automatic Perspective Diversification

Narrative: A developer runs a final review on a PR. The SoT engine automatically selects relevant perspectives based on the artifact type and applies them to the chosen specialists. The review surfaces findings that wouldn't appear under standard present-tense evaluation — for example, a post-mortem perspective on the security specialist flags a dependency trust boundary that only becomes exploitable after months of dependency churn.

Independent Test: Run a review with perspectives enabled and verify the output includes findings tagged with their perspective origin that do not appear in a baseline (no-perspective) run.

Acceptance Scenarios:
1. Given a diff review with perspectives set to `auto`, When the engine runs, Then each selected specialist is augmented with 1–2 perspectives chosen based on artifact signals, and each finding in the output is tagged with its source perspective.
2. Given a simple artifact (e.g., documentation change), When the engine runs with perspectives `auto`, Then the engine applies zero or one perspective (not the full set), respecting the budget-aware selection.
3. Given perspectives set to `none`, When the engine runs, Then behavior is identical to the current SoT engine with no perspective overlays applied.

### User Story P2 – Guided Perspective Selection

Narrative: A tech lead wants to run a "ship readiness" review before a release. They configure the SoT review with a perspective preset pack that applies premortem and red-team perspectives to all specialists. The review output is organized by perspective, making it easy to see what risks each lens surfaced.

Independent Test: Specify a named perspective preset and verify the engine applies exactly those perspectives to the selected specialists.

Acceptance Scenarios:
1. Given a review context with `perspectives: premortem, red-team`, When the engine runs, Then each specialist runs once per specified perspective, and findings are tagged with perspective names. (Baseline is available as a built-in perspective `baseline` that applies no evaluative shift.)
2. Given a perspective name that doesn't match any discovered perspective file, When the engine runs, Then it warns about the unknown perspective and continues with discovered perspectives only.

### User Story P3 – Custom Perspective Definition

Narrative: A platform team defines a custom perspective for their domain — "regulatory compliance review" — as a perspective file in their repository. When the SoT engine runs, it discovers and applies this custom perspective alongside built-in presets.

Independent Test: Place a custom perspective file in `.paw/perspectives/` and verify the engine discovers and applies it to specialists.

Acceptance Scenarios:
1. Given a perspective file at `.paw/perspectives/compliance.md` with valid schema, When the engine discovers perspectives, Then it includes "compliance" in the available perspective roster.
2. Given a custom perspective at project level and a built-in perspective with the same name, When the engine discovers perspectives, Then the project-level perspective takes precedence (most-specific-wins).
3. Given a malformed perspective file (missing required fields), When the engine discovers perspectives, Then it skips the file with a warning and continues with remaining perspectives.

### User Story P4 – Perspective-Attributed Findings in Synthesis

Narrative: After a review completes, the developer reads the synthesis and can see which perspective surfaced each finding. When two perspectives on the same specialist produce conflicting assessments, the synthesis presents both positions with their temporal context rather than silently picking a winner.

Independent Test: Run a review where perspectives produce a conflicting assessment and verify both appear in the synthesis with perspective attribution.

Acceptance Scenarios:
1. Given a completed review with multiple perspectives, When the synthesis is generated, Then each finding includes a `perspective` attribution field identifying which lens surfaced it.
2. Given parallel mode with conflicting findings from different perspectives on the same specialist, When synthesis runs, Then both findings appear with their perspective context and the conflict is flagged as a high-signal disagreement.
3. Given debate mode with conflicting perspective findings, When debate rounds execute, Then perspective-variant findings participate in the debate and conflicts are resolved through cross-examination.

### User Story P5 – Configurable Perspective Cap

Narrative: A user wants tighter control over review cost. They set the perspective cap to 1 (instead of the default 2) to limit the number of perspective overlays per specialist, reducing the total number of subagent calls.

Independent Test: Set `perspective_cap` to 1 and verify no specialist runs more than one perspective overlay.

Acceptance Scenarios:
1. Given `perspective_cap: 1` in the review context, When the engine runs with `auto` perspectives, Then each specialist runs with at most 1 perspective overlay.
2. Given `perspective_cap: 3` in the review context, When the engine runs, Then up to 3 perspectives may be applied per specialist (subject to novelty stopping).

### Edge Cases

- **Single specialist selected**: Perspectives still apply — a single specialist with 2 perspectives produces 2 review runs.
- **Zero perspectives discovered**: Engine proceeds with standard (no-perspective) review and logs a warning.
- **All perspectives pruned by adaptive selection**: Engine selects the built-in `baseline` perspective and notes in synthesis that no other perspectives met relevance threshold.
- **Perspective overlay exceeds prompt budget**: If the specialist persona + perspective overlay + shared rules exceed model context limits, truncate the perspective overlay with a warning rather than dropping the specialist.
- **Custom perspective references nonexistent parameters**: Engine applies the perspective with available parameters and warns about unresolvable parameter references.

## Requirements

### Functional Requirements

- FR-001: The SoT engine accepts a `perspectives` field in the review context input contract with values: `none`, `auto` (default), or comma-separated perspective names. *(Preset pack names are deferred to post-v1; see Future Work.)* (Stories: P1, P2)
- FR-002: The SoT engine accepts a `perspective_cap` field in the review context input contract (positive integer, default 2) controlling the maximum number of perspective overlays applied per specialist. (Stories: P5)
- FR-003: The engine discovers perspective files at four precedence levels — workflow, project (`.paw/perspectives/`), user (`~/.paw/perspectives/`), built-in (`references/perspectives/`) — using most-specific-wins for name conflicts, parallel to existing specialist discovery. (Stories: P3)
- FR-004: Each perspective file defines: name, lens type, parameters, a prompt overlay template, and a novelty constraint directive. The overlay template supports a `{specialist}` placeholder resolved at composition time. (Stories: P3)
- FR-005: Three built-in perspectives ship with the engine: **premortem** (prospective hindsight / future failure analysis), **retrospective** (post-production operational review), and **red-team** (adversarial exploitation analysis). (Stories: P1, P2)
- FR-006: When `perspectives` is `auto`, the engine selects perspectives based on artifact signals — review type, file types touched, subsystems affected, estimated complexity — applying up to `perspective_cap` overlays per specialist. (Stories: P1)
- FR-007: Perspectives compose additively with specialist personas without modifying the specialist's domain, cognitive strategy, or backstory. The perspective overlay shifts the evaluative frame while preserving the specialist's identity and reasoning approach. (Stories: P1, P2, P3)
- FR-008: Each finding in specialist output and in the synthesis includes a `perspective` attribution field identifying which perspective lens surfaced it. The `**Perspective**` field instruction is embedded in each perspective's overlay template (layer 4), so it is physically absent when `perspectives: none`. The built-in `baseline` perspective produces findings attributed as `baseline`. (Stories: P4)
- FR-009: In parallel mode, inter-perspective conflicts on the same specialist are surfaced in the synthesis with both positions and their temporal/contextual framing, flagged as high-signal disagreements. (Stories: P4)
- FR-010: In debate mode, perspective-variant findings from the same specialist participate in the debate rounds and conflicts are resolved through the existing cross-examination mechanism. (Stories: P4)
- FR-011: *(Deferred to post-v1.)* The engine applies adaptive novelty-based stopping — if a perspective overlay produces findings exceeding a configurable similarity threshold against the baseline or prior perspectives, subsequent perspectives may be skipped even if `perspective_cap` allows more. In v1, `perspective_cap` serves as the hard limit and the engine relies on prompt-driven reasoning for novelty assessment. A configurable threshold will be added after v1 usage data informs sensible defaults. (Stories: P1, P5)
- FR-012: When `perspectives` is `none`, the engine behaves identically to the current implementation with no perspective-related processing. (Stories: P1)
- FR-013: The REVIEW-SYNTHESIS.md output includes a "Perspective Diversity" section documenting which perspectives were applied to which specialists, the selection rationale (for auto mode), and any perspectives skipped due to novelty stopping or cap limits. (Stories: P1, P4)

### Key Entities

- **Perspective**: A composable evaluative lens defined as a file with schema (name, type, parameters, overlay template, novelty constraint). Applied as a prompt overlay to specialist personas at review time.
- **Perspective Preset Pack**: A named collection of perspectives (e.g., "ship-readiness" = premortem + red-team) that can be referenced by name in configuration.

### Cross-Cutting / Non-Functional

- Perspective discovery must complete in under 1 second (filesystem scan, not network).
- The feature must not alter review output when `perspectives: none` is set — backward compatibility with existing SoT behavior is mandatory.

## Success Criteria

- SC-001: *(Post-v1 empirical validation goal.)* A review run with `perspectives: auto` produces at least 15% more unique semantic finding clusters than an equivalent run with `perspectives: none` on the same artifact, as measured by embedding-based clustering of findings. *(For v1, validated qualitatively: a review with perspectives enabled produces findings attributed to different perspectives that address distinct concerns not surfaced in baseline-only runs.)* (FR-006, FR-007, FR-008)
- SC-002: Each finding in REVIEW-SYNTHESIS.md includes a `perspective` attribution that traces to a specific perspective name or `baseline`. (FR-008, FR-013)
- SC-003: A custom perspective file placed in `.paw/perspectives/` is discovered and applied by the engine without code changes. (FR-003, FR-004)
- SC-004: Setting `perspectives: none` produces byte-identical REVIEW-SYNTHESIS.md output compared to the current engine on the same input. (FR-012)
- SC-005: The `perspective_cap` setting limits the maximum perspectives applied per specialist, verified by counting subagent calls. (FR-002) *(FR-011's novelty-based reduction below the cap will be validated when that feature is implemented post-v1.)*
- SC-006: In parallel mode, conflicting findings from different perspectives appear in the synthesis with both positions preserved and perspective attribution. (FR-009)
- SC-007: In debate mode, perspective-variant findings are resolved through debate rounds, not surfaced as unresolved conflicts. (FR-010)

## Assumptions

- The three-layer prompt architecture (Identity → Lens → Task) is sufficient to preserve specialist coherence when perspective overlays are applied. If coherence degrades for specific model families, per-model calibration of overlay phrasing will be added post-v1.
- A 6-month temporal horizon is used as the default for temporal perspectives (premortem, retrospective). Research has not empirically validated this specific duration, but it forces consideration of maintenance, scaling, and exploitation-over-time concerns that shorter horizons miss.
- Perspective overlays of ~50–100 words are sufficient to shift the evaluative frame without competing with the specialist's cognitive strategy. The research suggests prompts exceeding ~500 words show diminishing returns.
- Existing Toulmin output format for specialist findings can accommodate perspective attribution via an additional field without schema redesign.

## Scope

In Scope:
- Perspective discovery mechanism (4-level precedence)
- Perspective file schema definition
- Three built-in perspective presets (premortem, retrospective, red-team)
- Review context input contract extensions (`perspectives`, `perspective_cap`)
- Prompt composition changes (three-layer architecture with perspective overlay)
- Auto selection logic based on artifact signals
- Perspective attribution in findings and synthesis
- Interaction mode–aware conflict handling (parallel: surface; debate: resolve)
- Adaptive novelty-based stopping for perspectives
- REVIEW-SYNTHESIS.md Perspective Diversity section
- WorkflowContext.md support for perspective configuration
- Three-tier configuration: auto, guided (named presets), expert (custom files)

Out of Scope:
- Per-model perspective prompt calibration (post-v1 if coherence issues arise)
- Perspective-specific metrics dashboard or reporting beyond synthesis annotations
- Automated A/B testing of perspective effectiveness
- Perspective interaction with specialist model assignment (perspectives don't change which model runs the specialist)
- Preset pack definition files (v1 uses direct perspective names; pack names are syntactic sugar for later)

## Future Work (Deferred to Post-v1)

- **Preset pack names** (FR-001 partial): Named perspective packs (e.g., "ship-readiness" = premortem + red-team) as syntactic sugar for comma-separated lists. Deferred until the direct-name workflow is proven stable.
- **Adaptive novelty stopping** (FR-011): Configurable similarity-threshold novelty stopping that can skip perspectives below the `perspective_cap` when findings are redundant. Deferred until v1 usage data informs sensible defaults. V1 relies on `perspective_cap` as the hard limit and prompt-driven novelty assessment.
- **SC-001 quantitative validation**: Embedding-based clustering measurement of the 15% semantic diversity improvement target. Deferred until measurement infrastructure exists. V1 validates qualitatively.

## Dependencies

- Existing `paw-sot` skill (specialist discovery, prompt composition, parallel/debate execution, synthesis)
- Existing specialist persona files (`references/specialists/`)
- Existing review context input contract
- Existing Toulmin output format in shared rules

### Perspective Overlay Sizing
- Perspective overlays must be concise enough not to materially impact specialist prompt budgets — the exact sizing constraint is an implementation concern

## Risks & Mitigations

- **Perspective overlays may degrade specialist coherence on some models**: Research shows minor prompt perturbations can reduce performance by up to 40pp on some models. Mitigation: Keep overlays concise (~50–100 words), use explicit identity reinforcement ("Remain the {specialist}"), and design the overlay to frame *what to look for* rather than *how to reason*. Post-v1: add per-model calibration if needed.
- **Combinatorial explosion of specialist × perspective runs**: With 6 specialists × 2 perspectives each, that's 12 subagent runs. Mitigation: Budget-aware auto selection, configurable `perspective_cap`, and adaptive novelty stopping. Default configuration keeps runs manageable.
- **Auto perspective selection may be poor for unfamiliar artifact types**: The heuristic-based selection may not make good choices for artifact types the engine hasn't seen. Mitigation: Users can override with explicit perspective names or `none`. Auto selection errs conservative (fewer perspectives rather than more).
- **Temporal perspectives may generate plausible-sounding but ungrounded operational risks**: A post-mortem framing could produce "credible hallucinations" about failures that have no basis in the artifact. Mitigation: Novelty constraint directives in perspective definitions require evidence anchoring ("tie each predicted failure back to evidence in the artifact, or label it as speculative operational risk").

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/261
- Research: .paw/work/temporal-perspective-shifts/context/ (3 research reports + 3 synthesis documents)
- Key citations: Klein 2007 (premortem), Haase et al. 2026 (variance decomposition), Li et al. 2025 (Self-MoA), Chan et al. 2024 (ChatEval), DMAD (reasoning strategy diversity)
