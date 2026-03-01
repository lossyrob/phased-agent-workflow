# Implementation Documentation: SoT Context-Based Specialist Filtering

## Summary

Added a `context` field to paw-sot specialist frontmatter and review context input contract, enabling domain-based specialist filtering while keeping the engine domain-agnostic.

## Changes Made

### paw-sot SKILL.md

**Review Context Input Contract** (line ~31): Added `context` field:

| Field | Required | Values | Description |
|-------|----------|--------|-------------|
| `context` | no | string | Domain filter for specialists (case-insensitive match) |

**New "Context Filtering" section** (after Specialist Discovery): Documents:
- Specialist context declaration via frontmatter
- Case-insensitive matching behavior
- Default behaviors for missing context
- Zero-match handling (interactive prompt vs non-interactive fallback)
- Execution order (filtering happens before adaptive selection)

### Built-in Specialists

Added `context: implementation` frontmatter to all 9 built-in specialists:
- `security.md`
- `architecture.md`
- `performance.md`
- `testing.md`
- `correctness.md`
- `edge-cases.md`
- `maintainability.md`
- `release-manager.md`
- `assumptions.md`

### Documentation

Updated `docs/guide/society-of-thought-review.md`:
- Added `context` field to specialist scaffold example
- Added "Context Filtering" subsection under "Custom Specialists"

## Usage

### Caller Perspective

To filter specialists by domain, include `context` in the review context:

```yaml
type: freeform
context: business
coordinates: /path/to/business-plan.md
output_dir: .paw/work/my-work/reviews
interaction_mode: parallel
interactive: true
```

Only specialists with `context: business` in their frontmatter will participate.

### Specialist Author Perspective

To declare a specialist's domain context:

```yaml
---
context: compliance
---

# Compliance Specialist

## Identity & Narrative Backstory
...
```

## Default Behaviors

| Scenario | Default |
|----------|---------|
| Specialist without `context` field | `implementation` |
| Caller without `context` + `diff` type | `implementation` |
| Caller without `context` + `artifacts` type | `implementation` |
| Caller without `context` + `freeform` type | No filtering |

## Zero-Match Handling

| Mode | Behavior |
|------|----------|
| `interactive: true` | Warn and prompt user for decision |
| `interactive: false` | Warn and proceed with all specialists |
| `interactive: smart` | Warn and prompt user |

## Verification

- Agent lint: `./scripts/lint-prompting.sh skills/paw-sot/SKILL.md` ✓
- Skills lint: `npm run lint:skills` ✓
- Docs build: `mkdocs build --strict` ✓

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/262
- Spec: `.paw/work/sot-context-filtering/Spec.md`
- CodeResearch: `.paw/work/sot-context-filtering/CodeResearch.md`
- ImplementationPlan: `.paw/work/sot-context-filtering/ImplementationPlan.md`
