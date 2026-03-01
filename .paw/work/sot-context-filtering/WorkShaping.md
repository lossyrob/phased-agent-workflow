# Work Shaping: Context-Based Specialist Filtering for paw-sot

Issue: [lossyrob/phased-agent-workflow#262](https://github.com/lossyrob/phased-agent-workflow/issues/262)

## Problem Statement

The SoT (Society of Thought) engine currently loads all discovered specialists regardless of review domain. This works for implementation-focused code reviews, but doesn't support:

- **External workflows** bringing domain-specific specialists (e.g., business analysis, compliance)
- **Non-code reviews** where implementation specialists (security, performance, testing) are irrelevant

Users can create custom specialists in `~/.paw/personas/` or `.paw/personas/`, but there's no way to scope which specialists participate based on the review domain.

**Who benefits**: External contributors creating custom workflows with their own domain specialists, and PAW core when it needs domain-specific reviews.

## Work Breakdown

### Core Functionality

1. **Specialist context declaration** - Add `context` field to specialist frontmatter
2. **Review context filter** - Add `context` field to review context input contract
3. **Context matching logic** - Pure string matching between caller context and specialist context
4. **Default behavior** - Backward-compatible defaults for callers and specialists without explicit context

### Supporting Features

1. **Built-in specialist updates** - Add explicit `context: implementation` to all existing specialists
2. **Zero-match handling** - Interactive prompt vs. non-interactive fallback
3. **Documentation** - Document mechanism for specialist authors

## Edge Cases

| Scenario | Expected Handling |
|----------|-------------------|
| Specialist without `context` field | Default to `implementation` (backward compatible) |
| Caller without `context` field + `diff`/`artifacts` type | Default to `implementation` |
| Caller without `context` field + `freeform` type | No filtering (all specialists participate) |
| Zero specialists match the context (interactive mode) | Warn and prompt user for decision |
| Zero specialists match the context (non-interactive mode) | Warn and proceed with all specialists |
| Context filter + adaptive selection | Filter by context first, then adaptive selects from filtered pool |

## Rough Architecture

```
Review Context Input
        │
        ▼
┌───────────────────┐
│ Specialist        │  (4-level precedence: workflow → project → user → built-in)
│ Discovery         │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Context Filtering │  ◄── NEW: Match caller context against specialist context
│ (if context set)  │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Adaptive Selection│  (if specialists: adaptive:N)
│ (from filtered    │
│  pool)            │
└─────────┬─────────┘
          │
          ▼
     SoT Execution
```

### Data Flow

1. Caller provides review context with optional `context: <string>` field
2. Discovery phase loads all specialists from 4-level hierarchy
3. **New filtering step**: Extract `context` from each specialist's frontmatter; retain only specialists where context matches (or both are `implementation` by default)
4. Filtered pool feeds into existing adaptive selection (if used) or direct execution

### Component Interactions

- **SKILL.md § Review Context Input Contract**: Add `context` field documentation
- **SKILL.md § Execution**: Add context filtering step after discovery, before adaptive selection
- **Specialist files**: Parse frontmatter for `context` field
- **_shared-rules.md**: No changes expected (context is purely filtering, not prompt framing)

## Critical Analysis

### Value Assessment

**High value**: This is a clean extension that enables new use cases without modifying core SoT logic. Domain-agnostic design means PAW doesn't need to know about every possible review domain.

### Build vs. Modify Tradeoffs

**Modify existing**: This extends the existing specialist loading flow with a filtering step. No new components needed.

### Simplicity Wins

- Single context per specialist (not arrays) — can extend later if needed
- Pure string matching — no semantic interpretation
- Defaults preserve existing behavior — zero breaking changes

## Codebase Fit

### Similar Features

- Specialist discovery already has precedence logic (workflow → project → user → built-in)
- Frontmatter parsing exists for `model:` and `shared_rules_included:` fields
- Adaptive selection already filters specialists by relevance scoring

### Reuse Opportunities

- Existing frontmatter extraction utilities
- Existing specialist loading infrastructure
- Existing interactive prompt patterns for edge cases

## Risk Assessment

### Potential Negative Impacts

- **Zero matches silently proceeding**: If non-interactive mode falls back to all specialists, the caller might not realize filtering failed. Mitigation: Always emit a visible warning.
- **Context typos**: A caller passing `implmentation` (typo) won't match `implementation` specialists. Mitigation: Documentation should emphasize exact string matching.

### Gotchas

- Context is **case-sensitive** string matching — document this clearly
- The `freeform` type has no default filtering, which might surprise callers expecting implementation specialists

## Open Questions

1. **Case sensitivity**: Should context matching be case-insensitive for usability? (Current decision: case-sensitive for simplicity, but could revisit)
2. **Warning visibility**: How prominently should the zero-match warning be displayed in non-interactive mode?

## Session Notes

### Key Decisions

- **Single context per specialist** chosen over multi-context for initial simplicity; can extend later
- **Defaults follow issue proposal**: specialists default to `implementation`, callers default based on review type
- **Filtering before adaptive selection** — filter first, then let adaptive select from filtered pool
- **Add explicit context to built-ins** even though they default to `implementation`, for clarity

### Rejected Alternatives

- **Multi-context arrays**: Deferred for simplicity. Authors can create specialist variants if needed.
- **Context registry/validation**: Rejected to keep SoT domain-agnostic. Any string is valid.
- **Integrated adaptive scoring**: Rejected in favor of separate filter step for clarity.
