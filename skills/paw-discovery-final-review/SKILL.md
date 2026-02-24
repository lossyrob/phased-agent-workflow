---
name: paw-discovery-final-review
description: Pre-completion review for PAW Discovery workflow. Reviews all Discovery artifacts against input documents with configurable single-model, multi-model, or society-of-thought execution.
---

# Discovery Final Review

> **Execution Context**: This skill runs **directly** in the PAW Discovery session (not a subagent), preserving user interactivity for apply/skip/discuss decisions.

Comprehensive review step that runs after all Discovery stages complete, before PAW handoff. Examines the full artifact chain (Extraction → CapabilityMap → Correlation → Roadmap) for consistency, completeness, and actionability.

## Capabilities

- Review Discovery artifacts against input documents and each other
- Multi-model parallel review with synthesis (CLI only)
- Society-of-thought review via `paw-sot` engine (CLI only)
- Single-model review (CLI and VS Code)
- Interactive, smart, or auto-apply resolution modes
- Generate review artifacts in `.paw/discovery/<work-id>/reviews/`

## Procedure

### Step 1: Read Configuration

Read DiscoveryContext.md for:
- Work ID
- `Final Review Mode`: `single-model` | `multi-model` | `society-of-thought`
- `Final Review Interactive`: `true` | `false` | `smart`

If mode is `society-of-thought`, also read:
- `Final Review Specialists`: `all` (default) | comma-separated names | `adaptive:<N>`
- `Final Review Interaction Mode`: `parallel` (default) | `debate`

### Step 2: Gather Context

**Discovery artifacts** (in `.paw/discovery/<work-id>/`):
- `inputs/` — Original documents
- `Extraction.md` — Extracted themes
- `CapabilityMap.md` — Codebase capabilities
- `Correlation.md` — Theme-capability connections
- `Roadmap.md` — Prioritized MVP items

### Step 3: Create Reviews Directory

Create `.paw/discovery/<work-id>/reviews/` if it doesn't exist.
Create `.gitignore` with content `*` (if not already present).

### Review Prompt (shared)

```
Review this Discovery workflow output. Be critical and thorough.

## Context Locations
- **Input Documents**: `.paw/discovery/<work-id>/inputs/`
- **Extraction**: `.paw/discovery/<work-id>/Extraction.md`
- **Capability Map**: `.paw/discovery/<work-id>/CapabilityMap.md`
- **Correlation**: `.paw/discovery/<work-id>/Correlation.md`
- **Roadmap**: `.paw/discovery/<work-id>/Roadmap.md`

## Review Criteria

1. **Extraction Completeness**: Are all key themes from input documents captured?
2. **Source Attribution**: Does every theme cite specific documents and sections?
3. **Capability Coverage**: Does the capability map reflect actual codebase features?
4. **Correlation Accuracy**: Are theme-capability connections logical and well-reasoned?
5. **Prioritization Rationale**: Does each roadmap item have clear 5-factor justification?
6. **Actionability**: Can the top roadmap item be handed off to PAW for implementation?
7. **Artifact Consistency**: Do artifacts reference each other correctly?

For each finding, provide:
- Issue description
- Affected artifact and section
- Proposed fix
- Severity: must-fix | should-fix | consider

Write findings in structured markdown.
```

### Step 4: Execute Review

**If single-model mode**:
- Execute review using the prompt above
- Save to `REVIEW.md`

**If multi-model mode**:
- Spawn parallel subagents for each model
- Save per-model reviews to `REVIEW-{MODEL}.md`
- Generate `REVIEW-SYNTHESIS.md`

**If society-of-thought mode**:
- Load `paw-sot` skill
- Invoke with review context (type: `artifacts`, coordinates: Discovery artifact paths)
- SoT handles specialist orchestration and synthesis

### Step 5: Resolution

Process findings per `Final Review Interactive` setting:

- `true`: Present each finding interactively (apply/skip/discuss)
- `smart`: Auto-apply consensus findings, interactive for disputed
- `false`: Auto-apply all must-fix and should-fix

### Step 6: Completion

Report:
- Total findings count
- Applied / skipped / discussed counts
- Review artifacts location
- Status: `complete` (ready for PAW handoff)

## Review Artifacts

| Mode | Files Created |
|------|---------------|
| single-model | `REVIEW.md` |
| multi-model | `REVIEW-{MODEL}.md` per model, `REVIEW-SYNTHESIS.md` |
| society-of-thought | `REVIEW-{SPECIALIST}.md` per specialist, `REVIEW-SYNTHESIS.md` |

Location: `.paw/discovery/<work-id>/reviews/`
