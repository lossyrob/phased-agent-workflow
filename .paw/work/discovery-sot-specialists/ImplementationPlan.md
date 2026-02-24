# Discovery SoT Specialists Implementation Plan

## Overview

Add Society of Thought specialists optimized for Discovery workflow artifact review. This extends the existing SoT engine with context-based specialist filtering, a new `type: discovery-artifacts` review type, and four Discovery-specific specialists with cognitive strategies suited to synthesis document evaluation.

## Current State Analysis

**SoT engine capabilities**:
- 4-level specialist discovery (workflow → project → user → built-in)
- Type-dependent preambles (`diff`, `artifacts`, `freeform`) injected between shared rules and specialist content
- Adaptive selection based on "change categories" (code-centric analysis)
- 9 built-in implementation specialists in `skills/paw-sot/references/specialists/`

**Gaps**:
- No mechanism to filter specialists by review context—all discovered specialists participate regardless of type
- No `type: discovery-artifacts` for synthesis document review
- Existing specialists lack `context` metadata (pure markdown, no frontmatter)
- `paw-discovery-final-review` invokes SoT with `type: artifacts` (generic design review framing)

**Key constraints from research**:
- Specialist files support optional YAML frontmatter (`model:`, `shared_rules_included:`)
- Preamble injection is separate from specialist content—adding new type requires new preamble text only
- Per-stage Discovery review criteria (from extraction/mapping/correlation/prioritize review skills) provide cognitive strategy patterns for specialists

## Desired End State

- SoT engine filters specialists by `context` frontmatter matching the review `type`
- `type: discovery-artifacts` produces review with Discovery-specific preamble and only `context: discovery` specialists
- `type: diff` and `type: artifacts` load only `context: implementation` specialists
- Four Discovery specialists provide coverage for source fidelity, coverage analysis, reasoning validation, and cross-artifact coherence
- `paw-discovery-final-review` invokes SoT with `type: discovery-artifacts`

**Verification approach**: Manual testing of SoT invocation with each type confirming correct specialist roster and preamble.

## What We're NOT Doing

- Adaptive selection tuning for Discovery (future work—use `all` as default)
- Moderator mode behavior changes for Discovery
- Integration tests with real Discovery artifacts
- New shared rules specific to Discovery context
- Changes to existing specialist cognitive strategies beyond adding frontmatter

## Phase Status

- [x] **Phase 1: Context Filtering Infrastructure** - Add `context` frontmatter parsing and type-to-context filtering in paw-sot
- [ ] **Phase 2: Backfill Implementation Specialists** - Add `context: implementation` to 9 existing specialists
- [ ] **Phase 3: Discovery Specialists** - Create 4 Discovery specialist files with `context: discovery`
- [ ] **Phase 4: Discovery Final Review Integration** - Update paw-discovery-final-review to use `type: discovery-artifacts`
- [x] **Phase 5: Documentation** - Technical reference and any project doc updates

## Phase Candidates

<!-- No candidates initially —straightforward implementation path -->

---

## Phase 1: Context Filtering Infrastructure

### Changes Required

- **`skills/paw-sot/SKILL.md`**:
  - Add `context` field to "Review Context Input Contract" section with type-to-context mapping table:
    - `diff` → `implementation`
    - `artifacts` → `implementation`
    - `discovery-artifacts` → `discovery`
    - `freeform` → **bypass** (no context filtering; all discovered specialists participate regardless of `context` value)
  - Add new "Context-Based Specialist Filtering" section after "Specialist Discovery" explaining:
    - Frontmatter `context` field (values: `discovery` | `implementation`)
    - Filtering logic: only load specialists where `context` matches mapped context for the review `type`
    - `freeform` type bypasses filtering entirely—all discovered specialists participate
    - Missing `context` behavior: treat as `implementation` for `diff`/`artifacts` types (backward compatibility); exclude from `discovery-artifacts`
  - Add `type: discovery-artifacts` to "Context-Adaptive Preambles" section with Discovery-specific preamble text:
    > You are reviewing Discovery workflow synthesis artifacts—extracted themes, capability mappings, correlations, and prioritized roadmaps. Apply your cognitive strategy to evaluate reasoning quality, source attribution accuracy, coverage completeness, and cross-artifact consistency. Reference specific artifact sections, theme IDs, and capability references rather than code lines.
  - Update "Prompt Composition" section to include context filtering step between discovery and prompt assembly
  - Add note in "Context-Adaptive Preambles" that the Discovery preamble contextually overrides diff-centric language in shared rules (agents interpret "evidence anchored to specific locations" as artifact sections/theme IDs rather than code lines)
  - Add note for adaptive selection with Discovery: when `type: discovery-artifacts` and `specialists: adaptive:<N>`, fall back to `all` with warning (adaptive analyzes code-centric change categories not applicable to Discovery)

### Success Criteria

#### Automated Verification:
- [ ] Lint passes: `npm run lint`
- [ ] No broken markdown links in SKILL.md

#### Manual Verification:
- [ ] SKILL.md contains type-to-context mapping table: `diff`/`artifacts` → `implementation`, `discovery-artifacts` → `discovery`, `freeform` → bypass
- [ ] SKILL.md contains Discovery-specific preamble for `type: discovery-artifacts`
- [ ] SKILL.md documents `freeform` bypass behavior (all specialists participate regardless of context)
- [ ] SKILL.md documents backward-compatible handling for missing `context` values (treated as `implementation` for diff/artifacts)
- [ ] Context filtering section clearly integrates with existing specialist discovery flow

---

## Phase 2: Backfill Implementation Specialists

### Changes Required

- **`skills/paw-sot/references/specialists/architecture.md`**: Add YAML frontmatter with `context: implementation`
- **`skills/paw-sot/references/specialists/assumptions.md`**: Add YAML frontmatter with `context: implementation`
- **`skills/paw-sot/references/specialists/correctness.md`**: Add YAML frontmatter with `context: implementation`
- **`skills/paw-sot/references/specialists/edge-cases.md`**: Add YAML frontmatter with `context: implementation`
- **`skills/paw-sot/references/specialists/maintainability.md`**: Add YAML frontmatter with `context: implementation`
- **`skills/paw-sot/references/specialists/performance.md`**: Add YAML frontmatter with `context: implementation`
- **`skills/paw-sot/references/specialists/release-manager.md`**: Add YAML frontmatter with `context: implementation`
- **`skills/paw-sot/references/specialists/security.md`**: Add YAML frontmatter with `context: implementation`
- **`skills/paw-sot/references/specialists/testing.md`**: Add YAML frontmatter with `context: implementation`

Frontmatter format:
```yaml
---
context: implementation
---
```

### Success Criteria

#### Automated Verification:
- [ ] Lint passes: `npm run lint`
- [ ] All 9 specialist files have valid YAML frontmatter (verify with quick grep/view)

#### Manual Verification:
- [ ] Each specialist file starts with `---\ncontext: implementation\n---`
- [ ] Existing specialist content unchanged below frontmatter
- [ ] SoT invocation with `type: diff` would include all 9 specialists (per updated SKILL.md logic)

---

## Phase 3: Discovery Specialists

### Changes Required

Create 4 new specialist files in `skills/paw-sot/references/specialists/`:

- **`skills/paw-sot/references/specialists/source-fidelity.md`**:
  - Identity: Specialist in source attribution and provenance verification
  - Cognitive Strategy: Trace-back verification—for each claim/theme, trace to cited source, verify attribution accuracy
  - Domain Boundary: Source citations, attribution accuracy, fabrication detection; NOT correlation logic or prioritization
  - Frontmatter: `context: discovery`
  - Examples modeled on extraction-review criteria (source attribution, document coverage)

- **`skills/paw-sot/references/specialists/coverage.md`**:
  - Identity: Specialist in completeness and gap analysis
  - Cognitive Strategy: Coverage scanning—inventory all inputs, track what's captured vs. missed, identify systematic omissions
  - Domain Boundary: Input coverage, theme completeness, capability enumeration; NOT reasoning quality or source accuracy
  - Frontmatter: `context: discovery`
  - Examples modeled on extraction-review and mapping-review criteria (document coverage, theme coverage, capability count)

- **`skills/paw-sot/references/specialists/reasoning.md`**:
  - Identity: Specialist in logical analysis and justification validation
  - Cognitive Strategy: Argument challenge—examine each correlation/prioritization rationale, identify unsupported leaps, test logical consistency
  - Domain Boundary: Reasoning quality, justification strength, logical gaps; NOT source verification or coverage completeness
  - Frontmatter: `context: discovery`
  - Examples modeled on correlation-review and prioritize-review criteria (correlation rationale, priority logic, multi-factor scoring)

- **`skills/paw-sot/references/specialists/coherence.md`**:
  - Identity: Specialist in cross-artifact consistency and reference integrity
  - Cognitive Strategy: Reference tracing—follow IDs and references across artifacts, verify bidirectional consistency, detect orphans
  - Domain Boundary: Cross-artifact references, ID consistency, artifact integrity; NOT individual artifact quality
  - Frontmatter: `context: discovery`
  - Examples modeled on artifact integrity criteria (valid YAML, ID matching, section population)

Each specialist follows existing structure:
1. Identity & Narrative Backstory
2. Cognitive Strategy
3. Domain Boundary
4. Behavioral Rules
5. Shared Rules reference
6. Demand Rationale
7. Shared Output Format reference
8. Example Review Comments (2-3 examples in Toulmin format)

### Success Criteria

#### Automated Verification:
- [ ] Lint passes: `npm run lint`
- [ ] All 4 specialist files exist in `skills/paw-sot/references/specialists/`
- [ ] All 4 files have valid YAML frontmatter with `context: discovery`

#### Manual Verification:
- [ ] Each specialist has distinct domain boundary with no significant overlap
- [ ] Cognitive strategies clearly map to Discovery artifact review patterns
- [ ] Example findings use Toulmin structure (Grounds, Warrant, Rebuttal Conditions, Suggested Verification)
- [ ] Behavioral rules reference `_shared-rules.md` for anti-sycophancy and confidence scoring
- [ ] Source Fidelity specialist handles "source documents unavailable" edge case (MEDIUM confidence finding per Spec)
- [ ] Coherence specialist handles "partial artifact chain" edge case (notes missing artifacts as finding)
- [ ] All specialists handle "empty artifacts" gracefully (report inability to review)

---

## Phase 4: Discovery Final Review Integration

### Changes Required

- **`skills/paw-discovery-final-review/SKILL.md`**:
  - Update "If society-of-thought mode" section (around line 90-93) to pass `type: discovery-artifacts` instead of `type: artifacts`
  - Add brief note explaining that Discovery specialists are automatically selected via context filtering

### Success Criteria

#### Automated Verification:
- [ ] Lint passes: `npm run lint`
- [ ] SKILL.md contains `type: discovery-artifacts` (verify with grep)

#### Manual Verification:
- [ ] SoT invocation documentation specifies `type: discovery-artifacts`
- [ ] No other changes to the skill's behavior or configuration options

---

## Phase 5: Documentation

### Changes Required

- **`.paw/work/discovery-sot-specialists/Docs.md`**: Technical reference (load `paw-docs-guidance`)
  - Feature overview and motivation
  - Context filtering mechanism explanation
  - Discovery specialist summaries (domain, cognitive strategy)
  - Configuration options (specialists list, interaction mode)
  - Usage examples

- **Project docs** (if warranted):
  - Review existing paw-sot documentation for update needs
  - Update paw-discovery-final-review documentation if any user-facing changes

### Success Criteria

- [x] Docs.md covers all implementation aspects
- [x] Content accurate and consistent with implementation
- [x] Style matches existing documentation

---

## References

- Issue: none
- Spec: `.paw/work/discovery-sot-specialists/Spec.md`
- Research: `.paw/work/discovery-sot-specialists/CodeResearch.md`
- Work shaping: `.paw/work/discovery-sot-specialists/WorkShaping.md`
