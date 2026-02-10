# Smart Interactive Mode

## Overview

Smart interactive mode is a third interaction mode for multi-model reviews (`paw-final-review` and `paw-planning-docs-review`) that auto-applies clear consensus fixes and only pauses for findings requiring user judgment. It addresses the poor signal-to-noise ratio of fully interactive mode, where users repeatedly approve obvious consensus fixes before reaching findings that actually need input.

## Architecture and Design

### How It Works

Smart mode uses the existing synthesis structure — agreement level (consensus/partial/single-model) and severity (must-fix/should-fix/consider) — to classify each finding:

| Agreement Level | Severity | Classification |
|----------------|----------|----------------|
| Consensus | must-fix/should-fix | `auto-apply` |
| Partial/Single-model | must-fix/should-fix | `interactive` |
| Any | consider | `report-only` |

Resolution proceeds in phases:
1. **Batch auto-apply** — apply all `auto-apply` findings, show summary
2. **Interactive** — present `interactive` findings one-at-a-time (apply/skip/discuss)
3. **Summary** — display all dispositions (auto-applied, user-applied, user-skipped, reported)

### Design Decisions

**Consensus = clear fix**: Rather than cross-referencing per-model `REVIEW-{MODEL}.md` files to compare proposals, consensus agreement in the synthesis is treated as sufficient evidence that models converged on the fix. This keeps classification simple and adds no latency.

**Consider = report-only**: Consider-severity findings are never applied or prompted — they appear in the summary for awareness only, regardless of agreement level.

**VS Code degradation**: Smart mode is CLI-only because VS Code only supports single-model review. In VS Code, `smart` degrades to `true` (interactive) behavior since there's no agreement signal from a single model. The VS Code quick pick does not offer a "Smart" option to avoid confusion.

**Planning-docs-review routing**: Single-artifact consensus must-fix/should-fix findings are auto-routed to the correct skill (paw-spec or paw-planning). Multi-artifact (`both`) findings always pause for user routing, even at consensus, because the routing decision itself requires user judgment.

### Integration Points

- **paw-final-review** — new `If Interactive = smart` branch in Step 5, within `{{#cli}}` conditionals
- **paw-planning-docs-review** — same pattern with routing-aware classification, applies per re-review cycle
- **paw-init** — `smart` is the new default for both `final_review_interactive` and `planning_review_interactive`
- **VS Code extension** — `FinalReviewConfig.interactive` type widened to `boolean | 'smart'`

## User Guide

### Configuration

Set during workflow initialization (`paw-init`):

| Field | Values | Default |
|-------|--------|---------|
| Final Review Interactive | `true`, `false`, `smart` | `smart` |
| Planning Review Interactive | `true`, `false`, `smart` | `smart` |

Existing workflows with `true` or `false` continue to work unchanged.

### Behavior Summary

| Mode | Consensus fixes | Ambiguous findings | Consider findings |
|------|----------------|-------------------|------------------|
| `true` | Prompt each | Prompt each | Prompt each |
| `smart` | Auto-apply | Prompt each | Report only |
| `false` | Auto-apply | Auto-apply | Skip |

### Edge Cases

- **All consensus**: No interactive phase — batch summary only
- **All ambiguous**: Behaves identically to `true`
- **No findings**: Skip resolution (existing behavior)
- **Single-model mode**: Degrades to `true` (no agreement signal)

## Limitations and Future Work

- Smart mode requires multi-model review for meaningful auto-apply behavior
- The classification heuristic is fixed — not user-configurable
- Integration tests for smart mode are deferred to a follow-up work item
