# Docs: Perspective Shifts for SoT Engine

**Feature**: Composable perspective overlays for the Society of Thought review engine
**Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/261
**Branch**: `feature/temporal-perspective-shifts`

## Overview

Extends the SoT engine with perspective overlays — evaluative lenses (temporal, adversarial, custom) that shift specialist review framing without altering specialist identity. Perspectives are a third diversity axis alongside specialist domain and model assignment.

## Architecture

### Prompt Composition (5 layers)

1. Shared rules (`references/specialists/_shared-rules.md`)
2. Context preamble (type-dependent framing)
3. Specialist content (persona file)
4. **Perspective overlay** (new — loaded from perspective file, `{specialist}` placeholder resolved)
5. Review coordinates (diff range, artifact paths)

Layer 4 is skipped when `perspectives: none`, making composition identical to the pre-change 4-layer model.

### Perspective Discovery (4-level precedence)

Mirrors specialist discovery exactly:

1. **Workflow**: Parse `perspectives` from review context
2. **Project**: `.paw/perspectives/<name>.md`
3. **User**: `~/.paw/perspectives/<name>.md`
4. **Built-in**: `references/perspectives/<name>.md`

Most-specific-wins for name conflicts. Malformed files skipped with warning.

### Review Context Fields

| Field | Default (Final Review) | Default (PR Review) |
|-------|----------------------|---------------------|
| `perspectives` | `auto` | `none` |
| `perspective_cap` | `2` | `2` |

### Execution

- Each specialist runs once per assigned perspective
- Output naming: `REVIEW-{SPECIALIST}-{PERSPECTIVE}.md` (with perspectives) or `REVIEW-{SPECIALIST}.md` (without)
- Synthesis discovers all `REVIEW-*.md` files (glob covers both patterns)
- `perspectives: none` produces byte-identical output to pre-change engine

### Perspective File Schema

```markdown
# {Name} Perspective

## Lens Type
{temporal | adversarial | custom}

## Parameters
- **Temporal Frame**: {duration or "N/A"}
- **Scenario**: {one-sentence scenario assumption}

## Overlay Template
{50–100 word prompt overlay with {specialist} placeholder}

## Novelty Constraint
{Directive requiring evidence-anchoring of findings}
```

### Built-in Perspectives

| Name | Lens | Overlay Words | Key Framing |
|------|------|--------------|-------------|
| `premortem` | temporal | 81 | 6-month post-launch incident analysis |
| `retrospective` | temporal | 73 | 6-month operational retrospective |
| `red-team` | adversarial | 67 | Adversary exploitation analysis |

## Files Changed

| File | Changes |
|------|---------|
| `skills/paw-sot/SKILL.md` | Input contract (+2 fields), perspective discovery, auto-selection, 5-layer composition, parallel/debate mode updates, synthesis file discovery, perspective-aware synthesis, Perspective Diversity section |
| `skills/paw-sot/references/specialists/_shared-rules.md` | Conditional `**Perspective**` field in Toulmin format |
| `skills/paw-sot/references/perspectives/premortem.md` | New built-in perspective |
| `skills/paw-sot/references/perspectives/retrospective.md` | New built-in perspective |
| `skills/paw-sot/references/perspectives/red-team.md` | New built-in perspective |
| `skills/paw-init/SKILL.md` | Input params (+2), SoT validation, WorkflowContext template |
| `skills/paw-final-review/SKILL.md` | Review context table (+2 rows) |
| `skills/paw-review-understanding/SKILL.md` | ReviewContext.md template (+2 fields) |
| `skills/paw-review-workflow/SKILL.md` | Review context table (+2 rows) |
| `docs/guide/society-of-thought-review.md` | Perspective Overlays section, Custom Perspectives section, config tables |
| `docs/reference/artifacts.md` | Perspective-aware file naming, synthesis contents |
| `docs/specification/implementation.md` | Perspective overlay mention |
| `docs/specification/review.md` | Perspective overlay mention |

## Verification

```bash
npm run lint:skills          # All skill files pass prompt lint
npm run lint                 # ESLint passes
source .venv/bin/activate && mkdocs build --strict  # Docs build passes
```

## Deferred to Post-v1

- Preset pack names (FR-001 partial)
- Adaptive novelty stopping with configurable threshold (FR-011)
- SC-001 quantitative validation (embedding-based clustering)
- Per-model perspective prompt calibration
