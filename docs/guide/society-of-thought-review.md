# Society-of-Thought Review

Society-of-thought is a review mode that uses **specialist personas** — each with a unique cognitive strategy and behavioral rules — to review code from genuinely different perspectives. Instead of running the same review prompt through multiple models, a panel of specialists independently analyzes the code, then a synthesis step merges their findings into a single prioritized report.

The society-of-thought engine is the `paw-sot` skill. Both workflows load it in the host session when a review is configured with `mode: society-of-thought`; it handles specialist discovery, selection, execution and synthesis, and the calling workflow handles the findings.

| Workflow | Review | Review type | After synthesis |
|----------|--------|-------------|-----------------|
| **Implementation** | `plan_review` | `artifacts` (`ImplementationPlan.md`, plus `Spec.md` and `CodeResearch.md` if present) | Must-fix and should-fix findings go back to the plan or spec subagent as revisions |
| **Implementation** | `final_review` | `diff` (`git diff <base>...<target>` and the plan) | Must-fix and should-fix findings go back to an implement subagent as revisions |
| **PAW Review** | Evaluation | `diff` | Findings feed the feedback, critique and posting stages |

In the implementation workflow, findings are resolved without asking you; a finding that needs a product decision or a trade-off comes to you as a decision. In PAW Review, society-of-thought replaces impact and gap analysis.

## Why Perspective Diversity Matters

Traditional code review (whether human or AI) tends to look at code through one lens. A single reviewer might catch logic bugs but miss security implications. Multi-model review helps by adding model-architecture diversity, but every model still answers the same questions.

Society-of-thought adds **perspective diversity**: a security specialist traces data flows through trust boundaries, a performance specialist estimates computational costs, and an assumptions specialist questions whether the code should exist at all. Research shows that inspectors using different perspectives find non-overlapping defects — each perspective surfaces issues the others miss.

### Perspective Overlays

Perspective diversity goes even further with **perspective overlays** — evaluative lenses that shift *when* and *under what conditions* a specialist reviews without changing *who* they are. A security specialist running under a **premortem** perspective ("it's 6 months after launch and the system was breached") will surface different risks than the same specialist reviewing under standard present-tense framing.

PAW ships with three built-in perspectives:

| Perspective | Lens Type | Focus |
|------------|-----------|-------|
| **Premortem** | Temporal | 6-month post-launch failure analysis — "what went wrong?" |
| **Retrospective** | Temporal | 6-month operational review — "what's painful to maintain?" |
| **Red Team** | Adversarial | Exploitation analysis — "how would an attacker abuse this?" |

Perspectives are configured at three tiers:

- **Auto** (default in the implementation workflow): The engine analyzes your diff and selects relevant perspectives — temporal for operational changes, adversarial for security-sensitive code
- **Guided**: Specify perspectives by name (e.g., `premortem, red-team`)
- **None** (default in PAW Review): No perspective overlays — standard present-tense review only

The `perspective_cap` setting (default: 2) limits how many perspectives each specialist runs, controlling cost. With 3 specialists and 2 perspectives each, you get 6 specialist-perspective runs instead of 3.

Each finding in the review output includes a `**Perspective**` attribution showing which lens surfaced it, and the `REVIEW-SYNTHESIS.md` includes a Perspective Diversity section summarizing which perspectives were applied and why.

## Configuration

### Implementation Workflow

Set `plan_review` or `final_review` to a society-of-thought provider block in a preset or in your request:

```yaml
final_review:
  mode: society-of-thought
  specialists: adaptive:4
  interaction: debate
  perspectives: auto
  perspective_cap: 2
  models: none
```

| Field | Values | Default |
|-------|--------|---------|
| `specialists` | `all`, names, or `adaptive:<N>` | `all` |
| `interaction` | `parallel` or `debate` | `parallel` |
| `models` | `none`, model pool, `specialist:model` pairs, or mixed | `none` |
| `perspectives` | `none`, `auto`, or names | `auto` |
| `perspective_cap` | positive integer | `2` |

The `thorough` preset uses society-of-thought for both reviews: `parallel` for the plan, `debate` for the final review. The engine runs non-interactively and moderator mode is skipped. See [Review Providers](workflow-presets.md#review-providers).

### PAW Review

PAW Review records the same provider block in `ReviewContext.md`, with `mode: single-model` (default) or `society-of-thought`, plus `interactive`:

| Field | Default |
|-------|---------|
| `specialists` | `all` |
| `interaction` | `parallel` |
| `models` | `none` |
| `perspectives` | `none` |
| `perspective_cap` | `2` |
| `interactive` | `false` (`true` or `smart` pause for your decision on trade-offs) |

Findings from `REVIEW-SYNTHESIS.md` map into the comment pipeline as must-fix → Must, should-fix → Should, consider → Could. Moderator mode is skipped.

If `paw-sot` cannot be loaded or produces no `REVIEW-SYNTHESIS.md`, the review is blocked and reported; no other reviewers are substituted.

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

```yaml
specialists: security, performance, testing
```

### Adaptive Selection

Let the agent analyze your diff and select the most relevant specialists:

```yaml
specialists: adaptive:3
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
context: implementation
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

### Context Filtering

Specialists can declare a domain context in their frontmatter, allowing callers to filter to only relevant specialists for their review type. This enables domain-specific reviews where implementation specialists (security, performance, etc.) don't participate when reviewing non-code content like business plans or documentation.

**Declaring context in a specialist:**

```yaml
---
context: business
---
```

Each specialist declares a single context value — comma-separated or array values are not supported.

**Filtering by context:** Callers specify `context: <domain>` in the review context. Only specialists with matching context (case-insensitive) participate.

**Default behaviors:**

- Specialists without a `context` field default to `implementation`
- For `diff` and `artifacts` review types without explicit context, filtering defaults to `implementation`
- For `freeform` review type without explicit context, no filtering occurs (all specialists participate)

**Zero-match handling:** If no specialists match the requested context:

- In **interactive** or **smart** mode, SoT warns you and asks how to proceed
- In **non-interactive** mode, SoT warns and falls back to all specialists

This means typos in context values are recoverable — you'll always get a clear warning rather than a silent failure.

All 9 built-in specialists have `context: implementation`. To create specialists for other domains (compliance, business analysis, etc.), add the appropriate `context` field to your custom specialist's frontmatter.

!!! tip
    For `freeform` reviews of non-code content, always specify `context` to ensure only relevant specialists participate. Without an explicit `context`, all specialists are included regardless of domain.

## Custom Perspectives

You can create custom perspective overlays at three levels, with the same most-specific-wins precedence as specialists:

| Level | Location | Scope |
|-------|----------|-------|
| Project | `.paw/perspectives/<name>.md` | Shared with team via Git |
| User | `~/.paw/perspectives/<name>.md` | Personal, all projects |
| Built-in | Bundled with PAW | Default roster (premortem, retrospective, red-team) |

A project-level perspective with the same filename as a built-in perspective overrides the built-in version.

### Creating a Custom Perspective

A perspective file defines an evaluative lens. The filename (without `.md`) becomes the perspective's name. Required sections:

```markdown
# Compliance Perspective

## Lens Type
custom

## Parameters
- **Temporal Frame**: N/A
- **Scenario**: Evaluating code against regulatory requirements

## Overlay Template
You are reviewing this code for regulatory compliance violations. As the
{specialist}, identify requirements gaps, audit trail deficiencies, and
data handling violations specific to your domain. Focus on what a
compliance auditor would flag during certification review.

## Novelty Constraint
Each compliance concern must reference a specific code pattern, data flow,
or missing control visible in the artifact. Do not raise generic
compliance concerns that apply to any system.
```

Key requirements:

- The `{specialist}` placeholder in the Overlay Template is resolved at runtime with the specialist's name
- Overlay Templates should be 50–100 words — long enough to shift the evaluative frame, short enough not to compete with the specialist's cognitive strategy
- The Novelty Constraint should require evidence-anchoring to prevent unconstrained speculation

## The Synthesis Agent

The synthesis agent operates as a **PR triage lead** — a functional role with structural constraints. It can merge, deduplicate, classify conflicts, and flag trade-offs, but it **cannot generate new findings**. This prevents the synthesis step from introducing hallucinated issues that no specialist actually raised.

Key synthesis behaviors:

- **Confidence-weighted aggregation** — Findings supported by multiple specialists with high confidence rank higher
- **Grounding validation** — Findings referencing code not in the diff are flagged as ungrounded and demoted
- **Evidence-based adjudication** — When specialists disagree, the synthesis examines reasoning traces rather than counting votes

The output is `REVIEW-SYNTHESIS.md` in the review's output directory: `.paw/work/<work-id>/reviews/planning/` (plan review), `.paw/work/<work-id>/reviews/` (final review), or `.paw/reviews/<identifier>/` (PAW Review).

## Model Assignment

By default, all specialists use the session's default model. You can add model-architecture diversity in two ways: workflow-level configuration and per-specialist frontmatter.

### Workflow-Level Configuration

Set `models` in the society-of-thought provider block:

**Model pool** — distribute models round-robin across specialists:

```yaml
models: [gpt-5.3-codex, claude-opus-4.6, gemini-3-pro-preview]
```

**Explicit pinning** — assign specific models to specific specialists:

```yaml
models: [security:claude-opus-4.6, architecture:gpt-5.3-codex]
```

**Mixed** — pin some specialists, pool the rest:

```yaml
models: [security:claude-opus-4.6, gpt-5.3-codex, gemini-3-pro-preview]
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
2. **Provider block pinning** (`specialist:model` pair)
3. **Provider block pool** (round-robin distribution)
4. **Session default** (fallback)

## Next Steps

- [Configuration and Presets](workflow-presets.md#review-providers) — Review provider blocks
- [Artifacts Reference](../reference/artifacts.md) — All PAW artifacts including REVIEW-SYNTHESIS.md
