# Extract Society of Thought (SoT) Engine into paw-sot Skill

## Overview

The Society of Thought (SoT) orchestration engine — specialist discovery, debate, synthesis, and moderator mode — was extracted from `paw-final-review` into a standalone `paw-sot` skill. This enables reuse of multi-perspective deliberative review across different scenarios (final review, planning docs review, PR review, ad-hoc analysis) without coupling to final review.

`paw-final-review` becomes a thin adapter: it reads WorkflowContext.md configuration, constructs a review context, and delegates SoT orchestration to `paw-sot`. Single-model and multi-model modes remain unchanged in `paw-final-review`.

## Architecture and Design

### Three-Tier Design

```
┌─────────────┐     review context     ┌──────────┐     subagents     ┌─────────────┐
│  Calling     │ ───────────────────▶   │  paw-sot │ ────────────────▶ │ Specialist  │
│  Skill       │                        │  (engine)│                   │ Personas    │
│  (adapter)   │ ◀──────────────────    │          │ ◀──────────────── │             │
│              │   REVIEW-SYNTHESIS.md  │          │   REVIEW-*.md     │             │
└─────────────┘                        └──────────┘                   └─────────────┘
```

**Tier 1 — paw-sot (engine)**: Scenario-agnostic orchestration. Accepts a review context, discovers specialists, spawns subagents, orchestrates parallel or debate interaction, produces synthesis. Owns specialist persona files and moderator mode.

**Tier 2 — Calling skill (adapter)**: Gathers scenario-specific inputs, constructs review context, delegates to paw-sot, handles post-synthesis resolution. Currently only `paw-final-review`; future adapters: `paw-planning-docs-review`, `paw-review-workflow`.

**Tier 3 — Specialist personas**: Domain expert identities with cognitive strategies that self-gather context and produce Toulmin-structured findings. Shared across all scenarios.

### Review Context Contract

The review context is the input interface between adapters and the engine:

| Field | Values | Purpose |
|-------|--------|---------|
| `type` | `diff` / `artifacts` / `freeform` | Determines context-adaptive preamble |
| `coordinates` | Diff range, artifact paths, or content | What specialists review |
| `output_dir` | Directory path | Where REVIEW-*.md files are written |
| `specialists` | `all` / names / `adaptive:N` | Which specialists to invoke |
| `interaction_mode` | `parallel` / `debate` | How specialists interact |
| `interactive` | `true` / `false` / `smart` | Trade-off escalation behavior |
| `specialist_models` | Model assignments | Per-specialist model selection |
| `framing` | Free text (optional) | Custom preamble for `freeform` type |

### Design Decisions

**Skill loading, not subagent**: paw-sot is loaded into the calling agent's session rather than spawned as a subagent. This preserves interactivity for trade-off decisions during debate mode and for moderator mode's specialist summoning.

**Two-invocation moderator mode**: The calling skill invokes paw-sot twice — once for orchestration+synthesis, then after handling its own resolution flow (apply/skip/discuss), a second time for moderator mode. This keeps resolution logic in the adapter while moderator mode stays in paw-sot (where specialist personas live).

**Context-adaptive preambles over specialist variants**: Rather than duplicating specialist personas for different review types, the engine injects a type-dependent preamble that reframes the specialist's cognitive strategy. This was informed by dogfooding where specialists applied their code-oriented strategies to plan review — identities/backstories worked without modification, but cognitive strategies needed reframing.

**Four-layer prompt composition**: Shared rules → context preamble → specialist content → review coordinates. The preamble sits between shared rules and specialist content so it frames how the specialist interprets its persona for the review type.

### Integration Points

- **paw-final-review** loads paw-sot for society-of-thought mode, mapping WorkflowContext.md fields to review context
- **paw-init** writes the WorkflowContext.md configuration fields (unchanged)
- **paw-workflow** lists paw-sot as a utility skill
- **Specialist discovery** uses 4-level precedence: review context `specialists` field (workflow), `.paw/personas/` (project), `~/.paw/personas/` (user), `references/specialists/` (built-in)

## User Guide

### For Existing Users

No workflow changes. If you're using society-of-thought mode for final review, everything works identically — `paw-final-review` delegates to `paw-sot` transparently. The same WorkflowContext.md configuration fields apply:

- `Final Review Mode: society-of-thought`
- `Final Review Specialists: all | adaptive:N | comma-separated`
- `Final Review Interaction Mode: parallel | debate`
- `Final Review Specialist Models: none | model pool | pinned`

### For Future Adapter Authors

To use paw-sot from a new calling skill:

1. Gather scenario-specific inputs (diff, artifacts, or freeform content)
2. Construct a review context with all required fields
3. Load `paw-sot` skill into the session
4. Invoke for orchestration+synthesis
5. Handle resolution from REVIEW-SYNTHESIS.md yourself
6. Optionally invoke again for moderator mode

## Limitations and Future Work

- **paw-planning-docs-review** does not yet use paw-sot (separate future issue)
- **paw-review-workflow** (#209) integration is a separate future issue
- **Direct user invocation** ("run SoT on X") is not yet supported
- Context-adaptive preambles are initial versions based on dogfooding — may need refinement as more review types are used
