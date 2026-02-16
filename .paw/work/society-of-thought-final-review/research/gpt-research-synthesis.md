# Multi-Agent Synthesis and Conflict Resolution Protocols for Society-of-Thought Code Review

## Evidence base and why synthesis is the hard part

Multi-agent “parallel propose → aggregate” architectures are now well established, but the reliability gains come primarily from **how** aggregation is done, not from having many voices by itself. Mixture-of-Agents (MoA) formalizes a layered multi-agent setup where each layer’s agents condition on prior-layer outputs; its results support the idea that exposing agents to other agents’ drafts can improve output quality. citeturn1search0turn1search4 But MoA also highlights that the **aggregator is the system’s critical component**: in experiments, MoA aggregation outperforms an LLM-based “ranker” that merely selects one proposer answer, implying that the aggregator often performs non-trivial synthesis rather than simple selection. citeturn14view2turn15view3

ReConcile (ACL 2024) strengthens the “discussion + aggregation” pattern: it uses multiple discussion rounds among diverse LLM agents and then produces a team answer via a **confidence-weighted vote with confidence recalibration**, not a flat majority vote. citeturn0search4turn0search12turn14view0 This matters for your code review setting because “confidence” is often miscalibrated, and ReConcile explicitly treats calibration as part of the aggregation machinery rather than an afterthought. citeturn0search12

At the same time, recent work makes the key failure mode of naive aggregation concrete. AgentAuditor (Feb 2026 preprint) argues majority voting is brittle under **“confabulation consensus”**: correlated agent biases can produce a *popular but wrong* conclusion, so frequency is not a reliable proxy for correctness. citeturn0search1turn15view4 AgentAuditor replaces voting with a **reasoning-tree audit** that makes agreements/divergences explicit and resolves conflicts by verifying *localized divergence points*, reframing adjudication from “pick a winner” to “find the branch where evidence shifts.” citeturn0search1turn15view4

Finally, two related lines of evidence are directly relevant to implementing a synthesis agent that is “neutral” and robust:

- LLM judges are not procedurally neutral by default. A systematic study of LLM-as-a-judge finds **position bias**—a consistent tendency to prefer candidates based on ordering in the prompt, not intrinsic quality—across many tasks/models, implying your synthesis agent can overweight earlier or more salient specialists unless you design against it. citeturn2search0  
- “Debate” is not a free lunch. “Should we be going MAD?” finds multi-agent debate does **not reliably outperform** other inference-time scaling baselines without careful tuning; moreover, performance is sensitive to hyperparameters and protocol choices. citeturn1search3turn17view0 This is especially relevant to your plan to use per-finding threaded debate: you want debates only where they demonstrably add signal, not as a default cost center. citeturn1search3turn17view0

## Resolving factual disagreements between specialists

### What “works” beyond majority vote

A synthesis agent trying to resolve *factual* disputes (e.g., “this is a race condition” vs “this isn’t”) needs protocols that explicitly target the **error structure**: correlated bias, missing evidence, and unverifiable claims.

AgentAuditor’s core design is a strong template for factual conflict resolution: represent multi-agent reasoning as a **Reasoning Tree**, deduplicate semantically similar traces, and then audit only at **decision-critical divergence points** with localized verification. citeturn0search1turn15view4 In your code review context, the analog is: if two reviewers disagree, the disagreement usually hinges on a small number of premises (lifecycle, locking discipline, ownership/aliasing, thread model, input trust boundary). The protocol should force the debate to zoom into those premises rather than restating whole conclusions.

ReConcile contributes a different but compatible mechanism: multi-round discussion where agents see grouped answers/explanations and (recalibrated) confidence, then a weighted vote. citeturn0search12turn14view0 For factual disputes, the important takeaway is not “vote at the end,” but “**structure interaction so that agents must respond to competing rationales**,” and treat confidence as something to calibrate rather than trust. citeturn0search12

Archon broadens this into an implementable toolkit: it treats “verification” and even **unit test generation/evaluation** as inference-time modules, and reports that adding verifier/unit-test components can filter flawed responses and improve performance in reasoning/coding tasks. citeturn14view1turn15view2 This supports a design where the synthesis agent is *not* the final decider; it is the orchestrator that routes certain disputes into “verification layers.”

### Evidence weighting beyond confidence scores

If you only have each specialist’s confidence score, you have a known weak signal. Three stronger weighting mechanisms are supported by adjacent literature:

**Trace-structure weighting (reasoning-aware).** AgentAuditor’s critique of voting is that it discards evidential structure; its replacement audits branches and divergences rather than tallying outputs. citeturn0search1turn15view4 In code review, this maps to: weight findings that come with *checkable premises* (file/line anchors, call paths, invariants, reproduction steps).

**Reliability estimation (historical competence).** Crowdsourcing aggregation provides a useful analogy: Dawid & Skene estimate per-observer error rates when the true label is unknown, improving upon raw majority vote by modeling annotator reliability. citeturn11search6 More recent work shows that ignoring *correlations among workers* can harm aggregation, proposing Bayesian models that incorporate worker correlation. citeturn11search3 For you, the concrete pattern is: maintain per-persona calibration stats (precision/recall vs later ground truth such as tests, CI failures, reverted commits), and down-weight correlated “echoes” (e.g., two agents repeating the same premise without independent evidence).

**Pairwise comparative adjudication (selection pressure).** LLM-Blender uses pairwise ranking (PairRanker) and then generative fusion (GenFuser), motivated by the observation that the “best” model varies by example; it explicitly uses comparison to detect subtle quality differences and then fuses top candidates. citeturn20search0turn20search3 In your setting, pairwise comparison can be applied to *competing interpretations of the same diff* (especially for factual disputes) rather than to whole-agent outputs.

### Structured argumentation for factual disputes

If you want a principled “claim + evidence + warrant” structure, Toulmin-style argument decomposition is a well-known scaffold (claim, grounds/data, warrant, etc.), and it has been explicitly applied as an argumentation model in agent reasoning research. citeturn2search1turn2search4 The practical implementation is to require each specialist finding to be representable as:

- **Claim**: concrete property (e.g., “Potential race: shared map accessed without lock in async callback”).
- **Grounds (direct evidence)**: diff-anchored lines, call sites, concurrency primitives present/absent.
- **Warrant**: the rule that links evidence to conclusion (e.g., “This callback may run concurrently with request handler; map is mutable; no synchronized access observed”).
- **Rebuttal/Qualifier**: what would falsify it (“If callback executes on same event loop and map is confined, then no race”).

Then the synthesis agent can adjudicate by checking whether rebuttal conditions hold in the diff/context (or by triggering verification). This is the key difference between “debate” and “argumentation”: argumentation bakes in falsifiers and warrants.

### Anti-patterns to avoid in factual conflict resolution

Majority vote is the obvious one: AgentAuditor’s “confabulation consensus” illustrates why frequency can be misleading when agents share correlated biases. citeturn0search1turn15view4 Another anti-pattern is “LLM-as-judge with unshuffled candidates,” because position bias can systematically skew outcomes. citeturn2search0 A third is letting factual disputes run as open-ended debate without forcing *evidence production*; “Should we be going MAD?” shows debate benefits are sensitive and not reliably superior without careful protocol tuning. citeturn1search3turn17view0

## Trade-off detection and escalation to humans

### Detecting “trade-off” vs “one of us is wrong”

The cleanest conceptual split is: factual disputes should be resolvable by evidence/verification, while trade-offs are often rooted in **values, priorities, and constraints** (latency budget, security posture, operability, maintainability).

Value-Based Argumentation Frameworks (VAF) formalize this distinction: Bench-Capon extends abstract argumentation by associating each argument with a **value** and an audience-specific value preference order; in VAF, “defeat” can depend on which values the audience prioritizes. citeturn10search0 In practical terms, this gives you a principled way to represent “security vs performance” not as a factual contradiction but as a structured conflict whose resolution depends on a declared priority ordering.

There is also an operationally useful NLP/argument-mining connection: some datasets and schemas explicitly label claims as **Fact / Value / Policy**, and fine-grained argumentation datasets split claims into categories that map to “evidence-resolvable” vs “value-laden.” citeturn23view0turn10search2 This supports building (or prompting) a lightweight classifier that flags whether a disagreement is likely resolvable by evidence (“Fact”) or requires preference/decision (“Value/Policy”). citeturn23view0

A practical detection heuristic that aligns with these frameworks: if two specialists disagree but cite **different objective functions** (e.g., “adds 50ms” vs “prevents injection”), you likely have a trade-off; if they disagree about a **shared premise** (e.g., “this function runs concurrently”), you have a factual dispute.

### Escalation patterns and triggers that are evidenced in prior systems

Human-in-the-loop multi-agent systems often treat escalation as “deferral/abstention under uncertainty,” supported by learning-to-defer and selective prediction research. “Who Should Predict?” formalizes training a classifier plus a rejector that decides whether the model or a human should decide, positioning deferral as a first-class design axis. citeturn12search0 In NLP, selective prediction allows abstaining on low-confidence items, explicitly trading coverage for correctness. citeturn12search8

In software engineering specifically, HULA is a concrete example of a human-in-the-loop agent framework deployed in Atlassian Jira: it is explicitly designed to incorporate human feedback at each stage rather than fully automate, emphasizing “human authority” over agent actions. citeturn24view1turn26view0 HULA’s follow-on discussion highlights two pragmatic escalation/verification constraints: functional correctness testing can be expensive at scale, and LLM-based evaluation can be variable—so the system must be deliberate about when to ask for heavier verification or human review. citeturn24view2turn26view1

Magentic-UI, a human-in-the-loop agentic system UI from Microsoft Research, operationalizes escalation via several interaction mechanisms, including **co-planning** and **action approval/guards** for oversight of high-stakes actions. citeturn25view0 Even though this is not “code review,” the interaction design pattern is directly reusable: contentious threads can be routed into “approval required” mode.

Concrete escalation triggers that fit the evidence above:

- **High disagreement + low verifiability**: Agents disagree and neither can provide diff-grounded grounds/warrants; defer to human rather than hallucinate certainty. (Motivated by the brittleness of voting under correlated error and the need to preserve evidence.) citeturn15view4turn12search8  
- **Trade-off flagged as value/policy**: If the disagreement is fundamentally value-based, escalate with options rather than force a single “correct” answer. citeturn10search0turn23view0  
- **High impact severity**: Anything the security persona rates “critical” (or that touches auth, crypto, deserialization, RCE primitives) should default to escalation unless your org has explicitly delegated that authority to the agent. (This aligns with fail-safe/security-first defaults.) citeturn11search4  
- **Verification too costly for auto-mode**: If resolving the dispute requires expensive integration tests and you’re in a constrained budget, defer (HULA explicitly calls out unit-test cost/scalability constraints). citeturn26view1

### How to present trade-offs to decision-makers

The Habermas Machine’s empirical success suggests a key presentation principle: syntheses that are preferred incorporate dissent while respecting the majority stance, and they assess compromise using embedding-based analyses of alignment to group positions. citeturn5view0turn15view0 Concretely, for code review trade-offs, frame decisions as “shared ground + decision points,” rather than as “winner/loser.”

A practical template that follows this:

- **Shared facts** (what all agents agree on, with diff anchors).
- **Decision axis** (what value is being optimized).
- **Options** (usually 2–3) with explicit consequences.
- **Recommendation** (if allowed), labeled as policy-driven (“Given default priority: Security > Performance”).

### Auto-mode trade-off resolution

Auto-mode needs a declared priority policy. Two grounded ways to justify a “conservative default”:

- Security engineering principles emphasize deny-by-default / fail-safe defaults and least privilege; these principles are enumerated in Saltzer & Schroeder’s classic security design principles. citeturn11search4turn11search20  
- Modern risk management frameworks (e.g., NIST RMF) formalize making a risk-based decision that considers effectiveness, efficiency, and constraints, integrating security into the system lifecycle rather than treating it as an afterthought. citeturn11search1

So “default to security” is defensible as a conservative policy, but should still be parameterized by context (service tier, latency SLO, threat model). The synthesis agent should treat that policy as configuration, not emergent behavior.

## Synthesis agent design patterns that reduce bias and improve merge quality

### “Neutral” as procedural neutrality, not personality-neutrality

The Habermas Machine is instructive here: it is “mediating,” but it is not neutral in the sense of having no objective—it explicitly optimizes for group endorsement using iterative generation/refinement and reward modeling. citeturn5view0turn7search1 The practical lesson is that “neutral mediator” is achievable only as **procedural neutrality**: a transparent charter, fixed scoring rules, and auditable evidence linking—not as “the model will naturally be unbiased.”

In fact, the Habermas Machine uses a *social choice procedure*—a simulated election with the Schulze method to aggregate rankings—explicitly selected for properties like independence of clones (avoiding vote splitting among similar candidates). citeturn7search1turn19search5 That is a concrete example of procedural neutrality: you don’t ask the mediator to “be fair,” you embed fairness constraints in the aggregation mechanism.

### Robust prompting patterns for aggregation

Implementable patterns grounded in the literature above:

- **“No new findings” constraint**: the synthesis agent may only (a) merge, (b) deduplicate, (c) request verification, (d) flag trade-offs. This helps prevent the aggregator from becoming an eighth persona. (Motivated by the known brittleness of judgment and the need for auditable grounding.) citeturn15view4turn28view0  
- **Structured input normalization**: require each specialist to emit findings in a fixed schema (claim/grounds/warrant/qualifier, severity, confidence, diff anchors). This is the operationalization of Toulmin-style structure in a code review setting. citeturn2search1turn2search4  
- **Local rather than global aggregation**: cluster findings by topic/anchor first, then synthesize per cluster. This aligns with AgentAuditor’s “localized divergence points” idea and makes attention allocation tractable. citeturn15view4  
- **Multi-pass with order randomization**: because position bias exists in LLM judging, run at least two aggregation passes with shuffled specialist order (or present clusters in randomized order) and require stability across passes before finalizing. citeturn2search0

### Quality signals the synthesis agent should score for

These are implementable “quality features” that follow directly from the strengths/weaknesses documented in the sources:

Evidence specificity and anchoring (high weight). Grounded-AI-for-code-review argues that grounding requires explicit anchoring to verifiable evidence such as tool findings, rule definitions, and precise file/line locations; without this, naive LLM usage is prone to hallucination and inconsistent reasoning. citeturn28view0turn27view0

Disagreement structure (high weight). AgentAuditor explicitly models agreements/divergences among traces and audits where they diverge; a synthesis agent can score whether a finding contains “decision-critical premises” that can be verified. citeturn15view4

Aggregator sensitivity and capability (medium weight). MoA results suggest the choice of aggregator matters substantially, and aggregation is not equivalent to ranking; this implies you should allocate more budget to synthesis competence than to adding more reviewers beyond your seven. citeturn15view3turn14view2

Confidence calibration (medium weight). ReConcile explicitly recalibrates confidence and uses it in weighted voting; you can treat “confidence without calibration features” as low-quality metadata. citeturn0search12

### Anti-patterns to avoid in synthesis agent design

A single-pass “LLM judge” over concatenated specialist outputs is risky because position bias can skew outcomes, and verbosity can dominate. citeturn2search0 Another anti-pattern is relying on debate everywhere; MAD benchmarking shows debate is sensitive and not reliably better without tuning, so you should reserve debate rounds for threads that fail verification or have high expected value. citeturn1search3turn17view0

## Thread-based debate protocols, resolution criteria, and thread control

### Protocols that map well to per-finding threads

In classic multi-agent argumentation, dialogue game protocols explicitly define allowable moves (propose, attack, defend) and termination conditions. PARMA is an example of a multi-agent dialogue protocol for argument over proposals for action, built to allow rational proposal/attack/defense exchanges. citeturn9search2turn9search20 For your per-finding threads, that maps naturally to:

- **Propose**: Specialist submits claim with grounds/warrant.
- **Attack**: Another specialist challenges grounds (“that line is not on hot path,” “this code is single-threaded”), or challenges warrant (“this is not a taint source”).
- **Defend / Revise**: Original author adds evidence, narrows scope, or downgrades confidence.

MAD implementations provide two concrete operational ideas for multi-party discussion that are immediately applicable:
- Use **simultaneous-talk** style rounds to neutralize order effects (avoid “first speaker advantage”), and optionally use a summarizer that overwrites history to control context length. citeturn17view0  
- Allow a judge to end early when satisfied; this supports per-thread termination based on evidence sufficiency rather than fixed rounds. citeturn17view0

### When is a thread resolved vs deadlocked?

A thread can be declared **resolved** if one of these holds (you can implement all three):

- **Verification closure**: a verifier step (static analysis, test, or grounded diff check) confirms one side’s key premise or falsifies the other’s. (This follows Archon’s framing of verifier/unit-test modules as filters for flawed reasoning, and Grounded AI’s “evidence first” constraint.) citeturn14view1turn27view0  
- **Argument closure**: the losing claim is revised into a compatible statement (e.g., “not a race, but worth documenting thread confinement”), which is the dispute transforming from factual contradiction into a perspective note. (This is how practical argumentation systems often converge: by narrowing qualifiers.) citeturn2search1turn10search0  
- **Stable disagreement with explicit value conflict**: the system identifies it as a value/policy dispute (trade-off) and escalates or applies the configured priority order. citeturn10search0turn23view0

A thread is **deadlocked** (and should be escalated or frozen) when additional rounds fail to produce new evidence. Your stopping rule can follow “search” style inference-time frameworks: Tree-of-Thoughts frames reasoning as exploring branches with evaluation and pruning under a compute budget. citeturn9search0turn9search24 Graph of Thoughts expands this to general graphs with a controller/scoring module, reinforcing the idea of structured exploration plus explicit scoring/termination rather than endless conversation. citeturn9search1turn9search29

### Preventing thread proliferation

Thread explosion is usually a symptom of missing deduplication and missing “scope rules.” Two practical controls:

- **Cluster-first rule**: create new threads only for new clusters (new code anchor, new subsystem), not for rephrasings. This mirrors AgentAuditor’s deduplication-to-compact-tree step. citeturn15view4  
- **Split only on new premises**: a sub-thread is allowed only if it introduces a new verifiable premise (new call path, new diff anchor, new test). Otherwise, it must be appended as an attack/defense move in the existing thread. This follows dialogue protocol discipline rather than free-form chat. citeturn9search2turn9search20

## Grounding validation at synthesis level

### Beyond string-matching: semantic grounding patterns

The strongest concrete pattern in recent code-review systems research is “grounding first, then generate.” A production system for grounded AI code review pairs static-analysis findings with AST-guided context extraction and explicitly anchors every LLM explanation to verifiable evidence (tool findings, rule definitions, precise file/line locations); it frames grounding as the central defense against hallucination and misidentification. citeturn28view0turn27view0 It also uses AST/call-graph guided context extraction to keep prompts compact but semantically rich, selecting only functions/types/lines necessary to understand a finding. citeturn27view0turn28view0

In your synthesis agent, this suggests a concrete grounding pipeline per finding:

1. **Anchor extraction**: resolve cited snippets/line refs to diff hunks; if none exist, attempt AST-based retrieval around named identifiers (function/class names) and call sites. (Grounded AI emphasizes AST-guided extraction as the mechanism for semantically relevant context.) citeturn27view0turn28view0  
2. **Evidence typing**: label evidence as:
   - **Direct**: “line X introduces unsanitized input into SQL call.”
   - **Derived**: “this new helper is used in request path Y” (requires call-graph inference).
   - **Speculative**: “likely used by…” (no demonstrated path).  
3. **Constraint the synthesis**: only “direct” and “derived” evidence can support high-severity conclusions; speculative evidence is allowed only as a hypothesis.

### Distinguishing direct evidence vs inferential claims

HULA’s evaluation discussion underscores a key reality: full functional verification (tests) can be expensive and binary, and LLM-based similarity scoring can fluctuate—so you should separate “what’s directly grounded” from “what’s inferred” and treat them differently in presentation and escalation. citeturn26view1turn24view2

A concrete, graceful demotion pattern:

- If a finding has **no direct anchors** but has plausible warrants, keep it as a **“Watch Item (low confidence)”** rather than deleting it, and attach a required next action (“needs call-graph confirmation,” “needs minimal repro test”). This avoids the brittle include/exclude behavior that encourages hallucinated certainty. citeturn27view0turn12search8  
- If a finding has anchors but lacks a warrant (“this seems wrong”), downgrade severity and request a warrant or verification.

## Recommended protocol for your specific system

### A synthesis-and-resolution architecture that maps to 7 specialists + threaded debate

Use a **three-layer pipeline** (specialists → auditors/verification → synthesis), inspired by the “layered inference-time techniques” view (Archon) and the “audit divergences” view (AgentAuditor). citeturn14view1turn15view4

**Specialist output contract (hard requirement).** Each persona emits findings as structured objects:

- Claim (one sentence), Severity, Confidence (with calibration notes), Category/persona tag  
- Grounds: diff anchors (file + hunk + quoted snippet)  
- Warrant: the rule connecting grounds to claim  
- Rebuttal conditions + what evidence would flip the conclusion  
- Suggested verification: (a) quick static check, (b) unit test idea, (c) runtime log/assert

This operationalizes Toulmin-style structure for machine adjudication. citeturn2search1turn2search4

**Thread creation = cluster-first.** Cluster findings by shared anchors/identifiers into “threads.” Trigger debate only when a thread has (a) conflicting claims or (b) high severity with low grounding. (This follows the empirical warning that debate everywhere is not reliably beneficial.) citeturn1search3turn17view0

**Factual conflict resolution = localized divergence audit.** For a disputed thread:

- Extract the minimal set of contested premises (thread model, trust boundary, ownership, etc.).  
- Run a “divergence audit” step that forces agents to provide grounds/warrants for each premise; then verify those premises with lightweight tooling where possible. This is the code-review analog of AgentAuditor’s decision-critical divergence point auditing. citeturn15view4  
- If verification is feasible, route through an Archon-like verifier/unit-test generator layer (even if lightweight) to filter flawed interpretations. citeturn14view1

**Trade-off handling = value-based representation + escalation/auto policy.** If the dispute is value/policy based:

- Represent each option as (Pros/Cons, Value advanced, Evidence). VAF gives the conceptual basis to treat value conflict as first-class rather than “someone is wrong.” citeturn10search0  
- If human-in-the-loop is enabled: escalate with 2–3 options and a recommended default based on configured value order.  
- If auto-mode: apply conservative defaults grounded in fail-safe defaults/least privilege and risk-based decision logic, but make that policy explicit and configurable. citeturn11search4turn11search1

**Bias control in synthesis.** To prevent attention/position bias:

- Randomize specialist order per thread and run synthesis twice; require stability. (Motivated by position bias in LLM judging.) citeturn2search0  
- Normalize verbosity by truncating each specialist to the schema fields before synthesis.

**Output format (GapAnalysis.md).** Present:

- “Accepted findings” (high grounding, resolved disputes)  
- “Trade-offs requiring decision” (options + consequences)  
- “Watch items” (low grounding; explicit next evidence needed)  
- “Verification actions queued” (tests/static checks recommended)

### Direct answers to your specific questions

**Is there a well-validated protocol for a “neutral mediator” agent, or is neutrality a fiction?**  
Neutrality is best treated as **procedural**, not psychological. The Habermas Machine succeeds by embedding procedural fairness/aggregation: it iteratively refines statements using critiques and uses a social choice aggregation (Schulze method) rather than an opaque mediator preference, explicitly aiming for broad endorsement while incorporating dissent. citeturn5view0turn7search1turn19search5 Given that LLM judgment can suffer from ordering bias, relying on “a neutral model” without procedural constraints is risky. citeturn2search0  
Recommended: give the synthesis agent an explicit **charter** (e.g., “PR triage lead”) with fixed decision rules, and require evidence-linked outputs; do not rely on “neutral persona vibes.”

**Is there research on automatically classifying disagreements as factual vs value-based?**  
A principled route is to borrow from argumentation/argument-mining: claim typing into Fact/Value/Policy is explicitly present in fine-grained argumentation schemas (e.g., AAE-FG divides claims into Fact, Value, Policy), which supports building classifiers/prompts that detect when a dispute is evidence-resolvable versus preference-driven. citeturn23view0turn10search2 For decision logic, Value-Based Argumentation Frameworks formalize value-driven disagreement via explicit value preferences. citeturn10search0  
Recommended: implement a lightweight claim-type classifier + “value tag” on each finding, then route accordingly.

**What synthesis techniques did the Habermas Machine use that you should replicate?**  
Three techniques are especially portable to your synthesis layer:

- **Iterative refinement via critiques**: participants provide critiques; revised statements are preferred over initial statements, and the system is explicitly designed to iteratively generate and refine statements based on opinions and critiques. citeturn5view0turn7search1  
- **Optimize for broad endorsement with minority inclusion**: embedding analyses show successful statements incorporate dissent while respecting the majority stance; revised statements can overweight minority critiques relative to their prevalence, avoiding a “tyranny of the majority” framing. citeturn15view0turn5view0  
- **Social-choice aggregation (Schulze method)**: the supplementary description indicates the system samples multiple candidates, predicts participant rankings via a reward model, and aggregates rankings with the Schulze method, explicitly valuing clone-independence to avoid vote splitting among similar candidates. citeturn7search1turn19search5  

In code review synthesis, map “endorsement” to “team acceptability under constraints” (security posture, performance SLOs), and map “candidate statements” to “candidate resolutions / recommended actions.”

**Examples of successful “escalation to human” triggers in automated deliberation?**  
HULA is an existence proof in software development: it integrates human feedback into each step and is designed around human authority rather than full autonomy. citeturn26view0turn24view1 Magentic-UI operationalizes oversight through action approvals/guards and co-planning, demonstrating concrete UI/interaction hooks for escalation. citeturn25view0 The broader learning-to-defer / selective prediction literature supports deferring when uncertainty is high. citeturn12search0turn12search8  
Recommended triggers for your system: (1) unresolved factual disagreement after one verification attempt, (2) trade-off flagged as Value/Policy, (3) high-severity finding with incomplete grounding, (4) evidence suggests correlated-agreement risk (many agents repeating same premise). citeturn15view4turn23view0turn12search8

**Auto-mode conservative defaults: “security over performance,” or context-dependent?**  
A conservative default is defensible if you ground it in explicit policy. Security engineering principles like fail-safe defaults and least privilege provide justification for “deny-by-default” posture. citeturn11search4turn11search20 Risk management frameworks emphasize selecting controls via risk-based decisions considering constraints and impact. citeturn11search1  
Recommended: implement a configurable priority stack (e.g., Safety/Security > Data Integrity > Correctness > Availability/Latency > Maintainability aesthetics), but require the synthesis agent to surface when it applied the default and what performance cost it assumed, so humans can override when context demands.

