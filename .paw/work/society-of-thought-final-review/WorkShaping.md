# Work Shaping: Society-of-Thought Final Review Mode

## Problem Statement

PAW's final review currently offers two modes: `single-model` (one model reviews) and `multi-model` (same prompt, different models in parallel). Both provide model-architecture diversity but no **perspective diversity** — the review criteria are identical regardless of mode.

The Society of Thought paper (arXiv:2601.10825) demonstrates that enhanced reasoning emerges from simulating multi-agent interactions with distinct personality traits and domain expertise. Applied to code review, this means a panel of specialist personas — each with a unique identity, cognitive strategy, and value system — should surface findings that no single-perspective review would catch.

Research on Perspective-Based Reading (Basili et al. 1996) confirms this: overlap of defects found among inspectors using different perspectives is low, and PBR teams achieve better coverage than checklist-based or ad-hoc reading. Notably, PBR's biggest weakness with humans (only 20% follow their assigned perspective) is eliminated entirely with AI agents.

## Core Concept

Add `society-of-thought` as a third Final Review mode. A panel of specialist personas — each with a distinct identity, cognitive strategy, and anti-sycophancy rules — independently reviews the implementation, then a synthesis agent merges findings with grounding validation.

## Key Design Decisions

### Scope
- **Final review only** (third mode alongside `single-model` and `multi-model`)
- **CLI only** for v1 (VS Code support is a natural follow-up)
- Does not subsume multi-model; they're distinct diversity sources (model architecture vs. persona/prompt)

### Specialist Management — Hybrid with 4-Level Precedence
Specialist rosters follow a 4-level precedence (most specific wins):
1. **Workflow** (per-work-item in WorkflowContext.md) — select/disable specialists for this work item
2. **Project** (`.paw/specialists/` or similar) — team-wide customizations, version-controlled
3. **User** (`~/.paw/specialists/`) — personal specialists across all projects
4. **Built-in defaults** (defined in the skill itself)

### Specialist Selection Modes
Two configurable modes for choosing which specialists participate:
- **Fixed**: Explicit list of specialists selected at init (or inherited from config precedence)
- **Adaptive**: Agent analyzes the diff and selects up to N specialists (configurable max) based on relevance to the actual changes

### Interaction Modes
Two modes, configurable per work item:
- **Parallel + synthesize** (default): All specialists review independently, synthesis agent merges findings. Faster, order-independent.
- **Debate** (opt-in): Sequential rounds with hub-and-spoke communication — specialists see synthesized round summaries (not raw findings from each other). Synthesis agent mediates, posing targeted questions to specific specialists about disagreements. Adaptive termination: stops when no new substantive findings emerge, hard cap at 3 rounds.

### Specialist Format
Free-form markdown prompt files. File name = specialist identity. Content is a full persona description the agent interprets — not a checklist. Documentation provides a recommended scaffold template.

### Model-per-Specialist (Optional)
Specialist definitions can optionally specify a preferred model. Enables combined perspective + model diversity. If unspecified, uses the session's default model. Power user feature; built-in defaults specify no model preference.

### Output Artifact
Single synthesized `GapAnalysis.md` with specialist attribution and confidence levels. Iterate to per-specialist files later if the single doc proves unwieldy.

### Synthesis Agent Behavior
- Confidence-weighted aggregation (not majority voting) — weighs findings by stated confidence and evidence quality
- Grounding validation — verifies each finding is grounded in the actual diff, dismisses persona-induced hallucinations
- Evidence-based adjudication — examines reasoning traces, not just conclusions

### User Interaction (Interactive Mode)
Maps to existing `interactive: true/false/smart` config. When interactive:
- After initial review + synthesis, user enters a **moderator** role
- Can **summon a specialist** for follow-up ("explain why you flagged line 42")
- Can **request deeper analysis** on a specific area
- Can **challenge a finding** (specialist must respond with independent evidence)
- Specialists maintain their persona when responding

### Anti-Sycophancy Structural Rules
All personas include mandatory behavioral rules to counter RLHF-induced agreeableness:
- "You MUST identify at least one substantive concern per review"
- "You MUST present independent evidence before agreeing with another reviewer"
- "Prioritize finding real issues over maintaining harmony"
- Devil's Advocate gets strongest forcing: must surface a concrete challenge that could change the merge decision

### Context/Understanding as Cross-Cutting Concern
Each persona's behavioral rules include: "Before evaluating code, assess whether you understand WHY this change was made. If rationale is unclear, flag it."

## Built-in Specialist Roster (5 personas)

Research-backed roster of 5 (DeepMind scaling study: performance plateaus at 4, diminishing returns beyond 5). Each has a **distinct cognitive strategy** per DMAD (ICLR 2025) finding that reasoning strategy diversity > topic diversity.

### 1. The Security Paranoid
- **Cognitive strategy**: Threat modeling / attack-tree decomposition
- **Identity**: Former incident responder who's been paged at 3 AM. Skeptical of optimistic assumptions. Thinks like an attacker first, then a defender.
- **Behavioral rules**: Traces data flows from untrusted boundaries to sinks. Builds attack trees from every external input. Asks "what's the blast radius?"

### 2. The Scalability Skeptic
- **Cognitive strategy**: Quantitative back-of-envelope estimation
- **Identity**: Performance engineer who's seen systems crumble under load. Puts numbers on everything. Pragmatic — will say "this is fine at your scale" when it is.
- **Behavioral rules**: Calculates actual impact (O(n) at projected scale = X ms). Doesn't flag vague "performance concerns."

### 3. The Devil's Advocate
- **Cognitive strategy**: Socratic first-principles questioning
- **Identity**: Distinguished engineer who doesn't assert — asks questions that expose assumptions. Challenges whether the code should exist at all.
- **Behavioral rules**: Escalates with NEW challenges each round (doesn't repeat). Each question forces justification. Acts as rationale auditor.

### 4. The Edge Case Bloodhound
- **Cognitive strategy**: Systematic boundary enumeration
- **Identity**: Obsessive about what happens at the boundaries. Thinks in failure modes, not happy paths. Value is exhaustiveness, not creativity.
- **Behavioral rules**: Methodically enumerates: null, empty, max, concurrent, interrupted, partially failed, timed out, duplicate, out of order.

### 5. The Empathetic Maintainer
- **Cognitive strategy**: Narrative code walkthrough
- **Identity**: Thinks about the person reading this code at 2 AM during an incident. Cares about future-you.
- **Behavioral rules**: "I land on this function — do I understand what it does? Can I trace the flow? Does the test tell me what this is supposed to do?" Addresses the largest category of real review findings (75% are maintainability per Mäntylä & Lassenius).

Each built-in persona includes 2-3 example review comments demonstrating their cognitive strategy and communication style.

## Open Questions for Spec

- Exact format/location for specialist files at each precedence level
- How adaptive selection presents its choices to the user (or just auto-selects silently)
- Whether interactive moderator mode needs special UX (or just works through normal chat)
- Integration with existing `Final Review Mode` / `Final Review Interactive` config fields in WorkflowContext.md
- Whether synthesis agent needs its own persona or runs "neutral"

## Related Issues

- #201 — Society-of-thought for Final Agent Review (this issue)
- #209 — Society-of-thought for PAW Review (same concept, different workflow)
- #200 — Base Final Agent Review infrastructure (dependency)
