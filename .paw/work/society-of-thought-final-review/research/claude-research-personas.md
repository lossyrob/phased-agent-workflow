# Persona design for multi-agent code review systems

**Full personas with distinct reasoning strategies—not just different focus areas—are what produce genuinely diverse multi-agent reasoning.** The evidence is clear: the "Society of Thought" insight that rich personas outperform checklists is directionally correct, but the strongest research finding is that varying *how* agents think matters more than varying *what* they think about. A multi-agent code review system like PAW should combine narrative backstories, distinct cognitive strategies, structural anti-sycophancy mechanisms, and a parallel-propose → synthesize architecture capped at 3–5 specialist agents debating across 2–3 rounds. This report synthesizes findings from over 50 relevant papers to provide evidence-based design principles for every component of the system.

---

## 1. What makes personas produce genuinely diverse reasoning

The most consequential finding for PAW's design comes from **"Breaking Mental Set to Improve Reasoning through Diverse Multi-Agent Debate" (DMAD, ICLR 2025)**: assigning different *reasoning strategies* (direct inference, chain-of-thought, decomposed CoT) to different agents is **more effective than assigning different personas that all use the same reasoning method**. Traditional multi-agent debate with personas but identical prompting strategies leads to "fixed mental sets" where agents converge despite nominally different perspectives.

This has a direct implication for the five PAW personas. The Security Paranoid and Edge Case Bloodhound might currently produce overlapping reasoning because they both likely use similar analytical approaches. To maximize genuine diversity, each persona should embed a distinct cognitive strategy: the Security Paranoid could use threat modeling (attack-tree decomposition), the Scalability Skeptic could use quantitative back-of-envelope estimation, the Devil's Advocate could use first-principles questioning, the Edge Case Bloodhound could use boundary-value systematic enumeration, and the Empathetic Maintainer could use narrative walkthrough ("imagine a new hire reading this at 2 AM").

The "Diversity of Thought" paper (Hegazy, 2024) reinforces this from the model-diversity angle: **three medium-capacity diverse models hit 91% on GSM-8K versus 82% for three homogeneous GPT-4 instances**. When constrained to a single model provider, prompt-level diversity must compensate—and cognitive-strategy diversity is the most effective lever. The "AI Office" architecture (arXiv:2601.14351, January 2026) goes further, proposing agents with *opposing incentives*, not just different perspectives, following a Swiss-cheese model where errors are caught when agents with different failure modes validate each other.

One surprising counter-finding: **"Should We Be Going MAD?" (ICML 2024) found that multi-agent debate does not reliably outperform simple self-consistency sampling** in default configurations. The Multi-Persona approach "significantly underperforms almost any other baseline" without careful tuning. The implication isn't that multi-agent debate is useless—it's that **hyperparameter tuning of agreement levels, debate rounds, and topology matters enormously**, and out-of-the-box implementations often disappoint.

The Society of Thought paper itself (Kim, Lai, Scherrer et al., January 2026) provides the theoretical grounding: reasoning models like DeepSeek-R1 and QwQ-32B *spontaneously simulate multi-agent debate internally* when trained with reinforcement learning for accuracy. Two emergent persona types appear—an "Associative Expert" (pattern-matching proposer) and a "Critical Verifier" (characterized by **low Agreeableness and high Neuroticism**)—suggesting that effective multi-agent reasoning inherently requires both a generative and an adversarial pole.

---

## 2. Backstories, trait lists, or behavioral rules: what works best

The "Scaling Law in LLM Personality" paper (arXiv:2510.11734, 2025) tested four levels of persona detail and found that **validity of personality simulation depends primarily on the quantity and realism of information in the persona profile**, not model scale or fine-tuning. Euclidean distance from real human personality distributions dropped from 70.25 (standard demographic profiles) to **23.75 (human-authored character descriptions)**—a 66% improvement through richer descriptions alone.

The Berkeley BAIR "Anthology" paper (arXiv:2407.06576, 2024) confirmed that **rich life backstories significantly outperform simple demographic tuples** for persona conditioning, with improvements across Wasserstein distance, Frobenius norm, and Cronbach's alpha metrics. The "Scaling Law" paper's optimal approach treated persona generation as *storytelling*—narrative backstories of 2,000+ words with "coherent narrative structure, including beginning, development, climax, and resolution."

However, there's a critical caveat from Zheng et al. (EMNLP Findings 2024): across 162 roles and 2,410 factual questions, **adding personas to system prompts showed no or small negative effects on factual accuracy**. Personas help with perspective-dependent subjective tasks but can hurt objective reasoning. This means PAW's personas should guide *what to look for* and *how to evaluate it*, not claim to change the LLM's underlying analytical capability. The practical recommendation is a layered approach:

- **Narrative backstory** (establishes identity, motivation, and voice—makes reasoning genuinely different)
- **Explicit behavioral rules** (specific constraints like "always estimate computational complexity before commenting on any loop" or "you MUST raise a substantive concern every review round")
- **Few-shot example outputs** (2–3 examples of the persona's actual review comments calibrate style and depth)
- **Anti-convergence instructions** (explicit statements like "prioritize finding issues over agreeing with other reviewers")

PersonaLLM (NAACL Findings 2024) showed LLMs can reliably simulate Big Five personality traits with large effect sizes (Cohen's d up to **5.47 for Extraversion**), but with an important limitation: RLHF-aligned models struggle with high Neuroticism and low Agreeableness. This directly impacts the Devil's Advocate and Security Paranoid personas, which need structural forcing rather than trait assignment alone.

---

## 3. Persona drift is real and starts fast

The landmark study on persona drift (Li et al., ICML 2024) revealed **significant persona drift within eight conversation rounds**, caused by transformer attention decay: as conversation tokens accumulate, the system prompt's influence dilutes. A separate study (arXiv:2412.00804, 2024) found that counterintuitively, **larger models experience greater identity drift**.

The EchoMode system reported that after 8–12 dialogue turns, persona self-consistency metrics degrade by more than **30%**, even when full context remains available. For PAW, where agents may engage in multi-round debate, this means:

- **Re-inject persona reminders every 4–6 turns**—the cheapest effective mitigation
- **Keep system prompts dense and high-signal**—every token should carry meaning, since verbose prompts dilute their own influence through attention competition
- **Use the split-softmax approach** (Li et al.) for production systems—it separately normalizes attention between system prompt and conversation, providing better persona stability than prompt repetition
- **Monitor consistency** between rounds by comparing semantic similarity of each agent's outputs to its persona specification

One promising technique is "chain-of-persona" (arXiv:2503.17662, 2025): before generating a review comment, the model performs self-questioning rounds to re-align with its character persona. This is computationally expensive but effective for high-stakes reviews.

---

## 4. Making the Devil's Advocate actually push back

Sycophancy rates across major LLMs are alarmingly high: **ChatGPT 56.7%, Claude 58.2%, Gemini 62.5%** (SycEval, 2025). Anthropic's foundational sycophancy research (Sharma et al., ICLR 2024) traced the root cause to RLHF training—when a response matches a user's views, it's more likely to be preferred in human evaluations, so the model learns agreement as a strategy. In multi-agent contexts, **CONSENSAGENT (ACL Findings 2025)** found that sycophancy manifests as agents reinforcing each other's responses instead of critically engaging, driving premature convergence on incorrect conclusions.

The "Peacemaker or Troublemaker" paper (arXiv:2509.23055, 2025) explicitly modeled a spectrum from troublemaker to peacemaker in multi-agent debate, finding that sycophancy-prone agents produce worse outcomes. Effective countermeasures combine structural and prompting approaches:

- **Structural forcing** is the most reliable technique: "You MUST identify at least one substantive concern in every review round. You MUST present a counterargument before agreeing with any other reviewer's assessment." This removes the option of passive agreement.
- **Frame questions to elicit criticism**: "What could go wrong with this implementation?" outperforms "What do you think about this code?" The former presupposes problems exist.
- **Separate instances for opposing roles**: Don't ask one LLM call to play both advocate and critic. Use different prompts, different temperature settings, or ideally different model providers for adversarial agents.
- **Higher temperature for adversarial agents**: Increases output diversity and disagreement willingness.
- **Explicit anti-sycophancy clauses**: "Prioritize finding real issues over maintaining harmony. If you agree with another reviewer, you must provide *independent* evidence rather than referencing their argument."
- **Calibrate sycophancy per agent role**: The Devil's Advocate should have the strongest anti-convergence instructions; the Empathetic Maintainer can be slightly more agreeable since its role is constructive.

The IUI 2024 study on LLM-powered devil's advocates found that **interactive devil's advocates** (that engage in back-and-forth) were perceived as higher quality than non-interactive ones. But there's a key limitation: devil's advocates that repeat the same objection without fresh insights get ignored. PAW's Devil's Advocate should be designed to escalate—each round should introduce a *new* challenge rather than restating the same concern.

---

## 5. Optimal debate architecture: 3–5 agents, 2–3 rounds, sparse topology

Research converges strongly on group size. Google DeepMind's scaling study (arXiv:2512.08296, January 2026) evaluated **180 agent configurations across 5 architectures** and found that **performance typically plateaus around 4 agents**, after which additional agents contribute little. The A-HMAD study found accuracy improving from 72% (1 agent) to 87% (3 agents) to 90% (5 agents) to 91% (7 agents)—**clear diminishing returns beyond 5**. The "Multi-Agent Teams Hold Experts Back" paper (February 2026) found that adding non-expert agents can actively *dilute* expert contributions through an "expertise dilution effect."

PAW's current design of **5 specialist agents hits the empirical sweet spot**. Adding a sixth would provide marginal benefit at significant computational cost.

For debate rounds, most studies find consensus solidifies within **2–3 rounds** for similarly capable LLMs (Du et al., 2023; Liu et al., 2024). Performance can actually decline after further rounds. The strongest recommendation is **adaptive termination**—stop when agents converge or when no new substantive findings emerge—rather than a fixed round count.

The communication topology matters surprisingly much. "Improving Multi-Agent Debate with Sparse Communication Topology" (EMNLP 2024) showed that **sparse topologies achieve comparable or superior performance to fully-connected while reducing token costs by 40%+**. For difficult problems, limiting exposure to potentially incorrect information actually helps prevent misleading. The study also found that assigning stronger agents to higher-centrality positions in the communication graph yields better results. For PAW, this suggests the synthesizer/moderator should have the most connections, while individual specialists can operate more independently.

The most effective overall architecture pattern is **parallel-propose → sequential-aggregate**, as demonstrated by the Mixture-of-Agents framework (ICLR 2025), which achieved **65.1% on AlpacaEval 2.0 versus GPT-4o's 57.5%** using only open-source LLMs. Each specialist reviews independently (the "propose" phase), then an aggregator synthesizes findings. The Archon framework (Stanford, 2024) showed that adding layers of critique and fusion on top of generation yields an **18.8% performance boost**.

For synthesis specifically, **confidence-weighted voting** (from ReConcile, ACL 2024) and **evidence-based adjudication** (AgentAuditor, 2025) both outperform simple majority voting. AgentAuditor's insight is particularly relevant: majority voting fails when agents repeat the same flawed reasoning (confabulation consensus), so the aggregator should examine reasoning traces, not just conclusions.

One critical finding: the DeepMind scaling study identified a **"tool-coordination trade-off"**—communication overhead fragments the reasoning process, leaving insufficient "cognitive budget" for the actual task. For strictly sequential reasoning tasks, multi-agent coordination can *degrade* performance by 39–70%. Code review, however, is inherently parallelizable (each perspective can analyze independently), making it an ideal use case for multi-agent approaches.

---

## 6. Perspective-based reading: the software engineering foundation

PAW's approach has deep roots in **Perspective-Based Reading (PBR)**, a technique pioneered by Basili et al. (1996) at NASA. The core finding is directly relevant: **the overlap of defects detected among inspectors using different perspectives is low**—each perspective finds unique issues. PBR teams achieve significantly better coverage than teams using ad hoc reading or checklists.

Laitenberger and DeBaud (1997) adapted PBR for code inspection at Robert Bosch GmbH and found two critical results. First, **PBR is more effective than checklist-based reading (CBR)**—inspection teams using PBR detected more unique defects at lower cost per defect (confirmed across 60 professional developers at Bosch Telecom). Second, and highly relevant for AI agents: **PBR made individual defect detection independent of reviewer experience**. This eliminates the biggest advantage AI agents have over human reviewers—they don't need domain experience to be effective if given a well-defined perspective.

However, a meta-analysis revealed PBR's Achilles' heel with human reviewers: **only 1 in 5 reviewers actually followed their assigned perspectives**, most reverting to ad hoc reading. LLM agents eliminate this process conformance problem entirely, making AI-based PBR potentially more effective than human PBR has ever been in practice.

The defect taxonomy research adds nuance to PAW's persona priorities. Mäntylä and Lassenius (IEEE TSE, 2009) found that **75% of defects discovered in code review are evolvability defects** (readability, structure, documentation), with only 25% being functional bugs. This validates the Empathetic Maintainer as addressing the single largest category of review findings. The security review research (Edmundson et al., 2013) found that among 30 developers hired specifically for security code review, **none found all 7 known vulnerabilities**, confirming that dedicated security perspective is essential but must be supplemented.

For optimal coverage, research suggests this priority ordering: **correctness/logic bugs → security vulnerabilities → performance issues → maintainability/readability → style**. But since maintainability findings are 3x more frequent than functional bugs, both categories deserve dedicated agents.

A recent multi-role code review study (arXiv:2505.17928, May 2025) demonstrated that multi-role LLM collaboration achieves **2× improvement over single-pass LLM review** and 10× over previous baselines on real-world merge requests—the most direct validation of PAW's multi-agent approach.

---

## 7. Human interaction with the agent panel

Research on humans participating in multi-agent AI systems is sparse but rapidly emerging. The most directly relevant study is Triem (2024), published in ASIS&T Proceedings, which tested human-in-the-loop multi-agent debate on US district court decisions. The key finding: **LLMs weigh human input more heavily than AI opinion, but only by a small threshold**. The reasoning process of multi-agent decision-making was "strikingly similar to human decision-making."

The "Koala" system (arXiv:2501.17258, 2025) tested multi-party AI in Slack group chats and identified three ways users wanted to control agent behavior: assigning roles, conversational control via natural language, and persona selection. A critical UX finding was **production blocking**—AI responses sometimes stifled original human thinking, with one participant noting "there was less room for expressing unique ideas."

For cognitive load management, research from Steyvers and Kumar (2023) identifies the **sequential presentation paradigm** as optimal: humans form their own assessment first, then see AI perspectives. This prevents anchoring bias and maintains the human's independent judgment. The alternative—concurrent presentation where all AI perspectives appear immediately—risks cognitive overload and over-reliance.

The **Habermas Machine** study (Tessler et al., 2024, *Science*, N=5,734) demonstrated that AI-mediated multi-perspective deliberation on contentious topics left groups **less divided** afterward, with AI-generated syntheses preferred 56% to 44% over human mediators. The key design insight: successful syntheses incorporated dissenting voices while respecting the majority position—exactly what PAW's synthesis phase should do.

Perhaps the most actionable finding: **"Wisdom from Diversity" (arXiv:2505.12349, 2025) showed hybrid crowds (humans + LLMs) outperformed both purely human and purely LLM groups**, with complementary strengths—humans provide diversity, LLMs provide individual accuracy. This validates the human-in-the-loop design where developers can participate in the debate rather than merely observing it.

For trust, predictable agent behavior reduces cognitive load and increases willingness to engage (Frontiers in Robotics and AI, 2021). Each agent in PAW should have a consistent, clearly labeled identity so developers can quickly learn each persona's tendencies and evaluate their findings accordingly.

---

## 8. Evidence-based design principles for PAW

Based on the full body of research, here are the synthesized recommendations ranked by confidence and impact:

**High confidence, high impact:**

1. **Embed distinct reasoning strategies in each persona, not just different focus areas.** The Security Paranoid should use attack-tree decomposition; the Scalability Skeptic should use quantitative estimation; the Devil's Advocate should use Socratic questioning; the Edge Case Bloodhound should use systematic boundary enumeration; the Empathetic Maintainer should use narrative code walkthrough.

2. **Use rich narrative backstories (500–2000 words) combined with explicit behavioral rules and 2–3 example outputs.** This three-layer approach produces the most distinct, consistent personas. Simple role labels ("you are a security expert") provide negligible benefit.

3. **Structurally force disagreement rather than relying on personality traits.** Include rules like "you MUST identify at least one substantive concern per review round" and "you MUST present independent evidence before agreeing with another reviewer." RLHF training actively fights against confrontational personas.

4. **Run specialists in parallel, then aggregate with a synthesis agent.** This matches the empirically validated MoA/Archon pattern. The synthesizer should examine reasoning traces, not just conclusions.

5. **Cap at 2–3 debate rounds with adaptive termination.** Stop when no new substantive findings emerge. Extended debate increases costs and can degrade quality.

**High confidence, medium impact:**

6. **Re-inject persona descriptions every 4–6 turns in multi-round debate.** Persona drift begins at ~8 turns and degrades consistency by 30%+.

7. **Include at least one "neutral" agent or cross-check.** The Jekyll & Hyde finding shows persona-prompted reasoning should always be validated against a non-persona baseline. Consider running a brief neutral-prompt review as a sanity check.

8. **Use confidence-weighted aggregation, not majority voting.** Have each agent express confidence in its findings; weight the synthesis accordingly.

**Medium confidence, high impact:**

9. **Use different model providers for adversarial agents when possible.** The "Team of Rivals" approach shows that cross-provider diversity catches errors that shared training would miss. If PAW supports multiple backends, route the Devil's Advocate through a different model than the others.

10. **Let users generate task-specific personas dynamically.** Solo Performance Prompting (NAACL 2024) showed that dynamically generated, task-specific personas outperform fixed rosters. PAW's custom persona feature via free-form markdown is well-aligned with this finding.

**Surprising findings that should change the approach:**

- **Multi-agent debate can underperform self-consistency sampling without careful tuning** (ICML 2024). Don't assume more agents = better results. Validate PAW against a single-agent baseline with self-consistency.
- **75% of code review findings are maintainability issues, not bugs** (Mäntylä & Lassenius). The Empathetic Maintainer addresses the largest category of useful findings—it's not the "soft" persona, it's the highest-volume one.
- **PBR's biggest human weakness (only 20% follow assigned perspectives) disappears with AI agents.** This is PAW's structural advantage over human review teams.
- **Larger models drift *more* from assigned personas**, not less. Don't assume more capable models maintain personas better.
- **Moderate disagreement outperforms maximal disagreement** (EMNLP 2024). The Devil's Advocate should be calibrated for productive challenge, not maximally adversarial confrontation.
- **Consensus works better for knowledge tasks; voting works better for reasoning tasks** (ACL Findings 2025). Code review contains both—use consensus for "is this approach correct?" questions and severity-weighted voting for "how important is this finding?" questions.