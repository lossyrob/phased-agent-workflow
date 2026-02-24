# Discovery SoT Specialists

## Overview

Discovery workflow produces analytical artifacts—Extraction.md, CapabilityMap.md, Correlation.md, and Roadmap.md—that capture themes, correlations, and priorities extracted from source documents. These synthesis artifacts require evaluation of reasoning quality, source fidelity, and cross-artifact coherence rather than code-focused concerns like syntax or performance.

This feature extends the Society of Thought (SoT) review engine with Discovery-specific specialists and context-based filtering. Discovery reviews now automatically load specialists whose cognitive strategies match document synthesis evaluation: verifying source attribution, assessing coverage completeness, challenging reasoning quality, and checking cross-artifact consistency.

The implementation maintains the unified SoT architecture—Discovery specialists share the same infrastructure (parallel/debate modes, confidence-weighted synthesis, moderator engagement) while getting specialized evaluation perspectives appropriate for analytical artifacts.

## Architecture and Design

### High-Level Architecture

The feature introduces two changes to the SoT engine:

1. **Context-based specialist filtering**: Specialists declare their review context (`discovery` or `implementation`) via YAML frontmatter. The SoT engine filters specialists based on the review `type`, ensuring only appropriate specialists participate.

2. **Discovery review type**: A new `type: discovery-artifacts` with a Discovery-specific preamble that frames specialist evaluation for synthesis documents.

```
┌─────────────────────────────────────────────────────────────────┐
│                     SoT Review Request                          │
│                type: discovery-artifacts                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Specialist Discovery                           │
│      (workflow → project → user → built-in precedence)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               Context-Based Filtering                           │
│                                                                 │
│   type: discovery-artifacts → context: discovery                │
│   type: diff/artifacts      → context: implementation           │
│   type: freeform           → no filtering (all participate)    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Filtered Specialist Roster                         │
│                                                                 │
│   Discovery: source-fidelity, coverage, reasoning, coherence    │
│   Implementation: security, architecture, performance, etc.     │
└─────────────────────────────────────────────────────────────────┘
```

### Design Decisions

**Frontmatter-based context declaration**: Rather than hardcoding specialist-to-type mappings, specialists self-declare their context via YAML frontmatter. This enables third-party specialists to participate in the appropriate review types without modifying SoT orchestration logic.

**Backward compatibility for missing context**: Specialists without a `context` field are treated as `context: implementation`. This preserves behavior for existing and third-party specialists that predate context filtering.

**Discovery preamble contextual override**: The Discovery preamble instructs specialists to interpret "evidence anchored to specific locations" as artifact sections and theme IDs rather than code lines. This allows shared rules (anti-sycophancy, confidence scoring, Toulmin format) to apply without modification.

**Freeform bypass**: The `freeform` type bypasses context filtering entirely, allowing explicit specialist list overrides regardless of declared context.

### Integration Points

- **paw-discovery-final-review**: Updated to invoke SoT with `type: discovery-artifacts` instead of `type: artifacts`
- **Specialist files**: All 9 implementation specialists updated with `context: implementation` frontmatter
- **Shared rules**: `_shared-rules.md` applies to all specialists regardless of context

## User Guide

### Prerequisites

- Discovery workflow artifacts exist (Extraction.md, CapabilityMap.md, Correlation.md, Roadmap.md)
- `paw-sot` skill available in the skill search path
- For Discovery final review integration: `paw-discovery-final-review` skill available

### Basic Usage

**Via Discovery Final Review**

The simplest way to use Discovery specialists is through the Discovery workflow's final review stage:

```
# In paw-discovery-final-review context
# SoT is automatically invoked with type: discovery-artifacts
```

The `paw-discovery-final-review` skill handles the SoT invocation with appropriate settings.

**Direct SoT Invocation**

For standalone Discovery artifact review:

```yaml
# Review context for SoT
type: discovery-artifacts
coordinates: ".paw/work/my-discovery/outputs/"
output_dir: ".paw/work/my-discovery/reviews/"
interaction_mode: parallel
interactive: smart
```

### Advanced Usage

**Explicit Specialist Selection**

Override automatic filtering to include specific specialists:

```yaml
type: discovery-artifacts
specialists: "source-fidelity, reasoning"  # Only these two
```

**Mixed Context via Freeform**

For scenarios requiring both Discovery and implementation specialists:

```yaml
type: freeform
specialists: "source-fidelity, security, reasoning"
framing: "Review these artifacts for both synthesis quality and security implications."
```

**Debate Mode for Discovery**

Discovery specialists support debate interaction for deeper analysis:

```yaml
type: discovery-artifacts
interaction_mode: debate
specialists: all
```

## API Reference

### Specialist Context Frontmatter

Each specialist file supports optional YAML frontmatter:

```yaml
---
context: discovery    # or: implementation
model: claude-opus-4  # optional: override default model
shared_rules_included: true  # optional: skip shared rules injection
---
```

| Field | Values | Description |
|-------|--------|-------------|
| `context` | `discovery` \| `implementation` | Which review types this specialist participates in |
| `model` | model identifier | Override default model assignment |
| `shared_rules_included` | `true` \| `false` | Skip shared rules injection if already included |

### Type-to-Context Mapping

| Review Type | Specialist Context | Loaded Specialists |
|-------------|-------------------|-------------------|
| `diff` | `implementation` | security, architecture, performance, etc. |
| `artifacts` | `implementation` | security, architecture, performance, etc. |
| `discovery-artifacts` | `discovery` | source-fidelity, coverage, reasoning, coherence |
| `freeform` | *(bypass)* | All discovered specialists |

### Configuration Options

Standard SoT configuration applies to Discovery reviews:

| Option | Values | Discovery Behavior |
|--------|--------|-------------------|
| `specialists` | `all` \| names \| `adaptive:<N>` | `adaptive` falls back to `all` with warning (code-centric analysis not applicable) |
| `interaction_mode` | `parallel` \| `debate` | Both supported |
| `interactive` | `true` \| `false` \| `smart` | Controls trade-off pause behavior |
| `specialist_models` | model assignment | Per-specialist model override |

## Discovery Specialists

### Source Fidelity Specialist

**Domain**: Source-to-claim fidelity—does each claim accurately reflect what its cited source says?

**Cognitive Strategy**: Trace-back verification and citation audit. For every theme, capability, correlation, or priority, traces the claim to its cited source and verifies semantic alignment.

**Key Focus Areas**:
- Citation presence vs. actual support
- Semantic drift between source and claim
- Broken file:line or section references
- Citation chain validation (avoiding false consensus from circular citations)

**Example Finding Categories**: Unattributed themes, semantic expansion without support, broken references, vague citations

### Coverage Specialist

**Domain**: Completeness and gap detection—is everything that should be present actually present?

**Cognitive Strategy**: Systematic gap detection and coverage assessment. Inventories inputs and outputs, checks category balance, identifies expected-but-absent items.

**Key Focus Areas**:
- Input processing completeness (all documents processed?)
- Category distribution balance
- Expected items based on context
- Coverage across artifact transitions

**Example Finding Categories**: Unprocessed input documents, missing capability categories, themes lost between stages

### Reasoning Specialist

**Domain**: Logical validity and reasoning completeness—do conclusions follow from their stated premises?

**Cognitive Strategy**: Logical chain analysis and argument reconstruction. Identifies evaluative claims, reconstructs arguments, checks premise-conclusion validity.

**Key Focus Areas**:
- Complete reasoning chains (no unstated premises doing heavy lifting)
- Valid inferences (conclusions actually follow from premises)
- Defined terms (factor definitions, scoring semantics)
- Root cause connection (solutions address causes, not just symptoms)

**Example Finding Categories**: Conclusions not following from scores, undefined factors, unstated assumptions

### Coherence Specialist

**Domain**: Cross-artifact consistency—do artifacts agree with each other on shared entities, terminology, and implications?

**Cognitive Strategy**: Cross-artifact consistency verification. Maps artifact interfaces, verifies reference integrity, checks terminology consistency.

**Key Focus Areas**:
- Cross-artifact reference resolution (theme IDs, capability IDs)
- Terminology consistency across documents
- Numerical claims matching actual counts
- Implicit contradictions (e.g., "critical" theme ranked low without explanation)

**Example Finding Categories**: Orphan references, terminology drift, count mismatches, implicit priority contradictions

## Testing

### How to Test

**Verify context filtering**:
1. Invoke SoT with `type: discovery-artifacts`
2. Confirm only 4 specialists participate: source-fidelity, coverage, reasoning, coherence
3. Confirm implementation specialists (security, architecture, etc.) are excluded

**Verify implementation review unchanged**:
1. Invoke SoT with `type: diff` or `type: artifacts`
2. Confirm only implementation specialists participate
3. Confirm Discovery specialists are excluded

**Verify backward compatibility**:
1. Create a specialist file without `context` frontmatter
2. Invoke SoT with `type: diff`
3. Confirm the specialist is included (treated as `context: implementation`)
4. Invoke SoT with `type: discovery-artifacts`
5. Confirm the specialist is excluded

### Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty Discovery artifacts | Specialists report inability to review; synthesis flags as blocked |
| Partial artifact chain | SoT reviews available artifacts; Coherence notes missing artifacts |
| Source documents unavailable | Source Fidelity reports MEDIUM confidence finding (cannot verify) |
| Specialist finds no issues | Examination summary per anti-sycophancy rules |
| `adaptive:<N>` with Discovery | Falls back to `all` with warning |

## Limitations and Future Work

### Known Limitations

- **Adaptive selection**: Not supported for Discovery reviews. Code-centric change category analysis doesn't apply to synthesis artifacts. Falls back to `all` with warning.
- **Source document access**: Source Fidelity specialist requires access to cited sources for trace-back verification. Missing sources produce MEDIUM confidence findings rather than failures.
- **Partial artifact chains**: Coherence checking is limited when not all Discovery artifacts are present.

### Future Work

- Discovery-specific adaptive selection heuristics (based on artifact characteristics rather than code change categories)
- Additional Discovery specialists for domain-specific synthesis patterns
- Integration with Discovery workflow stages for per-stage review
