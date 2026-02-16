# Society-of-Thought Final Review

## Overview

Society-of-thought is a third Final Review mode for PAW that replaces uniform review prompts with specialist personas — each with a distinct cognitive strategy, narrative backstory, and behavioral rules. Where `single-model` sends one prompt to one model and `multi-model` sends the same prompt to multiple models, `society-of-thought` sends different prompts (specialist personas) to independent subagents, then synthesizes findings through a structurally-constrained triage process.

The design is grounded in two research traditions: the Society of Thought paper (arXiv:2601.10825) demonstrating improved reasoning through multi-agent perspective simulation, and Perspective-Based Reading (Basili et al. 1996) showing that inspectors using different perspectives find non-overlapping defects.

## Architecture and Design

### High-Level Architecture

Society-of-thought operates in three phases:

1. **Specialist Discovery** — Resolve the roster from 4 precedence levels (workflow config → project `.paw/personas/` → user `~/.paw/personas/` → built-in `references/specialists/`)
2. **Specialist Execution** — Launch subagents with layered prompts (shared rules + specialist content + review context), either all in parallel or in sequential debate rounds
3. **Synthesis** — A structurally-constrained "PR triage lead" merges findings using confidence-weighted aggregation, grounding validation, and evidence-based adjudication

### Design Decisions

**Layered prompt composition**: Specialist prompts are composed from three layers — shared rules (`_shared-rules.md`), specialist content, and review context (diff + spec + plan). This separates concerns: shared rules enforce consistency (anti-sycophancy, output format), specialist content provides perspective, and review context provides the material. Custom specialists from project/user levels automatically get shared rules injected unless they already contain an `## Anti-Sycophancy Rules` heading.

**Hub-and-spoke debate mediation**: In debate mode, specialists never see each other's raw findings — they only see the synthesis agent's round summary. This preserves perspective independence across rounds while allowing productive disagreement. The topology is based on sparse communication research (EMNLP 2024) showing that limiting inter-agent exposure prevents misleading convergence.

**Synthesis agent as functional role**: The synthesis agent is a "PR triage lead" — not persona-less (research shows true neutrality is unachievable) but structurally constrained to only merge, deduplicate, classify, and flag trade-offs. It cannot generate new findings. This prevents the synthesis step from hallucinating issues no specialist raised.

**Anti-sycophancy as structural rules**: Rather than personality suggestions ("be critical"), anti-sycophancy is enforced through mandatory behavioral constraints: every specialist must produce substantive analysis or provide a detailed examination rationale. This is grounded in research showing RLHF training pushes models toward agreement unless structurally prevented.

**8 built-in specialists with distinct cognitive strategies**: The roster size (8) balances the DeepMind scaling study sweet spot (~5 agents) with coverage needs (architecture, testing, and correctness fill gaps the core 5 don't cover). Each specialist uses a genuinely different analytical method, not just a different focus area — this is informed by DMAD research (ICLR 2025) showing that strategy diversity outperforms persona diversity.

### Integration Points

- **paw-final-review skill** (`skills/paw-final-review/SKILL.md`): Core implementation — specialist discovery, execution orchestration, synthesis protocol
- **paw-init skill** (`skills/paw-init/SKILL.md`): Configuration fields for society-of-thought mode, specialist selection, and interaction mode
- **paw-status skill**: Displays society-of-thought configuration when active
- **Specialist files** (`skills/paw-final-review/references/specialists/`): Built-in specialist personas and shared rules
- **paw-specification.md**: Specification-level documentation of Final Review modes

## User Guide

### Prerequisites

- PAW CLI installed and configured
- A workflow with `Final Review Mode: society-of-thought` in WorkflowContext.md
- Final Agent Review must be `enabled` (enforced by paw-init)

### Basic Usage

Society-of-thought activates automatically during final review when configured. No special commands are needed — the standard `continue` flow through implementation triggers it at the appropriate point.

Configuration is set during `paw-init`:
- Mode: `society-of-thought`
- Specialists: `all` (default), fixed list, or `adaptive:<N>`
- Interaction: `parallel` (default) or `debate`
- Interactive: `smart` (default), `true`, or `false`

### Advanced Usage

**Adaptive selection** (`adaptive:3`): The agent analyzes the diff and selects the N most relevant specialists based on change content. Selection rationale is documented in REVIEW-SYNTHESIS.md.

**Debate mode**: Sequential rounds with synthesis between each. Terminates when no new findings emerge or after 3 global rounds. Per-thread continuation allows up to 2 additional targeted exchanges for contested findings, with a 30-subagent aggregate budget.

**Per-specialist models**: Add `model: <model-name>` in YAML frontmatter of a specialist file to run that specialist on a specific model, combining perspective diversity with model-architecture diversity.

**Custom specialists**: Create `.md` files in `.paw/personas/` (project) or `~/.paw/personas/` (user) following the persona template. Project-level specialists override user-level and built-in specialists with the same filename.

## Configuration Options

| Field | Values | Default | Description |
|-------|--------|---------|-------------|
| Final Review Mode | `society-of-thought` | `multi-model` | Enables specialist persona review |
| Final Review Specialists | `all`, names, `adaptive:<N>` | `all` | Which specialists participate |
| Final Review Interaction Mode | `parallel`, `debate` | `parallel` | How specialists interact |
| Final Review Interactive | `true`, `false`, `smart` | `smart` | Post-review moderator session |

## Testing

### How to Test

1. Initialize a workflow with `Final Review Mode: society-of-thought`
2. Complete implementation phases through to final review
3. Verify REVIEW-SYNTHESIS.md is created in `.paw/work/<work-id>/reviews/`
4. Check that findings are attributed to distinct specialists with confidence levels
5. For debate mode, verify round progression in the synthesis output
6. For interactive mode, summon a specialist by name and verify in-character response

### Edge Cases

- **Empty diff**: Final review reports no changes and skips specialist execution
- **Zero specialists after discovery**: Falls back to built-in defaults with a warning
- **Malformed specialist file**: Skipped with a warning; remaining roster continues
- **Adaptive selects 0**: Reports change is too small for society-of-thought, suggests single-model
- **Debate with 1 specialist**: Falls back to parallel mode (debate requires ≥2 perspectives)
- **Unavailable model in specialist**: Falls back to session default with a warning

## Limitations and Future Work

- **CLI only for v1**: VS Code falls back to multi-model mode when society-of-thought is configured (see issue #240)
- **Final review only**: Society-of-thought is not available for implementation review, planning docs review, or the PAW Review workflow
- **No automated persona drift detection**: Specialists may drift from their persona over long reviews; no re-injection mechanism exists
- **No effectiveness metrics**: No built-in scoring of which specialists produce the most valuable findings
