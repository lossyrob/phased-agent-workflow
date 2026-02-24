# Feature Specification: Discovery SoT Specialists

**Branch**: feature/discovery-sot-specialists  |  **Created**: 2025-01-22  |  **Status**: Draft
**Input Brief**: Add Society of Thought specialists optimized for Discovery workflow artifact review

## Overview

Discovery workflow produces conceptual artifacts—Extraction.md, CapabilityMap.md, Correlation.md, and Roadmap.md—that capture themes, correlations, and priorities extracted from source documents. Unlike code, these artifacts are analytical and interpretive, requiring evaluation of reasoning quality, source fidelity, and cross-artifact coherence rather than syntax or performance characteristics.

The existing Society of Thought (SoT) review engine provides multi-perspective evaluation but its built-in specialists focus on implementation concerns (security vulnerabilities, architectural patterns, performance bottlenecks). These cognitive strategies don't apply to Discovery artifacts where the core risks are reasoning gaps, misattributed themes, coverage holes, and broken cross-references between synthesis documents.

This feature introduces Discovery-specific specialists with cognitive strategies suited to artifact review: validating that themes trace to actual sources, ensuring complete coverage of inputs, challenging correlation logic, and verifying reference integrity across the artifact chain. By extending the existing SoT engine rather than creating a parallel system, Discovery reviews benefit from shared infrastructure while getting specialized evaluation perspectives.

Users running Discovery workflow gain confidence that their extracted themes, correlations, and roadmap priorities are sound before handing off to PAW for implementation—catching errors at the synthesis stage rather than discovering them mid-implementation.

## Objectives

- Enable multi-perspective review of Discovery artifacts with specialists whose cognitive strategies match document synthesis evaluation
- Catch reasoning gaps, source attribution errors, and cross-artifact inconsistencies that single-model review misses
- Maintain unified SoT architecture with automatic specialist selection based on review context
- Preserve existing implementation review behavior while adding Discovery capabilities
- Provide clear specialist boundaries to prevent overlapping or irrelevant findings

## User Scenarios & Testing

### User Story P1 – Discovery Final Review with Appropriate Specialists

Narrative: A user completes Discovery workflow stages (extraction, capability mapping, correlation, roadmap) and triggers final review. The review engine automatically selects Discovery-focused specialists who evaluate reasoning quality, source fidelity, coverage completeness, and cross-artifact coherence—producing findings relevant to synthesis documents rather than code-focused concerns.

Independent Test: Invoke `paw-sot` with `type: discovery-artifacts` and verify only Discovery specialists (source-fidelity, coverage, reasoning, coherence) are loaded, not implementation specialists.

Acceptance Scenarios:
1. Given a complete Discovery artifact chain, When final review is triggered with `type: discovery-artifacts`, Then the SoT engine loads only specialists with `context: discovery` and produces a synthesis report
2. Given Discovery artifacts with a theme not traced to any source, When Source Fidelity specialist reviews, Then the finding identifies the unattributed theme with specific artifact location
3. Given a Correlation.md referencing a non-existent capability ID, When Coherence specialist reviews, Then the finding identifies the broken reference with expected vs actual IDs

### User Story P2 – Implementation Review Unchanged

Narrative: A user triggers code review or implementation artifact review. The existing specialists (security, architecture, performance, etc.) are selected and produce implementation-relevant findings. The addition of Discovery specialists does not affect implementation review behavior.

Independent Test: Invoke `paw-sot` with `type: diff` and verify only implementation specialists are loaded, not Discovery specialists.

Acceptance Scenarios:
1. Given code changes in a PR, When review is triggered with `type: diff`, Then only specialists with `context: implementation` are loaded
2. Given an implementation plan artifact, When review is triggered with `type: artifacts`, Then only implementation specialists are loaded and produce design-focused findings

### User Story P3 – Specialist Filtering by Context Metadata

Narrative: A maintainer adds a new specialist to the roster. By setting the `context` field in frontmatter, the specialist automatically appears in the appropriate review type without modifying SoT orchestration logic.

Independent Test: Add a specialist file with `context: discovery` frontmatter and verify it appears in Discovery reviews but not implementation reviews.

Acceptance Scenarios:
1. Given a specialist file with `context: discovery` in frontmatter, When `type: discovery-artifacts` review runs, Then the specialist is included in the roster
2. Given a specialist file with `context: implementation` in frontmatter, When `type: discovery-artifacts` review runs, Then the specialist is excluded from the roster
3. Given a specialist file with missing `context` value, When `type: diff` or `type: artifacts` review runs, Then the specialist is treated as `context: implementation` and included (backward compatibility for existing/third-party specialists)

### Edge Cases

- **Empty Discovery artifacts**: Specialists report inability to review; synthesis flags the review as blocked rather than producing empty findings
- **Partial artifact chain** (e.g., only Extraction.md exists): SoT reviews available artifacts; Coherence specialist notes missing artifacts as a finding
- **Source documents unavailable**: Source Fidelity specialist reports inability to verify attribution as a MEDIUM confidence finding rather than failing
- **Specialist finds no issues**: Per anti-sycophancy rules, specialist provides examination summary explaining what was checked and why no issues were found
- **Conflicting specialist findings**: Synthesis handles via existing grounding validation and trade-off classification mechanisms

## Requirements

### Functional Requirements

- FR-001: Four Discovery specialists created with distinct cognitive strategies: Source Fidelity (trace-back verification), Coverage (gap analysis), Reasoning (justification challenge), Coherence (reference integrity) (Stories: P1)
- FR-002: New `type: discovery-artifacts` added to SoT with Discovery-specific preamble focused on synthesis documents, theme extraction, and correlation analysis (Stories: P1)
- FR-003: Specialist filtering implemented via `context` frontmatter field with values `discovery` or `implementation` (Stories: P1, P2, P3)
- FR-004: Type-to-context mapping: `discovery-artifacts` → `context: discovery`; `diff` and `artifacts` → `context: implementation` (Stories: P1, P2)
- FR-005: Existing nine implementation specialists updated with `context: implementation` frontmatter (Stories: P2)
- FR-006: `paw-discovery-final-review` skill updated to invoke SoT with `type: discovery-artifacts` instead of `type: artifacts` (Stories: P1)
- FR-007: Missing `context` values treated as `implementation` for `diff`/`artifacts` types—ensures backward compatibility for existing and third-party specialists (Stories: P3)

### Key Entities

- **Specialist**: A persona file defining identity, cognitive strategy, domain boundary, behavioral rules, and examples for a specific review perspective
- **Context**: Frontmatter field (`discovery` | `implementation`) declaring which review types a specialist participates in
- **Type**: SoT invocation parameter (`diff` | `artifacts` | `discovery-artifacts` | `freeform`) determining preamble and specialist filtering

### Cross-Cutting / Non-Functional

- Discovery specialists follow the same persona structure (Identity, Cognitive Strategy, Domain Boundary, Behavioral Rules, Examples) as existing implementation specialists
- Discovery specialists inherit shared rules from `_shared-rules.md` (anti-sycophancy, confidence scoring, Toulmin format)
- Output artifacts use consistent naming: `REVIEW-{SPECIALIST}.md`, `REVIEW-SYNTHESIS.md`

## Success Criteria

- SC-001: Discovery review produces findings from exactly 4 Discovery specialists when invoked with `type: discovery-artifacts` (FR-001, FR-002, FR-004)
- SC-002: Implementation review produces findings from only implementation specialists when invoked with `type: diff` or `type: artifacts` (FR-004, FR-005)
- SC-003: Each Discovery specialist produces at least one finding category unique to its domain boundary (no complete overlap between specialists) (FR-001)
- SC-004: Specialist with `context: discovery` never appears in `type: diff` or `type: artifacts` reviews (FR-003, FR-004)
- SC-005: Specialist with missing `context` value is included in `diff`/`artifacts` reviews as `implementation` context; excluded from `discovery-artifacts` reviews (FR-007)
- SC-006: Discovery final review invokes SoT with `type: discovery-artifacts` and receives Discovery-specific findings (FR-006)

## Assumptions

- The existing `_shared-rules.md` (anti-sycophancy, confidence scoring, Toulmin argument format) applies equally well to Discovery artifact review—no Discovery-specific shared rules are needed
- Four specialists provide sufficient coverage for Discovery artifact review; additional specialists can be added later using the same context filtering mechanism
- Discovery specialists can be narrative-focused similar to implementation specialists; there's no requirement for different persona depth
- The `freeform` type continues to allow explicit specialist list override, bypassing context filtering

## Scope

In Scope:
- Four new Discovery specialist persona files
- New `type: discovery-artifacts` with preamble and context filtering
- `context` frontmatter field and filtering logic in `paw-sot` SKILL.md
- Backfill `context: implementation` to existing nine specialists
- Update `paw-discovery-final-review` invocation

Out of Scope:
- Adaptive specialist selection tuning for Discovery (use `all` as default; tuning is future work)
- Moderator mode behavior changes for Discovery (use existing behavior)
- Integration tests with real Discovery artifacts (validation is implementation concern)
- New shared rules specific to Discovery context
- Changes to existing specialist cognitive strategies or content beyond adding frontmatter

## Dependencies

- `paw-sot` skill exists with specialist discovery, parallel/debate modes, and synthesis mechanisms
- `paw-discovery-final-review` skill exists and invokes SoT
- `_shared-rules.md` exists with anti-sycophancy and confidence scoring rules
- Nine existing implementation specialists exist in the roster

## Risks & Mitigations

- **Discovery specialists produce irrelevant findings**: MEDIUM impact. Mitigation: Clear domain boundaries in each specialist prevent overlap; examples ground expected output types
- **Context filtering breaks existing reviews**: LOW impact. Mitigation: Backfill existing specialists first; test implementation review before Discovery specialists
- **Cognitive strategies don't suit artifact review**: MEDIUM impact. Mitigation: Model strategies on existing per-stage review criteria from Discovery workflow; iterate based on findings quality
- **Token cost increase from additional specialists**: LOW impact. Mitigation: Same cost structure as implementation SoT; four specialists is comparable to typical implementation review

## References

- WorkShaping: .paw/work/discovery-sot-specialists/WorkShaping.md
- Related skill: `paw-sot` (Society of Thought review engine)
- Related skill: `paw-discovery-final-review` (Discovery final review orchestration)
