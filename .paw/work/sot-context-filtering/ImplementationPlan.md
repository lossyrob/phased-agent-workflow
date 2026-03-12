# SoT Context-Based Specialist Filtering Implementation Plan

## Overview

Adding a `context` field to SoT specialist frontmatter and review context input contract, enabling domain-based specialist filtering while keeping the engine domain-agnostic through pure string matching.

## Current State Analysis

- SoT discovers specialists from 4 levels (workflow → project → user → built-in)
- Frontmatter extraction exists via `extractFrontmatterField()` (case-insensitive)
- 9 built-in specialists have no `context` field currently
- Adaptive selection already filters post-discovery—context filtering follows same pattern
- Interactive/non-interactive patterns established for edge cases

## Desired End State

- Specialists can declare `context: <string>` in frontmatter
- Callers can filter by context via `context: <string>` in review context
- Case-insensitive string matching (no semantic interpretation)
- Backward compatible: missing context defaults to `implementation`
- Zero-match handling follows established interactive patterns

## What We're NOT Doing

- Multiple contexts per specialist (arrays)—deferred for future enhancement
- Context validation or registry—SoT remains domain-agnostic
- New non-implementation specialists—external workflows provide their own
- Context-aware prompt framing—context is purely filtering
- Changes to perspective system or shared rules

## Phase Status

- [x] **Phase 1: SKILL.md Updates** - Add context field to contract and document filtering behavior
- [x] **Phase 2: Built-in Specialist Updates** - Add `context: implementation` to all 9 specialists
- [x] **Phase 3: Documentation** - Create Docs.md and update project documentation

## Phase Candidates

<!-- None currently - all requirements fit within planned phases -->

---

## Phase 1: SKILL.md Updates

Add context filtering mechanism to the paw-sot skill documentation.

### Changes Required

- **`skills/paw-sot/SKILL.md`**:
  - Add `context` field to Review Context Input Contract table (line ~36)
  - Add new "Context Filtering" section after Specialist Discovery section (after line 66)
  - Update Adaptive Selection section to clarify context filtering happens first
  - Document zero-match handling following established interactive patterns

### Detailed Changes

**Review Context Input Contract** (add row to table):
| Field | Required | Values | Description |
|-------|----------|--------|-------------|
| `context` | no | string | Domain filter for specialists (case-insensitive match) |

**New "Context Filtering" Section** (insert after Specialist Discovery):
- Context is optional string field in review context
- Specialists declare context via `context:` frontmatter field
- Matching is case-insensitive
- Default behaviors:
  - Specialists without `context` → default to `implementation`
  - Callers without `context` + `diff`/`artifacts` type → default to `implementation`
  - Callers without `context` + `freeform` type → no filtering
- Zero-match handling:
  - Interactive mode → prompt user for decision
  - Non-interactive mode → warn and include all specialists
  - Smart mode → prompt user (escalate on zero-match)

**Adaptive Selection Update**:
- Add note: "Context filtering (if specified) occurs before adaptive selection—the adaptive algorithm selects from the already-filtered pool."

### Success Criteria

#### Automated Verification:
- [ ] Agent lint passes: `./scripts/lint-prompting.sh skills/paw-sot/SKILL.md`

#### Manual Verification:
- [ ] Context field documented in input contract table
- [ ] Context Filtering section describes all default behaviors
- [ ] Zero-match handling follows established patterns
- [ ] Adaptive Selection references context filtering precedence

---

## Phase 2: Built-in Specialist Updates

Add explicit `context: implementation` frontmatter to all built-in specialists.

### Changes Required

- **`skills/paw-sot/references/specialists/security.md`**: Add frontmatter
- **`skills/paw-sot/references/specialists/architecture.md`**: Add frontmatter
- **`skills/paw-sot/references/specialists/performance.md`**: Add frontmatter
- **`skills/paw-sot/references/specialists/testing.md`**: Add frontmatter
- **`skills/paw-sot/references/specialists/correctness.md`**: Add frontmatter
- **`skills/paw-sot/references/specialists/edge-cases.md`**: Add frontmatter
- **`skills/paw-sot/references/specialists/maintainability.md`**: Add frontmatter
- **`skills/paw-sot/references/specialists/release-manager.md`**: Add frontmatter
- **`skills/paw-sot/references/specialists/assumptions.md`**: Add frontmatter

### Frontmatter Pattern

Each specialist file should start with:
```yaml
---
context: implementation
---
```

Files currently have no frontmatter (start with `# [Name]`) or empty frontmatter (`---\n---`).

### Success Criteria

#### Automated Verification:
- [ ] Agent lint passes for all specialists: `npm run lint:skills`

#### Manual Verification:
- [ ] All 9 specialist files have `context: implementation` in frontmatter
- [ ] No other content changes to specialist files
- [ ] `_shared-rules.md` unchanged (not a specialist)

---

## Phase 3: Documentation

Create technical reference and update project documentation.

### Changes Required

- **`.paw/work/sot-context-filtering/Docs.md`**: Technical reference (load `paw-docs-guidance`)
- **`docs/reference/` or appropriate location**: Document context filtering for specialist authors

### Documentation Content

**Docs.md** should cover:
- Feature overview
- Usage examples (caller perspective)
- Specialist author guide (frontmatter format)
- Default behaviors table
- Verification approach

**Project docs** should include:
- Specialist authoring guide with context field documentation
- Example of creating domain-specific specialists

### Success Criteria

#### Automated Verification:
- [ ] Docs build: `mkdocs build --strict`

#### Manual Verification:
- [ ] Docs.md captures implementation details
- [ ] Specialist author documentation is discoverable
- [ ] Examples are clear and actionable

---

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/262
- Spec: `.paw/work/sot-context-filtering/Spec.md`
- Research: `.paw/work/sot-context-filtering/CodeResearch.md`
