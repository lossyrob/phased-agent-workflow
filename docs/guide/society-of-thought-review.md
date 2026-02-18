# Society-of-Thought Review

Society-of-thought is a Final Review mode that uses **specialist personas** — each with a unique cognitive strategy and behavioral rules — to review your implementation from genuinely different perspectives. Instead of running the same review prompt through multiple models, a panel of specialists independently analyzes your code, then a synthesis step merges their findings into a single prioritized report.

The society-of-thought engine is implemented as the `paw-sot` utility skill, which `paw-final-review` delegates to when `society-of-thought` mode is configured. This three-tier design separates concerns: `paw-sot` handles specialist discovery, selection, execution, and synthesis; `paw-final-review` handles review configuration, resolution (apply/skip/discuss), and workflow integration; and the user interacts only with `paw-final-review`.

## Why Perspective Diversity Matters

Traditional code review (whether human or AI) tends to look at code through one lens. A single reviewer might catch logic bugs but miss security implications. Multi-model review helps by adding model-architecture diversity, but every model still answers the same questions.

Society-of-thought adds **perspective diversity**: a security specialist traces data flows through trust boundaries, a performance specialist estimates computational costs, and an assumptions specialist questions whether the code should exist at all. Research shows that inspectors using different perspectives find non-overlapping defects — each perspective surfaces issues the others miss.

## Configuration

Society-of-thought is configured during workflow initialization (`paw-init`). The key fields in `WorkflowContext.md`:

| Field | Values | Default |
|-------|--------|---------|
| Final Review Mode | `society-of-thought` | `multi-model` |
| Final Review Specialists | `all`, comma-separated names, or `adaptive:<N>` | `all` |
| Final Review Interaction Mode | `parallel` or `debate` | `parallel` |
| Final Review Interactive | `true`, `false`, or `smart` | `smart` |
| Final Review Specialist Models | `none`, model pool, pinned pairs, or mixed | `none` |

!!! note "CLI Only"
    Society-of-thought is CLI-only for v1. In VS Code, configuring `society-of-thought` falls back to `multi-model` mode with a notification.

## Built-in Specialists

PAW ships with 9 built-in specialists, each using a distinct cognitive strategy:

| Specialist | Cognitive Strategy | Focus |
|-----------|-------------------|-------|
| **Security** | Threat modeling via attack-tree decomposition | Trust boundaries, data flows, blast radius |
| **Performance** | Quantitative estimation and bottleneck analysis | Computational costs, scaling behavior |
| **Assumptions** | Socratic questioning | Hidden assumptions, unstated requirements |
| **Edge Cases** | Boundary enumeration | Off-by-one, empty inputs, race conditions |
| **Maintainability** | Narrative walkthrough | Future engineer experience, cognitive load |
| **Architecture** | Pattern recognition | System-level fit, coupling, extensibility |
| **Testing** | Coverage gap analysis | Untested paths, assertion quality |
| **Correctness** | Specification-implementation correspondence | Logic errors, wrong operators, default paths |
| **Release Manager** | Release-impact analysis / deployment-path tracing | CI/CD changes, packaging, migration safety, rollback |

Every specialist includes **anti-sycophancy rules** — structural constraints that require each specialist to either identify a substantive concern or explain what they analyzed and why they found no issues. This prevents the "looks good to me" problem common in AI reviews.

## Interaction Modes

### Parallel Mode (Default)

All specialists review the diff independently and in parallel, then a synthesis agent merges their findings into `REVIEW-SYNTHESIS.md`. This is the fastest option and works well for most reviews.

```
Specialists (parallel) → Synthesis → REVIEW-SYNTHESIS.md
```

### Debate Mode

Specialists run in sequential rounds. After each round, a synthesis agent summarizes findings and poses targeted questions back to specific specialists. The debate terminates when no new substantive findings emerge (or after 3 rounds).

```
Round 1 (parallel) → Synthesis → Round 2 (targeted) → Synthesis → ...
```

Debate mode uses **hub-and-spoke mediation**: specialists see only the synthesis summary between rounds, never each other's raw findings. This preserves perspective independence while allowing productive disagreement.

!!! tip "When to Use Debate"
    Debate mode costs more tokens but produces more thorough reviews. Use it for critical changes, security-sensitive code, or architectural decisions where you want specialists to challenge each other's findings.

!!! warning "Token Cost Estimates"
    Debate mode token usage scales with specialist count and rounds. With 9 specialists and up to 3 rounds plus per-thread continuation (30-call budget), a full debate can consume 50+ subagent calls. For large diffs, consider using `adaptive:<N>` with a smaller N to control cost, or use parallel mode for routine reviews.

## Specialist Selection Modes

### All (Default)

All discovered specialists participate. With only the built-in roster, this means 9 specialists.

### Fixed List

Specify exactly which specialists to use:

```
Final Review Specialists: security, performance, testing
```

### Adaptive Selection

Let the agent analyze your diff and select the most relevant specialists:

```
Final Review Specialists: adaptive:3
```

The agent examines the change content, matches it against specialist domains, and selects up to N specialists. The selection rationale is documented in `REVIEW-SYNTHESIS.md`.

## Custom Specialists

You can create custom specialists at three levels, with most-specific-wins precedence:

| Level | Location | Scope |
|-------|----------|-------|
| Project | `.paw/personas/<name>.md` | Shared with team via Git |
| User | `~/.paw/personas/<name>.md` | Personal, all projects |
| Built-in | Bundled with PAW | Default roster |

A project-level specialist with the same filename as a built-in specialist overrides the built-in version.

!!! warning "Trust Model"
    Custom specialist files are loaded as agent instructions with full tool access. Only use persona files from trusted sources. Project-level specialists (`.paw/personas/`) are committed to the repository and should be reviewed like any other code contribution.

### Creating a Custom Specialist

A specialist file is a markdown document that defines a persona. The filename (without `.md`) becomes the specialist's name. Here's a scaffold:

```markdown
---
shared_rules_included: false
---

# Compliance Specialist

## Identity & Narrative Backstory

You are an expert in regulatory compliance with deep experience
in [your domain]. Describe formative experiences that shape how
you approach code review — incidents, lessons learned, and the
instincts they developed.

The backstory should be written in second person ("You are...")
and establish genuine expertise through specific, realistic
scenarios rather than generic credentials.

## Cognitive Strategy

**[Name your strategy and describe it.]**

Describe the structured analytical process this specialist
follows when examining a diff. This should be genuinely
different from other specialists — not just a different topic,
but a different WAY of analyzing code.

Example strategies:
- Threat modeling (security)
- Quantitative estimation (performance)
- Socratic questioning (assumptions)
- Boundary enumeration (edge cases)

## Behavioral Rules

- Specific rules that guide this specialist's review behavior
- Each rule should be actionable and distinct
- Include what the specialist looks for and what it refuses
  to accept

## Shared Rules

See `_shared-rules.md` for Anti-Sycophancy Rules and
Confidence Scoring.

## Demand Rationale

Before evaluating code, describe what context this specialist
needs to see in order to do its job. What should it flag if
that context is missing?

## Shared Output Format

See `_shared-rules.md` for Required Output Format (Toulmin
structure). Use `**Category**: <name>` where `<name>` is this
specialist's category.

## Example Review Comments

Include 2-3 example findings that demonstrate this specialist's
cognitive strategy in action. Use the Toulmin format from the
shared rules (Finding → Grounds → Warrant → Rebuttal Conditions
→ Suggested Verification).
```

### Tips for Effective Specialists

- **Distinct cognitive strategies matter more than distinct topics.** A "database specialist" that reviews code the same way as a general reviewer adds little. A specialist that estimates query plans and calculates I/O costs adds real value.
- **Narrative backstories improve consistency.** Research shows that detailed persona narratives help models maintain character better than bullet-point role descriptions.
- **Anti-sycophancy is structural, not stylistic.** The shared rules enforce that every specialist must produce substantive analysis. Don't override these in custom specialists.
- **Use `shared_rules_included` frontmatter.** Set to `true` only if your custom specialist includes its own anti-sycophancy rules, confidence scoring, and Toulmin output format. When `false` (default), shared rules are automatically injected.
- **Include example findings.** 2-3 examples in the Toulmin format (Grounds → Warrant → Rebuttal → Verification) anchor the specialist's behavior more effectively than additional instructions.

## The Synthesis Agent

The synthesis agent operates as a **PR triage lead** — a functional role with structural constraints. It can merge, deduplicate, classify conflicts, and flag trade-offs, but it **cannot generate new findings**. This prevents the synthesis step from introducing hallucinated issues that no specialist actually raised.

Key synthesis behaviors:

- **Confidence-weighted aggregation** — Findings supported by multiple specialists with high confidence rank higher
- **Grounding validation** — Findings referencing code not in the diff are flagged as ungrounded and demoted
- **Evidence-based adjudication** — When specialists disagree, the synthesis examines reasoning traces rather than counting votes

The output is `REVIEW-SYNTHESIS.md` in `.paw/work/<work-id>/reviews/`.

## Interactive Moderator Mode

When `Final Review Interactive` is `true` or `smart`, you can interact with specialists after the review completes:

- **Summon** a specialist by name for follow-up on a specific area
- **Challenge** a finding — the specialist must respond with independent evidence
- **Request deeper analysis** on a particular file or function

With `smart` mode, interactive sessions activate only when significant findings (must-fix or should-fix) are present. If the review produces only `consider` items, it completes without interruption.

## Model Assignment

By default, all specialists use the session's default model. You can add model-architecture diversity in two ways: workflow-level configuration and per-specialist frontmatter.

### Workflow-Level Configuration

Set `Final Review Specialist Models` in WorkflowContext.md (configured during `paw-init`):

**Model pool** — distribute models round-robin across specialists:

```
Final Review Specialist Models: gpt-5.3-codex, claude-opus-4.6, gemini-3-pro-preview
```

**Explicit pinning** — assign specific models to specific specialists:

```
Final Review Specialist Models: security:claude-opus-4.6, architecture:gpt-5.3-codex
```

**Mixed** — pin some specialists, pool the rest:

```
Final Review Specialist Models: security:claude-opus-4.6, gpt-5.3-codex, gemini-3-pro-preview
```

In mixed mode, pinned specialists get their assigned model. Unpinned specialists are sorted alphabetically and assigned models from the pool list round-robin.

### Per-Specialist Frontmatter

Custom specialists (in `.paw/personas/` or `~/.paw/personas/`) can specify a model in their YAML frontmatter:

```yaml
---
model: claude-opus-4.6
---
```

### Resolution Precedence

When multiple sources specify a model, the most specific wins:

1. **Specialist frontmatter** `model:` field (highest priority)
2. **WorkflowContext pinning** (`specialist:model` pair)
3. **WorkflowContext pool** (round-robin distribution)
4. **Session default** (fallback)

## Next Steps

- [Stage Transitions](stage-transitions.md) — How review policies affect the workflow
- [Workflow Modes](workflow-modes.md) — Configure Full, Minimal, or Custom modes
- [Artifacts Reference](../reference/artifacts.md) — All PAW artifacts including REVIEW-SYNTHESIS.md
