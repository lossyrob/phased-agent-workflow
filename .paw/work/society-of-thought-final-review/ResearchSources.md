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
- **Design influence**: Dedicated security perspective is essential; confirms Security Paranoid persona's value.
