# Work Shaping: Discovery SoT Specialists

## Problem Statement

Discovery workflow produces conceptual artifacts (Extraction.md, CapabilityMap.md, Correlation.md, Roadmap.md) that require multi-perspective evaluation to catch issues that single-model review misses. Unlike code, these artifacts:
- Are analytical and interpretive, not executable
- Depend on reasoning quality and source fidelity
- Have quality dimensions unique to document synthesis

The current `paw-sot` engine supports multi-perspective review but its built-in specialists (security, architecture, performance, etc.) are designed for code review — their cognitive strategies don't apply to Discovery artifacts. Additionally, the existing `type: artifacts` preamble is implementation-focused ("design and planning documents, architectural choices") which doesn't fit Discovery's synthesis documents.

**Who benefits**: Users running Discovery workflow who want confidence that extracted themes, correlations, and priorities are sound before PAW handoff.

**What problem is solved**: Catching reasoning gaps, source attribution errors, cross-artifact inconsistencies, and coverage gaps that single-model review misses.

## Work Breakdown

### Core Functionality

1. **4 Discovery Specialists** — New specialist personas with cognitive strategies suited to artifact review:
   - `source-fidelity.md` — Trace-back verification: validates themes trace to actual source documents
   - `coverage.md` — Gap analysis: ensures all inputs processed, all themes correlated, no orphans
   - `reasoning.md` — Challenge justifications: examines correlation logic and priority rationale
   - `coherence.md` — Reference integrity: validates IDs, counts, and cross-references between artifacts

2. **New `type: discovery-artifacts`** — Add to `paw-sot` SKILL.md:
   - Discovery-specific preamble focused on synthesis documents, theme extraction, correlation analysis
   - Automatic filtering to `context: discovery` specialists

3. **Metadata-based Specialist Filtering** — Update `paw-sot` SKILL.md to filter specialists by context:
   - Add `context: discovery | implementation` frontmatter field
   - When `type: discovery-artifacts`, load only `context: discovery` specialists
   - When `type: diff` or `type: artifacts`, load only `context: implementation` specialists

### Supporting Changes

4. **Backfill existing specialists** — Add `context: implementation` frontmatter to existing 9 specialists

5. **Update `paw-discovery-final-review`** — Change invocation from `type: artifacts` to `type: discovery-artifacts`

## Edge Cases & Expected Handling

| Edge Case | Expected Handling |
|-----------|-------------------|
| Empty Discovery artifacts | Specialists report inability to review; synthesis flags as blocked |
| Partial artifact chain (e.g., only Extraction.md exists) | SoT reviews what's available; Coherence specialist notes missing artifacts |
| Source documents unavailable (deleted after extraction) | Source Fidelity specialist reports as finding with MEDIUM confidence |
| Specialist finds no issues | Anti-sycophancy rules require examination summary explaining what was checked |
| Conflict between specialists | Synthesis handles via grounding validation and trade-off classification |
| Unknown context value in specialist frontmatter | Skip specialist with warning; continue with remaining roster |

## Rough Architecture

```
paw-discovery-final-review
    │
    ▼
paw-sot (type: discovery-artifacts)
    │
    ├── Inject Discovery-specific preamble
    │   "You are reviewing Discovery synthesis documents..."
    │
    ├── Load _shared-rules.md
    │
    ├── Discover specialists with context: discovery
    │   └── Built-in: source-fidelity.md, coverage.md, reasoning.md, coherence.md
    │
    ├── [Parallel | Debate] Spawn specialist subagents
    │   Each writes: REVIEW-{SPECIALIST}.md
    │
    ├── Synthesis subagent → REVIEW-SYNTHESIS.md
    │
    └── [Optional] Moderator mode
```

**Type-to-Context Mapping** (addition to paw-sot):

| Type | Specialist Filter | Preamble Focus |
|------|-------------------|----------------|
| `diff` | `context: implementation` | Code changes, bugs, patterns |
| `artifacts` | `context: implementation` | Design docs, architectural choices |
| `discovery-artifacts` | `context: discovery` | Synthesis docs, themes, correlations |
| `freeform` | Explicit list or all | Caller-provided framing |

## Critical Analysis

### Value Assessment

- **High value**: Discovery artifacts are conceptual — errors compound downstream when PAW implements a poorly-reasoned item
- **Moderate effort**: 4 new specialist files + skill updates; pattern already established
- **Low risk**: Additive change; doesn't modify existing implementation review behavior

### Build vs Modify Tradeoffs

**Chosen: Extend `paw-sot`** with new type and metadata filtering rather than creating separate `paw-discovery-sot` skill because:
- One engine to maintain
- Shared rules (`_shared-rules.md`) benefit both contexts
- Discovery specialists get improvements to core SoT machinery
- Cleaner than duplicating ~250 lines of orchestration logic

### Alternative Considered

Separate `paw-discovery-sot` skill was considered but rejected:
- Would duplicate SKILL.md orchestration logic
- Harder to maintain consistency between two SoT variants
- No capability difference — only specialist content and preamble differ

## Codebase Fit

### Similar Features
- `paw-sot` already exists with 9 implementation specialists and `type: diff | artifacts | freeform`
- `paw-final-review` already invokes `paw-sot` for implementation review
- `paw-discovery-final-review` exists but uses generic `type: artifacts` which selects wrong specialists

### Reuse Opportunities
- `_shared-rules.md` (anti-sycophancy, confidence scoring, Toulmin format) — reuse as-is
- Specialist persona structure (Identity, Cognitive Strategy, Domain Boundary, Behavioral Rules, Examples) — follow established pattern
- paw-sot orchestration (specialist discovery, parallel/debate modes, synthesis, moderator mode) — reuse completely

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Discovery specialists give irrelevant findings | Medium | Clear domain boundaries prevent overlap; examples ground expected output |
| Context filtering misses specialists | Low | Default to all if context field missing; log warning |
| Cognitive strategies don't work for artifacts | Medium | Test with real Discovery output before finalizing |
| Token cost of 4 additional subagents | Low | Same cost structure as implementation SoT |

## Open Questions for Downstream Stages

1. **Specialist narrative depth**: Should Discovery specialists have the same ~500-word narrative backstories as implementation specialists, or can they be more concise?

2. **Adaptive selection for Discovery**: With only 4 specialists, is `adaptive:N` useful? Perhaps default to `all` for Discovery context.

3. **Moderator mode relevance**: Is post-synthesis specialist engagement valuable for artifact review, or should it be skipped by default?

4. **Integration testing**: How do we validate Discovery specialists produce useful findings? Test with real Discovery artifacts from previous runs?

## Session Notes

Key decisions from work shaping Q&A:

- **Why SoT for Discovery**: Artifacts are conceptual/analytical; multi-perspective judgment catches reasoning gaps that single-model misses
- **4 specialists chosen**: Source Fidelity, Coverage, Reasoning, Coherence — mapped to existing per-stage review criteria; distinct cognitive strategies with non-overlapping domain boundaries
- **Unified paw-sot preferred**: Extend existing skill with new type rather than separate skill
- **New `type: discovery-artifacts`**: Cleaner than overloading `type: artifacts` with different preambles; automatic context filtering
- **Metadata filtering via `context` field**: Each specialist declares `context: discovery | implementation` in frontmatter
- **Holistic review**: Specialists review all artifacts together (after per-stage reviews passed) to catch emergent cross-artifact issues
- **Parallel + debate**: Both modes retained for flexibility, same as implementation SoT
- **Output artifacts**: Same naming (REVIEW-{SPECIALIST}.md, REVIEW-SYNTHESIS.md) for consistency
