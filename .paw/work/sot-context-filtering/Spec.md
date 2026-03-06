# Feature Specification: Context-Based Specialist Filtering

**Branch**: feature/sot-context-filtering  |  **Created**: 2026-03-01  |  **Status**: Draft
**Input Brief**: Add domain filtering to SoT so specialists can declare their context and callers can filter to relevant specialists

## Overview

The Society of Thought (SoT) engine orchestrates multi-perspective code reviews by invoking specialist personas (security, performance, testing, etc.). Currently, all discovered specialists participate in every review regardless of whether they're relevant to the content being reviewed. This works well for implementation-focused code reviews but creates friction when reviewing non-code content like business plans, documentation, or domain-specific artifacts where implementation specialists add noise rather than value.

External workflow authors who create custom specialists for their domains (compliance, business analysis, legal review) have no way to ensure only their relevant specialists participate when their workflows invoke SoT. The current workaround—explicitly listing specialist names in the `specialists` field—is fragile and doesn't scale when specialists are contributed from multiple sources.

This feature introduces a generic context-filtering mechanism where specialists declare their domain via a `context` field in YAML frontmatter, and callers specify which context they want via a new `context` field in the review context contract. SoT matches these strings without interpreting what they mean, keeping the engine domain-agnostic while enabling precise specialist scoping.

## Objectives

- Enable callers to filter specialists by domain without knowing individual specialist names
- Allow specialist authors to declare relevance domains in a standard, discoverable way
- Maintain full backward compatibility—existing specialists and callers work unchanged
- Keep SoT domain-agnostic—no hardcoded knowledge of what contexts mean
- Support external workflows bringing their own domain-specific specialists

## User Scenarios & Testing

### User Story P1 – External Workflow Filtering

**Narrative**: A workflow author creates custom specialists for business document reviews (market-analyst, financial-reviewer). When their workflow invokes SoT with `context: business`, only their business specialists participate—implementation specialists are automatically excluded.

**Independent Test**: Invoke SoT with `context: business` when both `context: business` and `context: implementation` specialists exist; verify only business specialists participate.

**Acceptance Scenarios**:
1. Given specialists with `context: business` and `context: implementation` exist, When caller passes `context: business`, Then only business-context specialists are selected
2. Given a specialist has `context: business` in frontmatter, When SoT loads specialists, Then the context value is extracted and available for filtering
3. Given caller passes `context: compliance`, When no specialists have `context: compliance`, Then a warning is emitted

### User Story P2 – Backward Compatible Default

**Narrative**: An existing PAW user runs SoT code reviews without specifying any context. Their reviews continue to work exactly as before, with all implementation specialists participating.

**Independent Test**: Invoke SoT without `context` field on a diff review; verify all implementation specialists participate.

**Acceptance Scenarios**:
1. Given a specialist file has no `context` field, When SoT loads it, Then the specialist defaults to `context: implementation`
2. Given caller invokes SoT with type `diff` and no `context` field, When SoT determines filtering, Then it defaults to `context: implementation`
3. Given caller invokes SoT with type `freeform` and no `context` field, When SoT determines filtering, Then no context filtering is applied

### User Story P3 – Zero-Match Recovery

**Narrative**: A user accidentally passes `context: busines` (typo). In interactive mode, SoT warns them and asks how to proceed. In non-interactive mode, SoT warns and falls back to all specialists rather than failing silently.

**Independent Test**: Invoke SoT with a context that matches no specialists in both interactive and non-interactive modes; verify appropriate handling.

**Acceptance Scenarios**:
1. Given `interactive: true` and no specialists match the requested context, When filtering completes, Then user is prompted to decide how to proceed
2. Given `interactive: false` and no specialists match the requested context, When filtering completes, Then a warning is emitted and all specialists are included as fallback
3. Given `interactive: smart` and no specialists match the requested context, When filtering completes, Then user is prompted (smart escalates on zero-match)

### Edge Cases

- Context matching is case-insensitive (`Business` matches `business`)
- Empty string context treated as no context specified (use defaults)
- Whitespace-only context treated as no context specified
- Context filtering applies before adaptive selection (`specialists: adaptive:3` selects from filtered pool)

## Requirements

### Functional Requirements

- FR-001: Specialists MAY declare a `context` field in YAML frontmatter with a single string value (Stories: P1, P2)
- FR-002: Review context input contract accepts an optional `context` field with a string value (Stories: P1)
- FR-003: When caller provides `context`, only specialists with matching context (case-insensitive) are included (Stories: P1)
- FR-004: Specialists without explicit `context` field default to `implementation` (Stories: P2)
- FR-005: Callers without explicit `context` field default to `implementation` for `diff` and `artifacts` types (Stories: P2)
- FR-006: Callers without explicit `context` field have no filtering for `freeform` type (Stories: P2)
- FR-007: Context filtering occurs after specialist discovery and before adaptive selection (Stories: P1)
- FR-008: Zero matching specialists in interactive mode prompts user for decision (Stories: P3)
- FR-009: Zero matching specialists in non-interactive mode emits warning and includes all specialists (Stories: P3)
- FR-010: All built-in specialists have explicit `context: implementation` in frontmatter (Stories: P2)

### Cross-Cutting / Non-Functional

- Context matching must be case-insensitive to reduce user friction from typos
- Warning messages for zero-match must be visible in output (not silent)
- No new review types or context values hardcoded in SoT—purely string matching

## Success Criteria

- SC-001: Caller can filter to only business specialists by passing `context: business` (FR-003)
- SC-002: Existing callers without `context` field see no change in behavior for diff reviews (FR-004, FR-005)
- SC-003: Zero-match scenarios are handled gracefully without silent failures (FR-008, FR-009)
- SC-004: Specialist authors can document context in frontmatter following existing patterns (FR-001)
- SC-005: Context filtering integrates with adaptive selection—filtered pool is input to adaptive (FR-007)

## Assumptions

- Single context per specialist is sufficient for initial release; multi-context arrays deferred
- Case-insensitive matching provides better UX than strict case-sensitivity
- External workflow authors will create their own specialists rather than expecting PAW to ship non-implementation specialists
- The existing `extractFrontmatterField` utility handles the `context` field extraction

## Scope

**In Scope**:
- `context` field in specialist frontmatter
- `context` field in review context input contract
- Context filtering logic in specialist selection flow
- Default behavior for missing context (specialists and callers)
- Zero-match handling (interactive prompt, non-interactive fallback)
- Adding `context: implementation` to all 9 built-in specialists
- Documentation for specialist authors

**Out of Scope**:
- Multiple contexts per specialist (arrays)
- Context validation or registry of known contexts
- New built-in specialists for non-implementation domains
- Changes to perspective system
- Changes to shared rules injection
- Context-aware prompt framing (context is filtering only)

## Dependencies

- Existing frontmatter extraction utility (`extractFrontmatterField`)
- Existing specialist discovery mechanism (4-level precedence)
- Existing interactive prompt patterns

## Risks & Mitigations

- **Typo-induced zero matches**: Users may mistype context strings. Mitigation: Case-insensitive matching reduces this; clear warning messages help users identify the issue.
- **Unexpected freeform behavior**: `freeform` type has no default filtering, which may surprise users expecting implementation specialists. Mitigation: Document this clearly in the review context contract.
- **Silent fallback confusion**: Non-interactive fallback to all specialists might mask configuration errors. Mitigation: Warning must be prominent, not buried in logs.

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/262
- WorkShaping: .paw/work/sot-context-filtering/WorkShaping.md
