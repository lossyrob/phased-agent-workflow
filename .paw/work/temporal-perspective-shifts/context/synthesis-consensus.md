# Consensus Synthesis: Temporal Perspective Shifts for Multi-Agent Review

This document identifies where three independent research reports converge on claims, design principles, and evidence. Sources are referenced as **Claude research** (claude-sonnet-4.7-research.md), **Gemini research** (gemini-research.md), and **GPT-Pro research** (gpt-pro-research.md). The goal is precision: every claim here is supported by at least two sources, most by all three.

---

## 1. Strongest Consensus Findings

### 1.1 Temporal reframing produces measurably different LLM outputs from standard evaluation

**Confidence: High — grounded in empirical cognitive science plus LLM framing studies**

All three sources agree that instructing an LLM to reason from a future retrospective (prospective hindsight / premortem) activates different reasoning pathways than present-tense evaluation, producing findings that would not appear under standard prompting.

- **Claude research**: Cites Shafiei et al. (2025) showing framing terms shift LLM predictions by 10–30 percentage points across GPT, Claude, and Qwen families. Cites Hills (2026) demonstrating that metacognitive reframing ("could you be wrong?") produces error identification and alternatives that are entirely absent from initial responses.
- **Gemini research**: Cites the HiFo Prompt framework showing temporal lens acts as a "high-level search strategy controller" that switches agents between exploration (future-oriented) and exploitation (historically-grounded). Notes that LLMs can "effectively transform sparse feedback into dense signals through retrospective in-context learning."
- **GPT-Pro research**: Cites Mitchell, Russo, and Pennington (1989) as the foundational empirical study of prospective hindsight increasing the number and actionability of generated reasons. Cites DeFrame (2026) showing LLM outputs vary substantially across semantically equivalent frames, making temporal framing "a controllable diversity axis."

**Evidence type**: The cognitive science foundation (Mitchell et al. 1989, Klein 2007) is empirical and replicated. The LLM framing sensitivity evidence (Shafiei et al. 2025, DeFrame 2026) is empirical with multi-model validation. The mechanism — framing changes the model's search space — is theoretical but consistent across all sources. No source disputes this claim.

### 1.2 Self-MoA outperforms Mixed-MoA when model quality varies significantly

**Confidence: High — direct empirical comparison**

All three sources cite Li et al. (2025, "Rethinking Mixture-of-Agents") and arrive at the same conclusion: when one model is substantially stronger than others, running that model with diverse prompts (Self-MoA) outperforms mixing it with weaker models.

- **Claude research**: Reports Self-MoA achieves 6.6% improvement on AlpacaEval 2.0 over Mixed-MoA. States "weaker models drag down the ensemble."
- **Gemini research**: Cites the same finding, noting "mixing different LLMs often lowers the average quality of the ensemble."
- **GPT-Pro research**: Explicitly names Self-MoA and frames it as evidence that "prompt diversity can substitute for model diversity."

**Design consequence**: Perspective diversity within a strong model is not a fallback strategy — it is often the *optimal* strategy. This is the single most decision-relevant empirical finding for SoT engine design because it means perspective shifts are not merely additive to model diversity; they can *replace* model diversity when model quality is uneven.

### 1.3 Prompt/perspective diversity and model diversity are non-redundant

**Confidence: High — variance decomposition plus ensemble studies**

All three sources agree these are largely independent axes, each capturing information the other misses.

- **Claude research**: Cites Haase et al. (2026) variance decomposition — prompt choice explains 36.4% of output quality variance, model choice explains 40.9%, within-model stochasticity ~22%. Also cites ProSA finding that prompt sensitivity varies across models with "basically zero" overlap in failure patterns.
- **Gemini research**: Cites DIPPER showing prompt diversity injects "different reasoning pathways" beyond what stochastic sampling provides.
- **GPT-Pro research**: Frames model and perspective diversity as "two knobs that reduce correlation in different ways" and recommends measuring correlation explicitly to allocate budget.

**Evidence type**: The Haase et al. variance decomposition is the strongest piece — it quantifies the relative contributions directly. The DIPPER and ProSA findings provide mechanism-level support. All three sources treat the non-redundancy as established fact.

### 1.4 Diverse role prompts are essential; identical roles degrade performance

**Confidence: High — replicated empirical finding**

All three sources cite ChatEval (Chan et al., ICLR 2024) as demonstrating that agents with the same role description perform *worse* than agents with genuinely different perspectives.

- **Claude research**: "Diverse role prompts are essential — identical role descriptions degrade performance."
- **Gemini research**: "Using the same role description across agents degrades performance."
- **GPT-Pro research**: "Role prompts work when they are actually different, not 'same template with different names.'"

Additionally, all three cite AgentReview (Jin et al., EMNLP 2024) showing that role attributes (commitment, intention, knowledgeability) produce measurable outcome variation (37.1% decision variation due to reviewer biases — Claude research).

### 1.5 Reasoning strategy diversity outperforms persona label diversity

**Confidence: Moderate-high — consistent finding across sources, fewer independent studies**

- **Claude research**: Cites DMAD ("Breaking Mental Set") finding that agents using distinct reasoning approaches outperform both self-reflection and traditional persona-based debate. Cites Zheng et al. (2024) showing simple persona prompts ("You are a lawyer") do not improve accuracy-based tasks.
- **Gemini research**: Cites DMAD and notes that "shifted lens" approach — same domain expert with different cognitive strategies — proves more effective at breaking homogeneous reasoning paths than different persona labels alone.
- **GPT-Pro research**: Supports this indirectly via the ChatEval finding and emphasis on lens shifts producing non-redundant output even when domain stays constant.

**Implication**: For SoT design, this means the temporal/contextual lens on a specialist is more valuable than adding a new specialist with a different title. The label is not the diversity — the reasoning frame is.

### 1.6 Diversity exhibits an inverted U-curve with diminishing returns

**Confidence: High — convergent evidence from multiple study designs**

All three sources agree that adding perspectives, agents, or debate rounds has diminishing and eventually negative returns.

- **Claude research**: Cites Zhang et al. (2024) finding that more agents/rounds don't always improve outcomes and continuous self-reflection leads to hallucination. Cites the value diversity study (arXiv:2512.10665) directly validating an inverted U-curve. States the practical ceiling as "2–3 diversity axes combined, with 2–3 debate rounds."
- **Gemini research**: References diversity collapse under extreme heterogeneity and notes that "adding too many personas can make the debate unstable."
- **GPT-Pro research**: Cites Multi-LLM Debate (Estornell & Liu, NeurIPS 2024) showing correlated responses create echo chambers while excessive diversity causes divergence. Also notes "more agents is not automatically better review."

### 1.7 Perspectives should be additive frames, not identity replacements

**Confidence: High — convergent design recommendation from all sources**

Every source independently arrives at the same architectural pattern: the perspective lens should be layered on top of the specialist persona, not replace it.

- **Claude research**: "Temporal framing should be implemented as an 'additive frame' rather than a replacement for persona identity." Recommends ~50–100 word system prompt addenda.
- **Gemini research**: Provides a three-block prompt architecture (Persona Block → Backstory Block → Perspective Shift) where the perspective is explicitly separate from identity.
- **GPT-Pro research**: Proposes a three-layer contract (Identity/Lens/Task) and provides explicit phrasing: "Remain the Security Specialist. Apply the following temporal lens..."

This convergence is strengthened by the fact that each source arrives at it from different reasoning:
- Claude research derives it from Decorator pattern analysis and DSPy's separation of concerns
- Gemini research derives it from SimToM and prompt architecture research
- GPT-Pro research derives it from "The Prompt Makes the Person(a)" (Lutz et al.) showing that small persona prompt changes accidentally overwrite identity

---

## 2. Convergent Design Principles

### 2.1 Budget-aware perspective selection prevents combinatorial explosion

All three sources independently recommend against running every perspective on every specialist, proposing instead a selection mechanism that scales with artifact complexity.

| Source | Mechanism | Key Reference |
|--------|-----------|---------------|
| Claude research | Complexity Estimator: simple artifacts → 1 perspective, complex → 2-3. Cites MALBO (65.8% cost savings) and DAAO (11.21% accuracy improvement at 64% cost) | MALBO, DAAO, DyLAN |
| Gemini research | Adaptive Graph Pruning (AGP): embeds task + agent profiles into latent space, prunes via GCN backbone. Reports up to 90% token reduction | AGP, Google Research 2025 |
| GPT-Pro research | Staged execution: baseline pass → perspective overlay on novelty gaps → stop when marginal novelty drops below threshold | DIPPER selection logic |

**Why convergence strengthens confidence**: The three sources propose different *mechanisms* (estimator, graph pruning, staged execution) but agree on the *principle*: perspective application should be demand-driven, not exhaustive. The convergence on principle despite divergent implementation paths suggests this is a robust design constraint, not an artifact of one analytical framework.

### 2.2 Temporal framing should be the first perspective axis implemented

All three sources rank temporal framing as the highest-priority perspective axis for initial implementation.

- **Claude research**: "Implement temporal framing first. The evidence base is strongest... it's the most orthogonal to existing domain-based diversity."
- **Gemini research**: Lists premortem (prospective hindsight) as Priority #1 and states it "produces the most differentiated finding set from baseline reviews."
- **GPT-Pro research**: "Temporal lens (highest ROI)" — ranked #1 with reasoning that it's grounded in human evidence, produces different error surfaces, and maps to review tasks.

**Reasoning paths**:
- Claude research arrives via evidence strength ranking and orthogonality analysis
- Gemini research arrives via the differentiation-from-baseline criterion
- GPT-Pro research arrives via the intersection of evidence strength, error surface novelty, and task applicability

All three also agree on the **second** axis: adversarial stance (red-teaming / "find the cracks"). And all three deprioritize the same axis: experience-level perspectives (junior vs. senior), which Claude research explicitly notes "produces subset rather than orthogonal findings."

### 2.3 Conflicts between temporal perspectives should be surfaced, not auto-resolved

All three sources recommend preserving inter-perspective disagreements as high-signal information.

- **Claude research**: Cites GraphGeo finding that conflict edges produce the greatest performance gain (6.8% drop when removed). Explicitly recommends "conflicts are surfaced, not auto-resolved."
- **Gemini research**: Proposes a "Negotiator" module for resolution but emphasizes that the spatiotemporal conflict itself contains information.
- **GPT-Pro research**: States "temporal conflict is often not 'one is wrong,' it's 'they optimized different objective functions.'" Recommends a refutation round where an arbiter produces "the minimum set of tests/evidence that would distinguish the hypotheses."

**Design consequence**: The synthesis layer should tag and present conflicts with their temporal context rather than picking a winner. This is counter to naive majority-voting approaches and is supported by the strongest empirical evidence of the three design principles (the GraphGeo ablation study).

### 2.4 Findings should be structured data objects, not free text

All three sources converge on the need for structured finding representation to enable diversity measurement and synthesis.

- **Claude research**: Recommends deduplication via "effective semantic diversity" — diversity measured only among findings that pass a quality threshold. Cites Forde et al. (2024) on metric families.
- **Gemini research**: Proposes that findings be normalized into a "shared ontology: design flaw, implementation defect, operational risk, exploitation risk" with temporal qualifiers.
- **GPT-Pro research**: Most explicit — proposes a finding schema with: category, claim, evidence anchor, severity, confidence, suggested mitigation, temporal tag, and assumption tags. States "if you don't do this, diversity measurement becomes vibes."

---

## 3. Shared Evidence Base

### Papers cited by all three sources

| Paper | Cited As | Significance |
|-------|----------|-------------|
| **Veinott & Lehman 2024** (Adaptive Planning: Comparing Human and AI Responses in Premortem Planning, HCII 2024) | The first empirical comparison of human vs. LLM premortem behavior | Validates that premortem technique transfers to LLMs |
| **Gary Klein's premortem** (HBR 2007 and related work) | Foundational technique for prospective hindsight | Establishes the cognitive science mechanism |
| **ChatEval** (Chan et al., ICLR 2024) | Multi-agent evaluation with diverse role prompts | Provides the empirical case that diversity is essential, not optional |
| **AgentReview** (Jin et al., EMNLP 2024) | Multi-agent peer review simulation | Demonstrates social dynamics (bias, groupthink, convergence) in agent review |
| **Self-MoA / Rethinking MoA** (Li et al., 2025) | Single strong model outperforms mixed ensemble | Most decision-relevant finding for model vs. prompt diversity trade-off |
| **DIPPER** (Lau/Hu et al., NeurIPS 2024/EMNLP 2025) | Same-model prompt ensembling | Demonstrates prompt diversity creates reasoning pathway diversity |
| **DMAD** (Breaking Mental Set) | Reasoning strategy diversity > persona label diversity | Claude and Gemini cite explicitly; GPT-Pro's emphasis on genuine differentiation reflects same finding |

### Papers cited by two of three sources

| Paper | Sources | Significance |
|-------|---------|-------------|
| Mitchell, Russo, & Pennington 1989 | Gemini, GPT-Pro | Original prospective hindsight study |
| DeFrame (2026) | Gemini, GPT-Pro | Quantifies framing disparity in LLMs |
| PromptBridge (2025) | Gemini, GPT-Pro | Model drifting — prompts are model-sensitive |
| Multi-LLM Debate (Estornell & Liu, NeurIPS 2024) | Gemini, GPT-Pro | Echo chamber risks and diversity pruning interventions |
| AutoSafeCoder | Gemini, GPT-Pro | Tool-augmented validation loop pattern |
| CodeAgent | Gemini, GPT-Pro | Multi-agent code review automation |
| SPP (Solo Performance Prompting) | Claude, Gemini | Dynamic persona generation outperforms static assignment |
| DyLAN | Claude, Gemini | Agent importance scoring and dynamic pruning |

### What the citation overlap reveals

The shared citation base clusters around four pillars:
1. **Cognitive science of temporal reframing** (Klein, Mitchell et al.) — mature, replicated, well-understood
2. **Multi-agent debate dynamics** (ChatEval, AgentReview, Multi-LLM Debate, DMAD) — active research area, 2024-vintage empirical studies
3. **Ensemble diversity mechanics** (DIPPER, Self-MoA, Boosted Prompt Ensembles) — 2024-2025, strong empirical backing
4. **Prompt engineering and robustness** (PromptBridge, DeFrame, "The Prompt Makes the Person(a)") — 2025-2026, emerging but consistent findings

The cognitive science pillar is the most mature (30+ years). The multi-agent debate pillar has the most empirical studies but is still pre-2025 in methodology. The prompt engineering pillar is youngest and most likely to shift as models evolve. **The absence of any code-review-specific temporal framing study across all citation lists confirms this is genuinely novel territory.**

---

## 4. Reliable Heuristics

### High confidence (cited with numbers across multiple sources)

| Heuristic | Value | Sources | Evidence Type |
|-----------|-------|---------|---------------|
| Prompt diversity share of output quality variance | ~36% | Claude (Haase et al. 2026 — 36.4%), GPT-Pro (DIPPER's demonstrated gains) | Direct variance decomposition study |
| Model diversity share of output quality variance | ~41% | Claude (Haase et al. 2026 — 40.9%) | Direct variance decomposition study |
| Self-MoA improvement over Mixed-MoA | ~6.6% on AlpacaEval 2.0 | Claude, Gemini, GPT-Pro (all citing Li et al. 2025) | Benchmark comparison |
| Framing effect magnitude on LLM outputs | 10–30 percentage points | Claude (Shafiei et al. 2025) | Multi-model empirical study |
| Debate rounds before diminishing returns | 2–3 rounds | Claude (explicit), Gemini (implied via diversity collapse), GPT-Pro (implied via staged execution) | Multiple studies |
| Combined diversity axes before coherence collapse | 2–3 axes | Claude (explicit ceiling), Gemini (extreme heterogeneity → instability), GPT-Pro (layering collapses coherence) | Convergent observation |

### Moderate confidence (cited by one source with numbers, supported directionally by others)

| Heuristic | Value | Primary Source | Corroborating Sources |
|-----------|-------|---------------|----------------------|
| Small model ensemble vs. large single model | 3× Qwen2-1.5B with diverse prompts > 1× Qwen2-7B | Claude (DIPPER) | GPT-Pro (DIPPER reference) |
| Perspective overlay prompt length | ~50–100 words as system prompt addendum | Claude (design sketch) | GPT-Pro (emphasis on "modular and minimal") |
| Prompt length ceiling for comprehension | ~500 words, -12% per 100 words beyond | Claude | Not contradicted |
| Optimal few-shot example count | 2–6 examples | Claude | Not contradicted |
| Sweet spot for diverse agent count | 3–6 agents | Claude (synthesis of Du et al. scaling) | GPT-Pro (2-4 perspectives in auto mode) |
| Cost savings from adaptive pruning | Up to 65–90% token reduction | Claude (MALBO: 65.8%), Gemini (AGP: 90%) | Different mechanisms, similar magnitude |
| Confidence-weighted synthesis improvement | Up to 11.4% over majority voting | Claude (ReConcile) | Not contradicted |

### Heuristics to treat as provisional

The 36%/41% variance decomposition (Haase et al.) is the most precise number in the entire evidence base, but it comes from a single study on creative writing tasks — not code review. All three sources treat it as actionable, but the transfer to code review is assumed, not demonstrated. The 2–3 round ceiling is more robust because it appears across multiple study designs and task types.

---

## 5. Consensus on Unknowns

These are gaps where all three sources agree the evidence does not yet exist. These are **validated research gaps** — not areas of disagreement, but areas where disagreement is impossible because no one has looked.

### 5.1 No empirical study of temporal framing in code review

- **Claude research**: "No study has directly tested temporal framing in multi-agent code review."
- **Gemini research**: "Most published LLM work does not yet quantify 'temporal framing increases true defect recall in code review.' That's a research gap, not a red flag."
- **GPT-Pro research**: Lists "effect size on true-positive findings" as an open question.

This is the single most important unknown. Every design recommendation in all three reports rests on transferring findings from QA benchmarks, creative tasks, and planning exercises to code review. The transfer is plausible but unvalidated.

### 5.2 Marginal value of temporal framing over model diversity — unquantified

- **Claude research**: "No study has quantified the *marginal* value of temporal framing over model diversity or persona diversity in code review specifically."
- **GPT-Pro research**: "On code review specifically, does cross-model diversity dominate prompt diversity, or are they complementary? (Needs ablations on SWE-bench-like tasks or real PR datasets.)"
- **Gemini research**: Frames this as needing explicit measurement — "Spend budget on whichever one reduces measured redundancy more."

### 5.3 Optimal temporal horizon granularity is unknown

- **Gemini research**: Notes the question but provides no answer.
- **GPT-Pro research**: Explicitly asks "is '6 months' meaningfully different from '1 year' for LLMs, or do you need larger scenario shifts?"
- **Claude research**: Does not address granularity directly but assumes 6-month frame without justification beyond convention.

All three default to 6 months as a starting point, but none cites evidence for this specific duration.

### 5.4 Long-term perspective coherence over extended reviews is untested

- **Claude research**: "No study has tested whether agents maintain perspective coherence over long review sessions (thousands of tokens of code)."
- **GPT-Pro research**: "Where in the prompt hierarchy should lens live for maximum stability across providers?"
- **Gemini research**: Notes that persona identity is "fragile under prompt edits" (citing "The Prompt Makes the Person(a)").

### 5.5 "Same role, shifted lens" vs. "different role" — no direct comparison exists

- **Claude research**: "No paper directly compares 'same domain expert with different framing' versus 'different domain expert.'"
- **GPT-Pro research**: Lists "'Same role, shifted lens' vs 'different role' efficiency" as an open question.
- **Gemini research**: The question is implicit in the discussion but not answered.

### 5.6 Cross-model robustness of perspective prompts requires per-model calibration

- **GPT-Pro research**: Cites PromptBridge showing "model drifting" is common and severe; recommends per-model calibration.
- **Claude research**: Cites enterprise study showing minor prompt perturbations reduce performance by up to 40 percentage points.
- **Gemini research**: Cites PromptBridge and notes that perspective prompts "may need per-model calibration."

This is not purely an unknown — it's a known problem with unknown solutions. The consensus is that naively reusing perspective prompts across models will not work, but the calibration methodology is undeveloped.

---

## 6. Actionable Consensus for SoT Engine Design

These are design decisions where the research base is strong enough to build on without waiting for further evidence. Each decision is stated as a specific commitment, not a general principle.

### Decision 1: Implement temporal framing as the first perspective axis, using prospective hindsight (premortem) as the primary technique

**Supported by**: All three sources rank temporal framing as highest priority. The cognitive science evidence (Klein, Mitchell et al.) is mature and replicated. LLM framing sensitivity (Shafiei et al., DeFrame) confirms the mechanism transfers. The technique is most valuable for code that "appears straightforward but harbors subtle issues" (Claude research, citing Li/Yang/Ettinger 2024 on overconfidence).

**Specific implementation**: Two canonical temporal modes per specialist persona:
- **Premortem**: "This system failed 6 months after launch. What went wrong?" (causal hypotheses)
- **Retrospective**: "This system has been in production for 6 months. What signals did we miss? What mitigations would have prevented failure?" (observability/guardrail gaps)

Both GPT-Pro and Gemini independently arrive at this exact two-mode decomposition, noting they produce different types of output (causal hypotheses vs. observability gaps).

### Decision 2: Implement perspectives as additive prompt overlays with a three-layer architecture

**Supported by**: All three sources converge on identical layered prompt structure.

**Specific implementation**:
- **Layer 1 — Identity (stable)**: Domain expertise, cognitive strategy, backstory, invariants. This is the specialist persona. Never modified by perspective application.
- **Layer 2 — Lens (variable)**: Temporal framing, scenario assumptions, novelty constraints. Applied as a system prompt addendum of ~50–100 words. Includes an explicit directive to maintain identity: "Remain the [Specialist]. Apply the following temporal lens: ..."
- **Layer 3 — Task (stable)**: Structured output schema, evidence requirements, artifact reference.

**Periodic reinforcement**: Claude research recommends restating the perspective frame at key points in multi-turn interactions to prevent drift. GPT-Pro's novelty constraint ("Do not repeat generic advice; prioritize risks that emerge because of this temporal frame") serves the same purpose.

### Decision 3: Prioritize perspective diversity over model diversity when model quality is uneven

**Supported by**: Self-MoA finding (all three sources), Haase et al. variance decomposition (Claude), DIPPER mechanism (all three). When using a strong frontier model, running it through multiple perspective frames will likely outperform mixing it with weaker models.

**Specific implementation**: When the SoT engine has access to models of uneven quality, allocate budget to perspective variants on the strongest model first. Add cross-model diversity only when models are of comparable quality. Measure redundancy (semantic similarity of finding sets) to validate the allocation.

### Decision 4: Use budget-aware staged execution, not exhaustive Cartesian product

**Supported by**: All three sources recommend against N×M×P exhaustive execution. The staged approach (GPT-Pro) aligns with DIPPER's prompt selection logic (all three) and MALBO's cost optimization (Claude).

**Specific implementation**:
- **Stage 1**: Run each specialist with baseline (present-tense) analysis
- **Stage 2**: Apply 1–2 perspective overlays selected by artifact signals (auth code → security retrospective, complex concurrency → performance under scale). GPT-Pro's "stop when marginal novelty drops below threshold" is the termination criterion.
- **Default**: Simple artifacts get 1 perspective; complex/high-risk get 2–3

### Decision 5: Surface inter-perspective conflicts with temporal attribution rather than auto-resolving

**Supported by**: GraphGeo's ablation study showing 6.8% performance drop when conflict edges are removed (Claude). GPT-Pro's framing of temporal conflict as "different objective functions." Gemini's Negotiator concept that preserves conflict information.

**Specific implementation**: When pre-launch and post-mortem framings produce contradictory assessments, present both findings with their temporal tag and scenario assumptions. Optionally trigger a targeted refutation round (GPT-Pro's arbiter pattern) that asks: "what evidence would decide between these positions?"

### Decision 6: Measure perspective value via effective semantic diversity, not finding volume

**Supported by**: Claude research (Forde et al. metrics, effective semantic diversity framework). GPT-Pro (novelty rate, redundancy ratio, precision estimate). Gemini (semantic entropy, quality thresholds).

**Specific implementation**: Track four metrics:
1. **Unique semantic cluster count** across the finding set (embedding-based clustering)
2. **Incremental novelty rate** — findings from perspective variants that don't appear in the baseline pass
3. **Redundancy ratio** — total findings / unique clusters (lower is better)
4. **Signal-to-noise** — validated findings per token/dollar spent

Quality gate: Measure diversity only among findings that pass a minimum quality threshold (actionable, specific, evidence-anchored). This prevents rewarding hallucinated operational risks (a concern raised by all three sources).

---

## 7. Foundation for Experimentation

Based on the consensus unknowns (§5), the following experiments would fill the highest-priority gaps. Experimental design draws on methodologies used in the cited studies.

### Experiment 1: Temporal framing effect size in code review

**Gap addressed**: §5.1 — no empirical study of temporal framing in code review

**Design**:
- **Corpus**: 30–50 PRs with known issues (a mix of seeded defects and real historical post-incident PRs where the causal code change is known)
- **Conditions**:
  - Control: Standard review prompt ("Review this PR for issues")
  - Treatment A: Premortem frame ("This change caused an incident 6 months after merge. What went wrong?")
  - Treatment B: Retrospective frame ("This has been in production for 6 months. What maintenance/operational issues have emerged?")
- **Metrics**: True positive recall (against known issues), false positive rate, unique finding count, finding categories (does temporal framing surface *different categories* of issues?)
- **Model**: Single strong model to isolate framing effect from model variance
- **Hypothesis based on consensus**: Treatment A and B will produce higher recall on operational/integration issues and lower recall on surface-level code style issues, with the total unique finding set (Control ∪ A ∪ B) being larger than any individual condition. Expected effect size: 10–30% shift in finding distribution (extrapolated from Shafiei et al. framing effect magnitude).

### Experiment 2: Marginal value of perspective diversity vs. model diversity

**Gap addressed**: §5.2

**Design**:
- **Conditions** (matched for total token budget):
  - A: 1 model × 3 perspectives per specialist
  - B: 3 models × 1 perspective (standard review) per specialist
  - C: 3 models × 3 perspectives per specialist (the full matrix, as a ceiling measurement)
- **Corpus**: Same as Experiment 1
- **Metrics**: Unique semantic cluster count, recall against known issues, redundancy ratio
- **Control**: Single model, single perspective, single pass
- **Hypothesis based on consensus**: Condition A will approach Condition C's recall more closely than Condition B (based on Self-MoA outperforming Mixed-MoA and ~36% vs ~41% variance decomposition suggesting near-parity)

### Experiment 3: Perspective coherence over review length

**Gap addressed**: §5.4

**Design**:
- **Corpus**: PRs of varying size (small: <100 lines, medium: 100–500, large: 500+)
- **Measurement**: At review start, midpoint, and end, inject a probe question testing whether the agent still reasons from its assigned temporal frame (e.g., "What is the biggest risk?" — does the answer reflect the premortem frame or revert to present-tense?)
- **Conditions**: No reinforcement vs. reinforcement every N tokens
- **Metric**: Perspective adherence score (percentage of probe responses that reflect the assigned frame)
- **Hypothesis based on consensus**: Coherence will degrade for large PRs without reinforcement. The prompt engineering literature (Claude research: -12% comprehension per 100 words beyond 500) suggests a measurable decay curve.

### Experiment 4: Horizon granularity sensitivity

**Gap addressed**: §5.3

**Design**:
- **Conditions**: Same premortem frame with different horizons: 1 week, 1 month, 6 months, 2 years
- **Metrics**: Semantic similarity between condition outputs (do different horizons produce genuinely different findings?), finding category distribution
- **Hypothesis**: There is a minimum horizon threshold below which output converges with standard review, and the category distribution shifts (short horizon → immediate bugs, long horizon → architectural/maintenance concerns). The 6-month default used by all three sources may be empirically justified or may be arbitrary.

### Experiment 5: Same-role-shifted-lens vs. different-role efficiency

**Gap addressed**: §5.5

**Design**:
- **Conditions** (matched for agent count):
  - A: 1 security specialist × 3 temporal lenses
  - B: 3 different specialists (security, performance, architecture) × 1 lens each
  - C: 3 specialists × 2 lenses each (ceiling)
- **Metrics**: Unique finding count, category coverage (does A produce findings across multiple categories despite single-domain persona?), recall against known issues
- **Hypothesis based on consensus**: Condition B will have higher category coverage. Condition A will have higher within-category depth. Condition C will dominate both but at 2× cost — the question is whether A or B is the better budget allocation when C is too expensive.

---

## Summary of Confidence Levels

| Claim | Confidence | Basis |
|-------|-----------|-------|
| Temporal reframing changes LLM outputs | **High** | Empirical (multi-study) |
| Self-MoA ≥ Mixed-MoA under quality asymmetry | **High** | Empirical (benchmark) |
| Prompt and model diversity are non-redundant | **High** | Empirical (variance decomposition) |
| Diverse roles essential, identical roles harmful | **High** | Empirical (replicated) |
| Reasoning strategy > persona label for diversity | **Moderate-high** | Empirical (few studies, consistent) |
| Inverted U-curve for diversity | **High** | Empirical (convergent multi-study) |
| Additive frame architecture | **High** | Convergent design recommendation |
| Temporal framing as first axis | **High** | Convergent prioritization |
| Conflict surfacing > auto-resolution | **Moderate-high** | One ablation study + convergent recommendation |
| 2–3 debate rounds optimal | **Moderate** | Convergent observation, no code-review-specific data |
| 3–6 agents as sweet spot | **Moderate** | Extrapolated from non-code-review studies |
| 6-month default horizon | **Low** | Convention, no empirical justification |
| Temporal framing improves code review recall | **Hypothesized** | No direct evidence; strong analogical support |
