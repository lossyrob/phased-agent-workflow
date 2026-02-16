# Research Sources: Society-of-Thought Review Design

This document tracks which research papers and findings informed specific design decisions in the society-of-thought final review mode. Organized by design decision, with paper references and key findings.

---

## Core Concept: Persona-Based Multi-Agent Review

**Society of Thought** (Kim, Lai, Scherrer et al., arXiv:2601.10825, January 2026)
- Foundation paper. Demonstrates that enhanced reasoning emerges from simulating multi-agent interactions with distinct personality traits and domain expertise.
- Key finding: Reasoning models (DeepSeek-R1, QwQ-32B) spontaneously simulate multi-agent debate internally during RL training. Two emergent persona types: "Associative Expert" (pattern-matching proposer) and "Critical Verifier" (low Agreeableness, high Neuroticism).
- **Design influence**: Validates the entire approach — perspective diversity through full personas, not checklists.

**Perspective-Based Reading (PBR)** (Basili et al., 1996; Laitenberger & DeBaud, 1997)
- Pioneered at NASA. Defect overlap among inspectors using different perspectives is low — each perspective finds unique issues.
- Laitenberger adaptation at Robert Bosch: PBR more effective than checklist-based reading across 60 professional developers.
- Critical finding: Only 1 in 5 human reviewers actually follow their assigned perspective. AI agents eliminate this process conformance problem.
- **Design influence**: Validates perspective-based approach over checklists; positions AI agents as potentially more effective than human PBR teams.

---

## Cognitive Strategy Diversity (Roster Design)

**Breaking Mental Set through Diverse Multi-Agent Debate (DMAD)** (ICLR 2025)
- Assigning different *reasoning strategies* (direct inference, CoT, decomposed CoT) is MORE effective than assigning different personas that all use the same reasoning method.
- **Design influence**: Each of the 5 personas has a distinct cognitive strategy (threat modeling, quantitative estimation, Socratic questioning, boundary enumeration, narrative walkthrough) — not just a different focus area.

**Diversity of Thought** (Hegazy, 2024)
- Three medium-capacity diverse models hit 91% on GSM-8K vs 82% for three homogeneous GPT-4 instances.
- When constrained to single provider, prompt-level diversity must compensate.
- **Design influence**: Supports optional model-per-specialist feature; cognitive strategy diversity compensates when using single model.

**AI Office Architecture** (arXiv:2601.14351, January 2026)
- Proposes agents with *opposing incentives* (Swiss-cheese model) where errors are caught when agents with different failure modes validate each other.
- **Design influence**: Reinforces that personas need genuinely different objectives, not just different topics.

---

## Panel Size: 5 Specialists

**DeepMind Scaling Study** (arXiv:2512.08296, January 2026)
- Evaluated 180 agent configurations across 5 architectures. Performance plateaus at ~4 agents; additional agents contribute little.
- **Design influence**: 5 specialists is the empirical sweet spot.

**A-HMAD Study**
- Accuracy: 72% (1 agent) → 87% (3) → 90% (5) → 91% (7). Clear diminishing returns beyond 5.

**"Multi-Agent Teams Hold Experts Back"** (February 2026)
- Adding non-expert agents can actively dilute expert contributions ("expertise dilution effect").
- **Design influence**: Supports keeping roster at 5 rather than expanding; each specialist must be genuinely expert in their domain.

**Software Peer Review Empirical Studies** (Rigby & Bird; McIntosh et al.)
- Median 2 active reviewers per review in practice; minimal increase in comments with more participants.
- **Design influence**: Adaptive selection mode — not all 5 need to participate on every review.

---

## Interaction Architecture: Parallel + Synthesize (default), Debate (opt-in)

**Mixture-of-Agents (MoA)** (ICLR 2025)
- Layered architecture: first-layer agents independently generate, later layers refine using previous outputs.
- Achieved 65.1% on AlpacaEval 2.0 vs GPT-4o's 57.5% using open-source LLMs.
- **Design influence**: Parallel-propose → aggregate is the validated default mode.

**Archon Framework** (Stanford, 2024)
- Adding layers of critique and fusion on top of generation yields 18.8% performance boost.
- **Design influence**: Supports the synthesis layer as value-add, not just summarization.

**Multi-Role Code Review** (arXiv:2505.17928, May 2025)
- Multi-role LLM collaboration achieves 2× improvement over single-pass LLM review on real-world merge requests.
- **Design influence**: Direct validation of PAW's multi-agent review approach.

---

## Debate Mode: Hub-and-Spoke, Adaptive Termination

**Sparse Communication Topology** (EMNLP 2024)
- Sparse topologies achieve comparable or superior performance to fully-connected while reducing token costs 40%+.
- Limiting exposure to potentially incorrect information helps prevent misleading convergence.
- Stronger agents at higher-centrality positions yield better results.
- **Design influence**: Hub-and-spoke via synthesis agent; specialists don't see each other's raw findings.

**Debate Round Research** (Du et al., 2023; Liu et al., 2024)
- Consensus solidifies within 2-3 rounds for similarly capable LLMs. Performance can decline after further rounds.
- **Design influence**: Adaptive termination with 3-round hard cap.

**"Should We Be Going MAD?"** (ICML 2024)
- Multi-agent debate does not reliably outperform self-consistency sampling without careful tuning.
- Multi-Persona approach "significantly underperforms" without hyperparameter tuning.
- **Design influence**: Debate is opt-in heavy mode, not default. Parallel + synthesize is safer default.

---

## Anti-Sycophancy Structural Rules

**Sycophancy Rates** (SycEval, 2025)
- ChatGPT 56.7%, Claude 58.2%, Gemini 62.5% sycophancy rates.

**RLHF Sycophancy Root Cause** (Sharma et al., ICLR 2024)
- When responses match user views, they're more likely preferred in human evaluations → model learns agreement as strategy.
- **Design influence**: Personality descriptions alone won't create disagreement; structural forcing required.

**CONSENSAGENT** (ACL Findings 2025)
- Sycophancy manifests as agents reinforcing each other's responses, driving premature convergence.
- **Design influence**: Anti-sycophancy rules in every persona.

**"Peacemaker or Troublemaker"** (arXiv:2509.23055, 2025)
- Explicitly modeled troublemaker-to-peacemaker spectrum. Sycophantic agents produce worse outcomes.
- Moderate disagreement outperforms maximal disagreement.
- **Design influence**: Devil's Advocate calibrated for productive challenge, not maximally adversarial.

**IUI 2024 (LLM Devil's Advocates)**
- Interactive devil's advocates perceived as higher quality than non-interactive.
- Key limitation: DAs that repeat the same objection get ignored.
- **Design influence**: Devil's Advocate must escalate with NEW challenges each round.

---

## Persona Specification: Rich Narratives + Behavioral Rules + Examples

**Scaling Law in LLM Personality** (arXiv:2510.11734, 2025)
- Rich human-authored character descriptions: 66% improvement in persona fidelity over simple demographic profiles.
- **Design influence**: Full narrative backstories (500-2000 words), not trait lists.

**BAIR "Anthology"** (arXiv:2407.06576, 2024)
- Rich life backstories significantly outperform simple demographic tuples across multiple metrics.
- **Design influence**: Reinforces narrative approach.

**PersonaLLM** (NAACL Findings 2024)
- LLMs can reliably simulate Big Five traits with large effect sizes (Cohen's d up to 5.47).
- But: RLHF-aligned models struggle with high Neuroticism and low Agreeableness.
- **Design influence**: Devil's Advocate and Security Paranoid need structural forcing, not just trait assignment.

**Persona Drift** (Li et al., ICML 2024; arXiv:2412.00804, 2024)
- Significant drift within 8 conversation rounds. Larger models drift MORE.
- EchoMode: 30%+ consistency degradation after 8-12 turns.
- **Design influence**: Noted as risk for debate mode; mitigated by hub-and-spoke (shorter per-specialist contexts).

---

## Synthesis: Confidence-Weighted + Grounding Validation

**ReConcile** (ACL 2024)
- Confidence-weighted voting outperforms simple majority voting.
- **Design influence**: Specialists express confidence per finding; synthesis weights accordingly.

**AgentAuditor** (2025)
- Majority voting fails when agents repeat same flawed reasoning (confabulation consensus).
- Aggregator should examine reasoning traces, not just conclusions.
- **Design influence**: Synthesis examines evidence quality, not count of specialists who agree.

**Zheng et al.** (EMNLP Findings 2024)
- Personas can show small negative effects on factual accuracy — personas help with perspective tasks but can hurt objective reasoning.
- **Design influence**: Synthesis agent validates findings are grounded in actual diff; dismisses persona-induced hallucination.

---

## Human-as-Moderator Interaction

**"Wisdom from Diversity"** (arXiv:2505.12349, 2025)
- Hybrid human+AI groups outperform both purely human and purely LLM groups.
- **Design influence**: User participates as moderator, not just observer.

**Socratic Human Feedback (SoHF)**
- Expert programmers using Socratic strategies guided models to solve 74% of problems models initially failed.
- Labeling the cognitive lens used helps users learn review thinking.
- **Design influence**: Moderator-style hooks (summon specialist, challenge findings, request deeper analysis).

**Habermas Machine** (Tessler et al., Science, 2024, N=5,734)
- AI-mediated multi-perspective deliberation left groups less divided; AI syntheses preferred 56% to 44% over human mediators.
- Successful syntheses incorporated dissenting voices while respecting majority.
- **Design influence**: Synthesis should incorporate dissent, not just majority findings.

**Triem (2024, ASIS&T)**
- LLMs weigh human input more heavily than AI opinion in multi-agent debate (but only slightly).
- **Design influence**: Human moderator input will naturally influence specialist responses.

**"Koala" System** (arXiv:2501.17258, 2025)
- Users want: role assignment, conversational control, persona selection.
- Warning: AI responses can stifle original human thinking ("production blocking").
- **Design influence**: Interactive mode is opt-in, not default; user controls engagement level.

---

## Maintainability as Primary Review Category

**Mäntylä & Lassenius** (IEEE TSE, 2009)
- 75% of defects discovered in code review are evolvability defects (readability, structure, documentation).
- Only 25% are functional bugs.
- **Design influence**: The Empathetic Maintainer addresses the single largest category of real review findings — not the "soft" persona, the highest-volume one.

**Bacchelli & Bird** (Microsoft study)
- Review outcomes are "less about defects than expected." Reviews also produce knowledge transfer, team awareness, improved solutions.
- "Code review is understanding" — reviewers need change and context understanding.
- **Design influence**: All personas embed "demand rationale" rule; understanding is cross-cutting.

---

## Code Review Multi-Agent Systems (Prior Art)

**CodeAgent**
- Multi-agent LLM system for code review with supervision agent ("QA-Checker") to prevent drift.
- **Design influence**: Synthesis agent acts as grounding/quality checker.

**MAF-CPR**
- Multi-agent framework with specialized agents and dynamic prompt refinement.
- **Design influence**: Validates role specialization + workflow decomposition for complex PRs.

**Sphinx** (arXiv, January 2026)
- PR review as benchmark: checklists as evaluation instrumentation while generating feedback via persona cognition.
- **Design influence**: Future measurement — use coverage checklists to evaluate persona effectiveness without constraining their output format.

**Edmundson et al. (2013)**
- Among 30 developers hired for security code review, none found all 7 known vulnerabilities.
- **Design influence**: Dedicated security perspective is essential; confirms security specialist persona's value.

---

## Synthesis Agent Design & Conflict Resolution

**Toulmin Argumentation / ASPIC+** (Verheij 2009; Modgil & Prakken 2014)
- Structured argument decomposition: Claim, Grounds/Data, Warrant, Backing, Qualifier, Rebuttal conditions.
- Formalized for AI systems; makes disagreements diagnosable — synthesis can identify whether agents disagree on data, inference rules, or exception conditions.
- **Design influence**: Required specialist output format (Toulmin structure) in SpecialistDesignRubric.md and SynthesisProtocol.md.

**AgentAuditor** (February 2026 preprint)
- Majority voting fails under "confabulation consensus" — correlated agent biases produce popular but wrong conclusions.
- Replacement: reasoning-tree audit at decision-critical divergence points; localized verification instead of tallying outputs.
- **Design influence**: Synthesis pipeline uses category clustering + divergence-point analysis, not majority voting.

**"Lost in the Middle"** (Liu et al., TACL 2024)
- >30% performance degradation when critical information appears in middle of context; U-shaped attention curve.
- **Design influence**: Category-based clustering in synthesis pipeline — process by topic cluster, not sequentially through specialist outputs.

**"Do Multi-Document Summarization Models Synthesize?"** (TACL 2024)
- GPT-4 is over-sensitive to input ordering in multi-document synthesis.
- **Design influence**: Randomize specialist order per synthesis run; multi-candidate generation to overcome ordering effects.

**EXSIR** (NAACL 2025)
- 14.4% accuracy gain by decomposing multi-condition tasks into individual assessments before combining.
- **Design influence**: Per-cluster synthesis before cross-cluster integration in the synthesis pipeline.

**LLM-Blender** (PairRanker + GenFuser)
- Pairwise ranking detects subtle quality differences; generative fusion of top candidates outperforms single selection.
- **Design influence**: Multi-candidate synthesis approach (generate 3, score, select best).

**Habermas Machine — Synthesis Techniques** (Tessler et al., Science 2024)
- Multi-candidate generation (4 diverse candidates), personalized reward modeling, Schulze method aggregation (independence-of-clones property).
- Iterative critique: specialists critique winning synthesis; revised candidates re-voted.
- AI syntheses preferred 56% to 44% over human mediators — but Cohen (PhilArchive) argues this may partly stem from perception of AI objectivity.
- **Design influence**: Multi-candidate GapAnalysis.md generation with scoring; procedural fairness over persona neutrality.

**Reasoning-based Bias Detector (RBD)** (2025)
- Plug-in debiasing module improves evaluation accuracy by 18.5% and consistency by 10.9%.
- **Design influence**: Validates need for structural debiasing in synthesis; randomized ordering + normalization.

**LaMSUM** (Chhikara et al., 2024)
- Majority and approval-based voting across shuffled permutations consistently enhances stability in multi-document synthesis.
- **Design influence**: Multi-pass synthesis with order randomization requirement.

---

## Trade-off Detection & Resolution

**Pareto Dominance / ATAM** (Architecture Tradeoff Analysis Method, Carnegie Mellon SEI)
- If recommendation improves one quality attribute without worsening any other → fix, not trade-off. If it improves one but degrades another → Pareto frontier, genuine trade-off.
- ATAM maps concerns to quality attribute scenarios; same sensitivity point with different quality attributes = trade-off point.
- **Design influence**: Conflict classification heuristic — different objectives = trade-off; same premise contradicted = factual dispute.

**"Disagreement as Data"** (arXiv 2601.12618, January 2026)
- Cosine similarity on LLM reasoning trace embeddings across ~10,000 agent pair instances robustly differentiates consensus from disagreement.
- High cosine distance on orthogonal reasoning axes = trade-off; contradictory claims on same axis = factual dispute.
- **Design influence**: Supports automated conflict classification in synthesis pipeline.

**Value-Based Argumentation Frameworks (VAF)** (Bench-Capon)
- Extends abstract argumentation by associating arguments with values and audience-specific value preference orders; "defeat" depends on which values audience prioritizes.
- **Design influence**: Trade-offs represented as value conflicts with configurable priority ordering, not as errors.

**"Team of Rivals" Architecture** (arXiv 2601.14351, January 2026)
- 90%+ internal error interception with asymmetric veto authority and pre-declared acceptance criteria.
- Core principle: "errors should die in committee, not surface to users" — fail-safe defaults, conservative choices.
- **Design influence**: Conservative default hierarchy for auto-mode trade-off resolution.

**Microsoft SDL / OWASP / NIST RMF / ISO 25010**
- Industry consensus priority: Correctness > Security > Reliability > Performance > Maintainability > DX.
- OWASP Risk = Likelihood × Impact; Microsoft DREAD model for structured risk scoring.
- **Design influence**: Default configurable priority hierarchy in SynthesisProtocol.md.

**Rastogi et al.** (CSCW 2022)
- AI's first recommendation heavily anchors human decisions — randomize presentation order, present options simultaneously.
- **Design influence**: Trade-off presentation to users randomizes agent ordering and uses structured comparison tables.

---

## Debate Architecture & Thread Management

**Choi, Zhu & Li (2025)** — Martingale property of debate
- Multi-agent debate modeled as Bayesian posterior belief update forms a martingale — expected belief in correct answer remains unchanged across rounds.
- "MAD-oracle": once an agent produces a high-confidence correct answer, lock it from further revision — breaks martingale symmetry.
- **Design influence**: Lock high-confidence agreements after round 1; debate rounds have diminishing/negative returns without intervention.

**S²-MAD** (Zeng et al., NAACL 2025)
- Conditional participation: agents decide per-round whether their viewpoint adds information via similarity + redundancy filter.
- 94.5% token cost reduction with <2% accuracy degradation.
- **Design influence**: Per-thread continuation only involves relevant specialists, not all 7.

**DyLAN** (Liu et al., COLM 2024)
- Agent Importance Score (backward message passing) deactivates low-contributing agents.
- Optimized team of 3 outperformed 7 in both accuracy and efficiency.
- **Design influence**: Supports adaptive selection and conditional participation in debate.

**MACI** (Chang, 2023–2025)
- Dual-dial system: information dial (gates evidence quality) and behavior dial (schedules contentiousness high→low).
- Tracks disagreement level, finding overlap, evidence quality, argument quality per thread; halts when metrics plateau.
- **Design influence**: Per-thread continuation criteria in debate mode — plateau detection for adaptive termination.

**Hu et al. (2025)** — Convergence detection
- Beta-Binomial mixture model with Kolmogorov-Smirnov statistic for adaptive stopping.
- KS < 0.05 for two consecutive rounds → converged. Agent agreement distributions converge to bimodal (all agree or all disagree) — partial consensus is unstable.
- **Design influence**: Thread termination criteria; contested threads should resolve to agreed or trade-off, not linger.

**GroupDebate** (2024)
- Finer grouping (2,2,2 rather than 4,4) yields 10% lower cost and 17% higher accuracy in multi-agent debate.
- **Design influence**: Thread-based debate structure with small specialist groups per contested thread.

**CortexDebate** (ACL Findings 2025)
- McKinsey Trust Formula T = (C×R×I)/S to prune unhelpful inter-agent connections; up to 70.79% context length reduction.
- **Design influence**: Validates sparse communication topology; hub-and-spoke via synthesis agent.

**DReaMAD** (2025)
- Belief entrenchment is dominant failure mode — shared training biases reinforced through debate.
- Strategic prior knowledge elicitation + forced perspective diversification improved accuracy 9.5%.
- **Design influence**: Response anonymization to prevent identity-based conformity.

**Wynn, Satija & Hadfield (2025)** — Response anonymization
- Debate can decrease accuracy over time — agents shift correct→incorrect answers favoring agreement.
- Response anonymization (mask specialist identity in debate rounds) reduced identity bias gaps from 0.608 to 0.024.
- **Design influence**: Anonymize specialist labels during debate rounds; de-anonymize in final GapAnalysis.md output.

**Cohen et al.** (EMNLP 2023) — Cross-examination
- "Examiner" LLM generating follow-up questions about disputed claims achieves 78–80% F1 on factual claim verification — 17–20% better than confidence-based methods.
- Agent holding false belief contradicts itself when pressed on specifics.
- **Design influence**: Cross-examination as tiebreaker for persistent factual disputes before human escalation.

**PARMA** — Multi-agent dialogue protocol
- Defines allowable moves: propose, attack, defend; explicit termination conditions.
- **Design influence**: Thread debate protocol structure (Propose → Attack → Defend/Revise).

---

## Grounding Validation

**IEEE/ACM FORGE (2026)** — Code hallucination detection
- Deterministic AST analysis achieves 100% precision and 87.6% recall (F1 = 0.934) for detecting code hallucinations.
- **Design influence**: AST verification as first stage of grounding pipeline for structural claims.

**Jacovi & Goldberg** (ACL 2020)
- Binary faithfulness is unrealistic — a graded notion is essential.
- **Design influence**: Three-tier grounding system (Direct/Inferential/Contextual) instead of binary include/exclude.

**Chain-of-Verification (CoVe)** (Dhuliawala et al., Meta AI, ACL 2024)
- Increased FACTSCORE by 28% through: draft → plan verification questions → answer independently → synthesize.
- "Factored" variant (each verification question answered in isolation) is most effective.
- **Design influence**: Independent verification of specialist claims against diff without seeing specialist's analysis.

**MiniCheck** (Tang et al., 2024)
- Efficient fact-checking of LLM outputs against grounding documents.
- **Design influence**: Validates programmatic grounding checks for specialist findings.

**NAACL 2025** — Hallucination in multi-document synthesis
- LLMs generate convincing but fabricated summaries ~50% of the time when no relevant information exists in source documents.
- **Design influence**: Every GapAnalysis.md finding must trace back to a specific specialist review; provenance tagging.

**PROV-AGENT** (Souza et al., IEEE eScience 2025)
- Extends W3C PROV standard for multi-agent AI workflows; models each agent as PROV Agent subclass.
- **Design influence**: Provenance tagging in GapAnalysis.md synthesis trace for auditability.

**Grounded AI for Code Review** (production system)
- Pairs static-analysis findings with AST-guided context extraction; anchors every LLM explanation to verifiable evidence.
- **Design influence**: "Grounding first, then generate" pattern; AST-guided context extraction.

---

## Human-in-the-Loop Escalation

**HULA** (Atlassian)
- Human-in-the-loop agent framework for Jira; human authority over agent actions at each stage.
- Functional correctness testing expensive at scale; LLM-based evaluation variable — system must be deliberate about when to request heavier verification.
- **Design influence**: Escalation triggers for trade-offs and high-severity ungrounded findings.

**Magentic-UI** (Microsoft Research)
- Human-in-the-loop agentic system with co-planning and action approval/guards for oversight.
- **Design influence**: Contentious debate threads routed to "approval required" mode in interactive mode.

**"Who Should Predict?"** — Learning to defer
- Trains classifier + rejector deciding whether model or human should decide; deferral as first-class design axis.
- **Design influence**: Escalation rate target of 10–15% (sustainable); >20% causes alert fatigue, <5% risks dangerous autonomy.

**Klieber & Flynn** (CMU SEI, 2024)
- GPT-4 performs significantly better adjudicating a specific alert on a specific line versus "find all errors."
- **Design influence**: Per-finding targeted adjudication in synthesis rather than holistic judgment.

**IRIS** (ICLR 2025)
- Combines LLMs with static analysis for whole-repository vulnerability detection; 55 vulnerabilities vs CodeQL's 27.
- **Design influence**: Validates hybrid LLM + static analysis approach for grounding validation.
