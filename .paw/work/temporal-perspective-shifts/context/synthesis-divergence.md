# Divergence Synthesis: Temporal Perspective Shifts for Multi‑Agent Review Systems

This document is *not* a combined summary; it maps where the three sources disagree (or pull in different directions), what trade-offs each emphasizes, and where the evidence does not converge.

Sources referenced as:
- **Claude research** = `claude-sonnet-4.7-research.md`
- **Gemini research** = `gemini-research.md`
- **GPT‑Pro research** = `gpt-pro-research.md`

---

## 1) Architectural disagreements (first‑class concept vs configuration layer vs decorators)

### A. What “perspective” *is* in the architecture

- **Claude research: “perspectives as composable decorators,” explicitly *not* entities.** It argues: “**Perspectives as decorators, not entities**” and frames perspectives as “cross-cutting concerns” best expressed via the Decorator pattern to avoid “N×M perspective combinations” and “subclass explosion.” It further recommends: “**Start as a configuration layer, promote to first-class if warranted**,” i.e., treat perspectives as prompt modifiers with a stable interface, but keep the conceptual model centered on specialists.

- **Gemini research: hybrid stance—first‑class asset, applied as overlay/patch at runtime.** It warns that a “mere string parameter” loses “**versioning, evaluation history, per-model calibration, reuse**,” but also warns full first-class can create “complexity and precedence confusion.” Its resolution is explicit: “**Perspective is a first-class asset (has an ID, schema, version, tests). At runtime it is applied as a ‘prompt patch’ to a persona, with explicit precedence rules** (persona identity is invariant…).”

- **GPT‑Pro research: strongly pro first‑class concept / architectural layer.** It states: “**Perspective should be implemented as a First-Class Concept**,” proposing “Perspective Artifacts” with “temporal constraints, cognitive prompts, and success criteria.” It claims the trade-off is decisive: “A configuration layer is easier to implement but leads to ‘prompt drift’ and makes it difficult to scale…; a first-class approach allows the engine to treat a persona-perspective pair as a unique ‘skill’ that can be indexed, searched, and pruned.”

**Divergence tension:**
- Claude’s core fear is *conceptual and combinatorial complexity* (avoid new entity types; keep perspectives as wrappers).
- Gemini and GPT‑Pro foreground *operational lifecycle concerns* (versioning/testing/calibration/auditability) as a reason to make perspectives explicit assets.

### B. What the trade-offs actually are (and where they disagree)

- **Complexity vs governance.**
  - Claude emphasizes simplicity: perspectives are “prompt modifiers (decorators)” and should remain secondary to “specialists” unless proven.
  - Gemini/GPT‑Pro emphasize governability: without first-class-ness you cannot manage “model drifting” (Gemini cites PromptBridge) or trace “why” a finding was produced (GPT‑Pro’s traceability/auditability rationale).

- **Where the combinatorial explosion is “solved.”**
  - Claude solves it via *software composition* (decorators) + *budget-aware selection* (MALBO/DAAO style) but still within a config-layer mental model.
  - Gemini solves it via *execution staging* (“Stage 1 baseline… Stage 2 choose perspectives… Stage 3 stop when marginal novelty drops below a threshold”) plus perspective-level selection (“DIPPER spirit”), and argues first-class perspective assets enable that.
  - GPT‑Pro solves it via *graph pruning* (AGP: “token usage reductions of up to 90%”) and a *Director → Perspective Assignment → Hard-Pruning* pipeline, which presumes perspectives are addressable objects in a routing/pruning system.

- **Risk of identity override / precedence.**
  - Claude: “Perspectives should be layered atop the existing persona narrative rather than replacing it” and warns “role-play combined with chain-of-thought can degrade performance,” motivating small, additive frames.
  - Gemini makes precedence/immutability a primary architectural requirement (“persona identity is invariant”), implying you need explicit composition semantics.
  - GPT‑Pro implies stronger narrative embedding (“persona-embedded narrative” + system-level frame) to mitigate omniscience and stabilize framing, pulling toward deeper integration than Claude’s “small addendum” approach.

---

## 2) Priority disagreements (which axes first, and why)

### A. The sources partially agree on “temporal first,” but diverge on what comes next

- **Claude research: Temporal framing first; adversarial stance second.** It says “**Implement temporal framing first**” (pre-launch vs post-mortem) and “**second axis should be adversarial stance** (collaborative vs ‘find the cracks’ red-team).” It explicitly deprioritizes “experience-level perspectives” and “optimistic/pessimistic framing.”

- **Gemini research: Temporal first, but expands the near-term set to include operational + lifecycle lenses.** Its explicit ordering is:
  1) “**Temporal lens (highest ROI)**” (premortem + retrospective; begin with “6 months”),
  2) “**Operational lens** (‘oncall at 3am’ framing),”
  3) “**Adversarial lens** (attacker had 6 months),”
  4) “**Lifecycle lens** (legacy migration vs greenfield).”
  It also explicitly says not to start with “optimist vs pessimist.”

- **GPT‑Pro research: Premortem + adversarial + maintenance.** It recommends prioritizing:
  - “**The Premortem (Prospective Hindsight)**,”
  - “**The Adversarial Critique (Red Teaming)**,”
  - “**The Maintenance Lens (Future Tense)**” (legacy migration / long-term maintainability).

**Divergence tension:**
- Claude frames “temporal” as most orthogonal to existing domain specialists (“changes *when* you evaluate, not *what* you evaluate”), so it dominates.
- Gemini treats temporal as a family that should be parameterized and supplemented by *operational realism* (“oncall at 3am”), effectively splitting temporal vs operational into separate axes.
- GPT‑Pro treats “maintenance lens” as co-equal priority with premortem/adversarial; Claude mentions migration framing only as an example in a composition sketch, not as a top-2 axis.

### B. What drives the priority disagreement

- **Evidence base vs product value vs routing feasibility.**
  - Claude’s prioritization is justified by “strongest evidence base” and orthogonality; it argues temporal reframing maps to “premortem/prospective hindsight” and benefits overconfidence mitigation.
  - Gemini’s prioritization is driven by *review task mapping* (what surfaces “observability gaps, runbooks, rollback, blast radius”), and it repeatedly stresses preventing “storytelling” by requiring evidence anchors and labeling speculation.
  - GPT‑Pro’s prioritization is driven by *system-level architecture goals* (deliberative simulator of futures/viewpoints) and assumes a capable orchestration layer (Director/Negotiator/graph pruning), making it easier to add multiple axes early.

---

## 3) Model diversity vs prompt (perspective) diversity

### A. Where they agree

All three argue perspective/prompt diversity is **not** redundant with model diversity:
- **Claude research**: cites variance decomposition—“**prompt choice explains 36.4%… model choice 40.9%**”—and concludes they are “largely non-redundant.”
- **Gemini research**: explicitly frames them as “two levers that reduce correlation in different ways,” recommending measuring redundancy and spending budget on whichever reduces overlap.
- **GPT‑Pro research**: similarly argues temporal diversity is an “orthogonal” axis that “captures a different distribution of findings” than cross-model ensembles.

### B. Where conclusions diverge (who is most bullish on model diversity?)

- **Claude research is conditional and *quality-sensitive* about model diversity.** It emphasizes “**quality asymmetry undermines model diversity**” and cites Self‑MoA > Mixed‑MoA: mixing weaker models can “drag down the ensemble.” Its “Optimal strategy synthesis” is explicit: “(1) use the strongest available model, (2) maximize prompt/perspective diversity within that model, (3) add models… only when they are of comparable quality.” This is bullish on *perspective diversity* under budget constraints, but still treats model diversity as additive when quality is comparable.

- **Gemini research is the most “agnostic/operational”: additive is common, redundancy is common, and you must measure.** It does not claim a global hierarchy (like Claude); instead it says “**additive is common, redundancy is also common, and the difference is largely about how correlated your agents are**.” It also elevates “model drifting” (PromptBridge) to a primary design concern, making cross-model operation feel costly unless you invest in calibration.

- **GPT‑Pro research is the most bearish on model diversity (most bullish on perspective diversity).** It states: “**Perspective Diversity is more robust than Model Diversity**” and recommends: “prioritize running a ‘strong’ reasoning model… through multiple perspectives (Self‑MoA) rather than a ‘weak’ ensemble of different models.” It further narrows model diversity to “cross-checking high-confidence findings rather than… initial discovery.”

**Net divergence:** GPT‑Pro pushes model diversity into a verification role; Claude keeps it as a secondary discovery amplifier *only when models are comparable*; Gemini refuses to commit to a fixed ordering, pushing measurement + compatibility engineering.

---

## 4) Saturation and diminishing returns (ceilings, thresholds, numbers)

### A. Concrete ceilings: only Claude provides hard numeric “sweet spots”

- **Claude research gives explicit numeric ceilings and multiple thresholds:**
  - “**diminishing returns beyond 2–3 debate rounds**” and “**practical ceiling… 2–3 diversity axes combined, with 2–3 debate rounds**.”
  - Prompt-length threshold: “Prompts exceeding **~500 words** show diminishing returns,” with “every 100 words beyond that dropping comprehension by ~12%.”
  - It also implies manageable agent-run counts (“3–6 diverse agents is the sweet spot” appears in its design sketch rationale).

### B. Gemini and GPT‑Pro agree on diminishing returns, but refuse fixed numbers (or use different ones)

- **Gemini research:**
  - Qualitative ceiling: “Layering multiple axes is where coherence can collapse.”
  - It proposes an *adaptive stopping rule* rather than a fixed cap: “stop when marginal novelty drops below a threshold,” and suggests “Auto mode: system selects **2–4 perspectives** based on artifact type,” which conflicts with Claude’s “2–3 axes” ceiling only if “2–4” are truly orthogonal axes (Gemini’s number is more like “how many overlays you might try,” not how many independent axes you should layer simultaneously).

- **GPT‑Pro research:**
  - It asserts coherence is constrained by “reasoning strength” and that “smaller models are more likely to fail under high cognitive load or contradictory instructions.”
  - It does not give a stable “2–3 rounds” limit; instead it leans on *pruning* and *adaptive topology* (AGP) to manage scale (e.g., “token usage reductions of up to **90%**”), which is an efficiency threshold not a cognitive saturation threshold.

### C. Divergence tension: “fixed caps” vs “adaptive routing/pruning”

- Claude’s picture implies there’s a human/LLM cognitive ceiling that exists even if you have budget.
- Gemini/GPT‑Pro imply you can explore more candidates as long as you *prune/route/stop* based on novelty or topology optimization.
- Unresolved: are Claude’s numeric caps mostly *token-budget/attention* artifacts (prompt length, rounds), or do they reflect deeper instability that pruning cannot fix?

---

## 5) Synthesis/conflict resolution (how to handle contradictory findings)

### A. Claude: conflict is high-signal; prefer surfacing + confidence-weighted aggregation

- **Claude research explicitly argues against auto-resolving conflicts.** It says: “**Conflicts… are surfaced, not auto-resolved**,” citing GraphGeo’s claim that “**conflict edges produced the greatest performance gain**” (and “a 6.8% drop when removed”).
- Its primary consolidation mechanism is **confidence-weighted synthesis**: it highlights ReConcile where “confidence-weighted voting with recalibration” beats majority voting/debate by “up to **11.4%**.”

**Implication:** a SoT output should preserve “pre-launch says fine” vs “post-mortem says breaks under load” as dual annotations, not force a single verdict.

### B. Gemini: conflicts trigger *refutation rounds* + tool-based validation; normalize into an ontology

- **Gemini research treats conflicts as often objective-mismatch, but resolvable via targeted arbitration.** It proposes: “When conflicts arise, trigger a targeted ‘**refutation round**’… ask an arbiter agent to produce the minimum set of tests/evidence that would distinguish the hypotheses.”
- It also suggests *structuring* the problem space: “Normalize into a shared ontology” (design flaw vs implementation defect vs operational risk vs exploitation risk), plus attach temporal qualifiers like “time-to-exploit.”

**Incompatibility with Claude:** Claude’s “surface, don’t resolve” stance conflicts with Gemini’s “spawn arbiter + decide what evidence would distinguish” when the system has budget to do so.

### C. GPT‑Pro: negotiation/aggregation modules (Negotiator, mean-field) and protocol-level consensus

- **GPT‑Pro research proposes a dedicated reconciliation layer**: “The use of a ‘**Negotiator**’ module—as seen in MACRO-LLM—can then be employed to resolve… conflicts,” and later specifies “mean-field statistical aggregation to resolve spatial and temporal myopia.”
- It lists synthesis strategies as *architectural patterns*: hierarchical manager synthesis, competitive “winner,” and two-phase consensus.

**Incompatibility with both:**
- GPT‑Pro’s Negotiator/mean-field approach presumes conflicts are to be *resolved/aggregated into a stable belief*, which conflicts with Claude’s “conflict as information” and partially conflicts with Gemini’s arbitration approach (Gemini wants minimal evidence tests; GPT‑Pro wants system-level statistical reconciliation).

---

## 6) Evidence quality gaps (cross-source support vs single-source vs speculative)

### A. High-consensus claims (supported across all three)

These appear in all three sources with compatible direction (even if cited evidence differs):

1) **Temporal framing/premortem/prospective hindsight is a plausible, useful diversity axis**, but direct code-review defect-recall benchmarks are missing.
   - Claude: “no study has directly tested temporal framing in multi-agent code review,” but framing/metacognitive prompts and premortem literature suggest it will change findings.
   - Gemini: calls the gap explicitly (“most published LLM work does not yet quantify ‘temporal framing increases true defect recall in code review’”).
   - GPT‑Pro: asserts temporal reframing “significantly alters the search space,” but also flags temporal contamination as a limitation.

2) **Additive framing is important to preserve specialist identity.**
   - Claude: recommends persona in system prompt + “perspective frame… additive perspective layer.”
   - Gemini: formalizes “Identity, Lens, Task” three-layer contract; warns overlays should be modular/minimal.
   - GPT‑Pro: also recommends additive framing and proposes combining system-level frame with persona-embedded narrative.

3) **Diminishing returns / instability exist with too much diversity or too many agents/rounds.**
   - Claude: strongest quantitative statement (“inverted U-curve,” “2–3 rounds,” “2–3 axes”).
   - Gemini: coherence collapse when layering axes; advocates novelty-based stopping.
   - GPT‑Pro: “extreme heterogeneity can induce instability,” and coherence depends on model reasoning strength.

### B. Single-source, high-specificity claims (not corroborated by the other two)

These are not necessarily wrong; they’re just not cross-validated in the other reports.

- **Claude-only (highly quantitative / specific):**
  - Variance decomposition: “prompt choice 36.4% vs model choice 40.9%.”
  - Prompt robustness threshold: “minor prompt perturbations reduce performance by up to 40 percentage points.”
  - Comprehension drop: “prompts exceeding ~500 words… every 100 words beyond that dropping comprehension by ~12%.”
  - GraphGeo conflict-edge effect quantified (“6.8% drop when removed”) and ReConcile (“up to 11.4%”).

- **Gemini-only (architecture/productization emphasis):**
  - PromptBridge “model drifting” as a central operational constraint and the recommendation for a “compatibility layer”/calibration set per model family.
  - Explicit staging recipe (baseline → targeted lenses → stop on marginal novelty) as the primary cost-control mechanism.
  - Strong insistence on “finding objects” as first-class data (category, evidence anchor, severity, confidence, temporal tags).

- **GPT‑Pro-only (systems/RL + graph orchestration claims):**
  - Temporal/entity-aware memory layer boosting accuracy “from 39% to over 83%” (not referenced elsewhere).
  - Claimed correlation “r = 0.74 between perspective diversity and accuracy” vs “r = 0.55” for reasoning length.
  - AGP token reduction “up to 90%” plus Director/GCN pruning architecture.
  - MACRO‑LLM Negotiator mean-field aggregation as a spatiotemporal conflict solver.

### C. Speculative or weakly supported across all three

These are repeatedly *framed as plausible* but none of the three provides direct task-specific validation for code review:

- **“Temporal lenses increase true-positive defect recall (not just plausible risks) in code review.”** All three flag the absence of direct studies; claims are extrapolations from framing effects, debate/ensemble results, or planning studies.

- **Optimal “time horizon” granularity (6 months vs 1 year) produces orthogonal findings.** Gemini explicitly calls this an open question; Claude suggests temporal effects but does not validate horizon resolution; GPT‑Pro uses futuristic narrative examples (“year is 2027”) without evidence on horizon sensitivity.

- **Best placement of lens in the prompt hierarchy (system vs user) for cross-provider stability.** Claude offers a strong recommendation (system persona, lens addendum), Gemini calls this “indirect evidence” and flags provider differences, GPT‑Pro suggests a combined injection strategy but provides no definitive comparative evidence.

---

## 7) Unresolved design tensions / open questions (where research doesn’t converge)

### A. Should conflicts be preserved for the user, or resolved by the system?

- Claude treats inter-perspective disagreement as “information-rich” and argues for *surfacing* conflicts.
- Gemini and GPT‑Pro both propose mechanisms that *move toward resolution* (arbiter refutation rounds; Negotiator/mean-field aggregation).

Open question: in code review, is the product goal *decision support with explicit uncertainty* (Claude) or *automated adjudication with minimal ambiguity* (GPT‑Pro), and how should this vary by user intent (audit vs ship decision vs post-incident learning)?

### B. First-class perspective assets vs decorator/config layer

- Claude’s “start as config, promote later” is incompatible with Gemini/GPT‑Pro’s insistence that without first-class assets you lose calibration/versioning/auditability.

Open question: can you get the governance benefits (IDs, tests, calibration) while keeping Claude’s low conceptual surface area (i.e., “first-class in storage, decorator in runtime semantics”)? Gemini gestures at this hybrid; Claude does not fully embrace it.

### C. What’s the true saturation mechanism?

- Claude provides numeric ceilings (2–3 axes/rounds) suggesting a fairly universal limit.
- Gemini/GPT‑Pro suggest adaptive mechanisms (novelty-based stopping; graph pruning) can scale exploration.

Open question: do pruning/routing methods actually push the cognitive ceiling outward (by avoiding contradictory overload), or do they merely save tokens while the underlying “coherence limit” remains fixed?

### D. How to prevent post-mortem lenses from generating “credible hallucinations”

- Gemini is most explicit about guardrails: “tie each predicted failure back to evidence… or label it as speculative operational risk.”
- Claude points to “effective semantic diversity” (quality-aware) and warns self-reflection can lead to hallucination.
- GPT‑Pro notes “temporal contamination” and recommends perspective-taking frameworks (SimToM) but doesn’t specify operational guardrails for evidence anchoring.

Open question: what concrete schema + validators best enforce evidence anchoring for operational/temporal claims (especially where the artifact lacks production context)?

### E. How much of this is unnecessary for frontier “reasoning models”?

- GPT‑Pro claims advanced RL-trained reasoning models “internally display much greater perspective diversity,” implying external perspective overlays might yield diminishing marginal returns.
- Claude argues alignment “flattens conceptual diversity,” motivating explicit prompt interventions.
- Gemini treats frame sensitivity as real but model-dependent, advocating calibration.

Open question: should perspective shifting be a *universal orchestration feature*, or should it be *model-class dependent* (e.g., strong for instruction-tuned, weaker for reasoning-first models)?

---

### Closing note (practical divergence takeaway)

If you adopt **Claude’s** framing, you build a decorator/config system optimized for simplicity and user-visible disagreement. If you adopt **GPT‑Pro’s** framing, you build a first-class perspective layer inside a routed/pruned deliberation graph with negotiation modules that resolve contradictions. **Gemini** sits between them: first-class assets for governance, but runtime composition and empirical redundancy measurement to decide when/where to spend diversity budget.
