# Research Synthesis: Temporal Perspective Shifts for SoT Engine

This document synthesizes findings from five analyses: three independent research reports (Claude Sonnet 4.7, Gemini, GPT-Pro) and two cross-cutting synthesis lenses (GPT 5.2 divergence analysis, Opus 4.6 consensus analysis). It distills what we know, what we don't, and what to build.

---

## What the Research Confirms (Build on This)

Seven findings carry high confidence across all sources and both synthesis lenses:

1. **Temporal reframing changes what LLMs find.** Prospective hindsight (premortem) activates different reasoning pathways than present-tense evaluation. Framing effects shift LLM outputs by 10–30 percentage points (Shafiei et al. 2025). Metacognitive reframing produces findings entirely absent from initial responses (Hills 2026). The cognitive science foundation is 30+ years deep (Klein, Mitchell et al.).

2. **Perspective diversity and model diversity are non-redundant.** Prompt/perspective choice explains ~36% of output quality variance; model choice explains ~41% (Haase et al. 2026). Combining both explores a richer space than either alone. Different models respond to prompt variations in non-overlapping ways.

3. **Self-MoA beats Mixed-MoA under quality asymmetry.** Running a strong model through diverse perspectives outperforms mixing it with weaker models (6.6% improvement on AlpacaEval 2.0, Li et al. 2025). This means perspective shifts are not a fallback — they can be the *primary* diversity mechanism.

4. **Genuine role diversity is essential; identical roles degrade performance.** ChatEval (Chan et al., ICLR 2024) demonstrates this empirically. Same role description = redundant output. Same role + different lens = novel output.

5. **Reasoning strategy diversity > persona label diversity.** "You are a security expert" adds little. A shifted analytical lens (premortem vs. present-tense) adds a lot (DMAD, DiMo).

6. **Diversity follows an inverted U-curve.** Adding perspectives/agents/rounds improves quality up to a point, then degrades. Practical ceiling: 2–3 combined axes, 2–3 debate rounds. Extreme heterogeneity causes instability and coherence collapse.

7. **Perspectives must be additive frames, not identity replacements.** All sources converge on a three-layer prompt architecture: Identity (stable specialist) → Lens (variable perspective, ~50–100 words) → Task (structured output). The phrasing "Remain the Security Specialist. Apply the following temporal lens..." preserves identity while shifting the evaluative frame.

---

## Where the Research Diverges (Design Decisions Required)

The divergence analysis surfaced five genuine tensions requiring architectural choices:

### Tension 1: First-Class Concept vs. Configuration Layer

| Approach | Advocates | Trade-off |
|----------|-----------|-----------|
| **Decorator / config layer** | Claude research | Simple conceptual model; risks prompt drift, loses versioning/calibration |
| **Hybrid: first-class asset, runtime overlay** | Gemini research | Governs lifecycle (ID, schema, version, tests); moderate complexity |
| **Full first-class entity** | GPT-Pro research | Maximum traceability and routing; highest conceptual overhead |

**Decision for SoT**: Adopt Gemini's hybrid — perspectives are first-class assets (discoverable files with schema, versioning) but applied as composable overlays at runtime. This gets Claude's compositional simplicity with Gemini/GPT-Pro's governance. Specifically:
- Perspective files live alongside specialist files (`.paw/perspectives/` or `references/perspectives/`)
- Each perspective has: name, lens type, parameters (horizon, assumptions), prompt overlay text, novelty constraints
- At runtime, the engine composes Specialist × Perspective as an additive prompt — decorator semantics
- This is promotable: if perspectives prove independently valuable (e.g., applied across different systems), the interface is already there

### Tension 2: Conflict Resolution Strategy

| Approach | Advocates | When to use |
|----------|-----------|-------------|
| **Surface conflicts, don't resolve** | Claude research | When the user wants decision support with explicit uncertainty |
| **Spawn refutation round** | GPT-Pro research | When evidence exists to distinguish competing hypotheses |
| **Negotiator / statistical aggregation** | Gemini research | When automated adjudication is needed at scale |

**Decision for SoT**: Layered approach — surface by default, with optional escalation:
1. **Default**: Tag and present conflicting findings with temporal context and confidence scores
2. **Interactive mode**: Offer the user the option to trigger a targeted refutation round
3. **Automated mode**: Use confidence-weighted synthesis (ReConcile pattern, up to 11.4% improvement over majority voting)

### Tension 3: Fixed Saturation Caps vs. Adaptive Stopping

Claude's research provides concrete numeric ceilings (2–3 axes, 2–3 rounds, 3–6 agents). Gemini/GPT-Pro propose adaptive mechanisms (novelty-based stopping, graph pruning).

**Decision for SoT**: Start with Claude's caps as defaults, add adaptive stopping as an optimization. Specifically:
- Default: max 2 perspective overlays per specialist, max 2 debate rounds
- Adaptive override: if marginal novelty (incremental unique findings) drops below threshold, stop early regardless of cap
- This gets the safety of fixed limits with the efficiency of adaptive pruning

### Tension 4: Priority Axes After Temporal

All agree temporal is first. After that:
- Claude: adversarial stance (collaborative vs. red-team)
- Gemini: operational lens ("oncall at 3am"), then adversarial, then lifecycle
- GPT-Pro: adversarial critique, then maintenance lens

**Decision for SoT**: Implement three initial perspective presets:
1. **Premortem** — "This system failed 6 months after launch. What went wrong?" (causal hypotheses)
2. **Retrospective** — "This has been in production for 6 months. What signals did we miss?" (observability/guardrail gaps)  
3. **Red-team** — "An attacker has been studying this system for months. Where do they get in?" (adversarial)

Defer operational lens and lifecycle lens to the second wave — they have weaker cross-source support and more overlap with temporal framing.

### Tension 5: Model-Class Dependency

GPT-Pro claims RL-trained reasoning models already internalize perspective diversity, potentially making external perspective overlays less valuable. Claude argues alignment *flattens* diversity, making overlays more necessary. Gemini treats this as model-dependent and advocates calibration.

**Decision**: Treat as unknown — include in experimental validation. The feature should work regardless, with adaptive value depending on model capabilities.

---

## Validated Unknowns (Experiment Before Assuming)

Six gaps are confirmed across all sources — these are not disagreements, they're areas where no evidence exists:

1. **No empirical study of temporal framing in code review.** All design recommendations extrapolate from QA benchmarks, creative tasks, and planning exercises. The transfer is plausible but unvalidated.

2. **Marginal value of temporal framing vs. model diversity in code review — unquantified.** The SoT engine's early experiments are genuinely novel territory.

3. **Optimal temporal horizon granularity is unknown.** All sources default to "6 months" with no empirical justification for that specific duration.

4. **Long-term perspective coherence over extended reviews is untested.** Whether agents maintain their assigned frame over thousands of tokens of code review is unknown.

5. **"Same role, shifted lens" vs. "different role" — no direct comparison.** The theoretical case is strong but no paper has measured the trade-off.

6. **Cross-model robustness of perspective prompts requires per-model calibration.** Prompt sensitivity varies across models (up to 40pp performance swings from minor perturbations). Naive reuse across model families won't work.

---

## Design Sketch for Implementation

```
Perspective Discovery (4-level precedence, parallel to specialists):
  workflow → project (.paw/perspectives/) → user (~/.paw/perspectives/) → built-in

Perspective File Schema:
  name: premortem
  type: temporal
  parameters:
    horizon: 6 months
    scenario: system failure
    assumptions: [traffic growth, dependency churn, team rotation]
  overlay: |
    Remain the {specialist}. Apply the following temporal lens: imagine this 
    code has been in production for 6 months and caused a significant incident. 
    What failure modes does this change introduce or fail to protect against? 
    Tie each predicted failure to specific evidence in the artifact or label 
    it as speculative operational risk.
  novelty_constraint: |
    Do not repeat generic code review advice. Prioritize risks that emerge 
    specifically because of the temporal frame — operational, scaling, 
    exploitation over time, maintenance drift.

Runtime Composition:
  specialist_prompt = identity_layer + perspective_overlay + task_layer
  
  Where:
    identity_layer = specialist persona (domain, cognitive strategy, backstory)
    perspective_overlay = perspective.overlay.replace("{specialist}", name)
    task_layer = Toulmin output schema + review coordinates

Budget-Aware Selection:
  Stage 1: Baseline pass (present-tense, no perspective overlay)
  Stage 2: Apply 1-2 perspectives selected by:
    - Artifact signals (auth code → security retrospective)
    - Risk estimation (high complexity → premortem + red-team)
    - Novelty gap from Stage 1 (coverage gaps → targeted lens)
  Stage 3: Stop when incremental novelty < threshold

Synthesis:
  - Deduplicate via effective semantic diversity (quality-gated)
  - Tag findings with perspective attribution
  - Surface conflicts with temporal context (don't auto-resolve)
  - Confidence-weighted aggregation for final ranking
```

---

## Metrics for Validating the Feature

| Metric | What it measures | Target |
|--------|-----------------|--------|
| **Incremental novelty rate** | Findings from perspective variants absent in baseline | >20% unique findings per perspective |
| **Unique semantic cluster count** | Finding diversity across the full set | Higher with perspectives than without |
| **Redundancy ratio** | Total findings / unique clusters | <2.0 (low redundancy) |
| **Signal-to-noise** | Validated findings per token spent | Equal or better than baseline |
| **Category distribution shift** | Whether temporal framing surfaces different finding categories | Measurable shift toward operational/integration concerns |
| **Perspective adherence** | Whether agents maintain frame over long reviews | >80% on probe questions |

---

## Key Citations (Shared Across Sources)

These papers form the empirical backbone of the feature design:

| Paper | Key Finding | Relevance |
|-------|-------------|-----------|
| Klein 2007 (HBR) | Premortem unlocks "permission to dissent" | Foundation for temporal perspective technique |
| Mitchell, Russo & Pennington 1989 | Prospective hindsight increases reason generation | Cognitive science mechanism |
| Veinott & Lehman 2024 (HCII) | LLMs generate meaningful premortem content | Validates LLM transfer |
| Shafiei et al. 2025 | Framing shifts LLM predictions 10–30pp | Quantifies framing effect |
| Hills 2026 ("Could You Be Wrong") | Metacognitive reframing reveals hidden information | Mechanism for perspective diversity |
| Haase et al. 2026 | Prompt: 36% variance, Model: 41% variance | Quantifies non-redundancy |
| Li et al. 2025 (Self-MoA) | Single strong model + diverse prompts > mixed ensemble | Most decision-relevant finding |
| Chan et al. 2024 (ChatEval) | Diverse roles essential; identical roles degrade | Empirical case for perspective diversity |
| Jin et al. 2024 (AgentReview) | Role attributes produce 37% decision variation | Review-specific social dynamics |
| DMAD (Breaking Mental Set) | Reasoning strategy diversity > persona labels | Validates lens > label |
| DIPPER (NeurIPS 2024) | Prompt diversity creates reasoning pathway diversity | Mechanism for same-model ensembling |
| Forde et al. 2024 | Self-BLEU + Distinct-N + BERTScore capture orthogonal dimensions | Diversity measurement framework |
