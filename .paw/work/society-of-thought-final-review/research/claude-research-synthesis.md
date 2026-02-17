# Synthesis agent design for society-of-thought code review

**The critical gap in multi-agent code review isn't generating findings—it's merging them.** Research across computational argumentation, multi-document summarization, and multi-agent debate reveals that synthesis agents face three compounding challenges: distinguishing factual disputes from genuine trade-offs, preventing systematic bias toward earlier or more verbose specialists, and verifying that merged findings remain grounded in actual code. This report synthesizes findings from 40+ papers and systems into concrete design patterns for a 7-specialist code review architecture, organized around the five research areas requested.

---

## 1. Structured argumentation resolves factual disputes; Dempster-Shafer quantifies when to escalate

When two specialists contradict each other—"this IS a race condition" versus "this is NOT"—the system needs a protocol that goes beyond confidence voting. The most implementable approach combines **Toulmin-structured arguments** with **Dempster-Shafer belief fusion**.

**Toulmin structure as the specialist output contract.** Each specialist finding should be decomposed into six components: Claim ("race condition exists"), Data ("lines 42–47 show concurrent access to `sharedMap` without synchronization"), Warrant ("unsynchronized shared mutable access constitutes a race condition"), Backing ("Java Memory Model §17.4.5"), Qualifier (confidence level), and Rebuttal conditions ("unless the map is a ConcurrentHashMap"). This decomposition, formalized by Verheij (2009) for AI systems and operationalized in ASPIC+ (Modgil & Prakken, 2014), makes disagreements *diagnosable*—the synthesis agent can identify whether specialists disagree on observed data, inference rules, or exception conditions, rather than treating the dispute as an opaque binary.

**Dempster-Shafer fusion with dynamic rule switching for inter-agent aggregation.** Ghosh (2025) proposed a two-layer epistemic architecture directly applicable here. Each specialist reports belief intervals [Bel, Pl] rather than point confidence scores, explicitly representing ignorance. The system computes a **conflict coefficient K** between specialists. When K < 0.3, standard Dempster fusion yields strong consensus. When 0.3 < K < 0.7, PCR-style redistribution produces partial conclusions with explicit uncertainty markers. When **K > 0.7, Yager fail-safe routing escalates** with a structured "agents fundamentally disagree" signal. This graduated response avoids the known failure of Dempster's rule under high conflict (Zadeh's 1986 paradox, where normalization produces counterintuitive results).

**Cross-examination for persistent factual disputes.** Cohen et al. (EMNLP 2023) demonstrated that an "examiner" LLM generating follow-up questions about a disputed claim achieves **78–80% F1 on factual claim verification**—17–20% better than confidence-based methods. The mechanism: an agent holding a false belief will contradict itself when pressed on specifics ("Under what thread interleaving would the race manifest?" → inconsistent answer reveals the error). For the 7-agent system, when two specialists make contradictory factual claims and K remains high after one debate round, deploy cross-examination as a tiebreaker before escalating to a human.

**Anti-patterns to avoid.** DReaMAD (2025) identified **belief entrenchment** as the dominant failure mode: if most specialists share the same training bias about a coding pattern, standard debate reinforces the error. Their solution—strategic prior knowledge elicitation plus forced perspective diversification—improved accuracy by 9.5% over standard approaches. Sparse communication topology (2024) further showed that fully-connected debate graphs enable cascade effects where one persuasive-but-wrong agent sways the group; **limiting each specialist to 2–3 debate neighbors** preserves independent reasoning. Response anonymization (removing identity labels from inter-round messages) reduced identity bias gaps from 0.608 to 0.024 in Qwen-32B experiments—a near-complete elimination of sycophantic conformity.

**Recommended protocol for this context:**
1. Require all specialists to output findings in Toulmin structure
2. Compute pairwise Dempster-Shafer conflict coefficients across the 7 specialists per finding
3. Route low-conflict findings (K < 0.3) directly to synthesis
4. Route moderate-conflict findings (0.3–0.7) through one anonymized debate round with sparse topology
5. Route high-conflict findings (K > 0.7) through cross-examination, then escalate if still unresolved

---

## 2. Pareto dominance separates trade-offs from errors; risk scoring resolves them in auto-mode

The distinction between "one agent is wrong" and "both agents are right but their recommendations conflict" is the most under-researched problem in this domain. Three complementary mechanisms address it.

**Pareto dominance as the classification test.** If the security agent's recommendation strictly improves security without worsening any other quality attribute, it's not a trade-off—it's simply a fix, and any disagreeing agent is factually wrong. If it improves security but degrades performance, both positions lie on the **Pareto frontier**, making this a genuine trade-off requiring human judgment or principled defaults. Stanford's CDR Lab work on Pareto optimality for distributed agents states directly: "The resolution of such a conflict is often not subject to any objective algorithm." Carnegie Mellon's ATAM (Architecture Tradeoff Analysis Method) operationalizes this by mapping agent concerns to quality attribute scenarios—when two agents raise concerns at the same sensitivity point for different quality attributes, it's a trade-off point; when both address the same quality attribute with contradictory assessments, it's a factual dispute.

**Reasoning trace embeddings for automated classification.** "Disagreement as Data" (arXiv 2601.12618, January 2026) demonstrated that computing cosine similarity on LLM reasoning trace embeddings across ~10,000 agent pair instances robustly differentiates consensus from disagreement. High cosine distance on **orthogonal reasoning axes** (both well-supported) signals a trade-off; contradictory claims on the **same axis** signal a factual dispute. This provides a computationally tractable automated classifier.

**Auto-mode resolution via priority hierarchy and risk scoring.** No universal hierarchy exists, but industry consensus from Microsoft SDL, OWASP, and ISO 25010 converges on: **Correctness > Security > Reliability > Performance > Maintainability > Developer Experience.** Security is a hard constraint in Microsoft's SDL—"security and privacy should never be an afterthought." For quantified trade-offs, OWASP's Risk = Likelihood × Impact formula (with factors for exploitability, affected users, and business impact) and Microsoft's DREAD model (Damage + Reproducibility + Exploitability + Affected Users + Discoverability) provide structured scoring. The recommended auto-mode decision tree: if security risk is HIGH/CRITICAL, security wins; if security risk is LOW and performance impact is HIGH, performance wins; if both are MEDIUM, escalate—auto-mode is insufficient.

**Conservative defaults and reversibility preference.** The "Team of Rivals" architecture (arXiv 2601.14351, January 2026) achieved **90%+ internal error interception** with only 38.6% overhead by applying asymmetric veto authority (critics have more power than advocates) and pre-declared acceptance criteria defined before execution. Their core principle—"errors should die in committee, not surface to users"—argues for **fail-safe defaults**: when uncertain, choose the more restrictive option, prefer reversible changes, and apply flag-and-proceed in CI/CD (auto-approve with warnings for low-risk trade-offs, block for high-risk).

**Escalation triggers that work.** Research from Galileo AI and enterprise implementations converges on a **10–15% escalation rate** as sustainable; above 20% causes alert fatigue, below 5% risks dangerous autonomous decisions. Effective triggers include: agent disagreement unresolvable after 2–3 debate rounds, any HIGH-severity security finding in production code, more than 2 agents in multi-dimensional conflict, confidence below threshold on critical-path code, and novel patterns not seen in training history. LangGraph's interrupt mechanism and HumanLayer's multi-channel SDK (Slack, email) provide production-ready escalation infrastructure.

**Presenting trade-offs to humans.** Auto-generate Architecture Decision Record–style summaries with structured comparison tables showing each agent's position, quantitative impact estimates, and options. Rastogi et al. (CSCW 2022) demonstrated that AI's first recommendation heavily anchors human decisions—**randomize agent presentation order** and present options simultaneously, not sequentially. Present both gain and loss framing with absolute metrics.

---

## 3. The "neutral mediator" is a fiction—use a functional role with structural debiasing

Research decisively answers the question of whether a truly neutral synthesis agent is achievable: **it is not**, but functional neutrality through structural constraints is both achievable and superior to either pure neutrality or strong persona.

**Persona prompting doesn't improve factual accuracy.** A 2024 study across 4 LLM families and 2,410 factual questions found that adding personas to system prompts does not improve performance on accuracy tasks compared to no-persona controls. No consistent strategy for selecting personas outperformed random selection. However, Kim et al.'s "Persona is a Double-edged Sword" (2024) showed that **ensembling role-playing outputs with neutral outputs** and using an evaluator to select the best yields the most robust results—persona helps for some instances and hurts for others.

**The recommended identity: "senior tech lead performing final merge" with explicit structural constraints.** This provides task framing without introducing domain bias. The structural constraints do the real work: explicit rubrics, equality rules ("weight each reviewer equally regardless of length or position"), randomized input ordering, and traceability requirements. The Habermas Machine's success came not from neutrality but from **training to maximize group endorsement**—a structural objective, not a persona choice.

**The Habermas Machine's specific synthesis techniques.** The system (Tessler et al., Science 2024, Google DeepMind) uses a multi-stage process that code review can directly replicate:

1. **Multi-candidate generation**: Generate 4 diverse candidate syntheses, not a single output
2. **Personalized reward modeling**: Train a preference model on each specialist's typical priorities to predict how each would rate candidate syntheses
3. **Schulze method aggregation**: Select the winning synthesis using this Condorcet voting method, chosen for its independence-of-clones property and robustness to strategic voting
4. **Iterative critique**: Specialists critique the winning synthesis; the system incorporates critiques and generates revised candidates for re-voting

The **generate-then-select approach fundamentally outperforms single-pass synthesis**. For the code review system, generate 3–4 candidate GapAnalysis.md merges with different organizational strategies (severity-first, category-first, risk-first), then evaluate each against specialist preferences. Note: Cohen (PhilArchive) argues some of the Habermas Machine's advantage (56% vs 44% preferred over human mediators) may stem from perception of AI objectivity rather than superior synthesis.

**The merging strategy must be category-based, not sequential.** Research on multi-document summarization ordering effects is unequivocal. "Lost in the Middle" (Liu et al., 2024, TACL) documented a **>30% performance degradation** when critical information appears in the middle of the context, with a U-shaped attention curve favoring beginning and end positions. "Do Multi-Document Summarization Models Synthesize?" (TACL 2024) showed GPT-4 is over-sensitive to input ordering. EXSIR (NAACL 2025) demonstrated a **14.4% accuracy gain** by decomposing multi-condition tasks into individual assessments before combining. The recommended multi-phase architecture:

1. **Extraction**: For each of 7 reviews independently, extract structured findings (category, severity, evidence, confidence)
2. **Category clustering**: Group findings by category across all reviewers
3. **Within-category synthesis**: Merge findings per category, identifying agreements and conflicts
4. **Cross-category integration**: Identify cross-cutting themes and inter-category dependencies
5. **Priority ranking**: Apply severity-based ranking within the merged output

**Preventing verbosity and position bias.** Require each specialist to output findings in identical structured format (JSON with fixed fields: category, finding, severity, evidence, line_numbers, confidence). Randomize reviewer order for each synthesis run; run multiple times with different orderings and take consensus. LaMSUM (Chhikara et al., 2024) showed majority and approval-based voting across shuffled permutations consistently enhances stability. The Reasoning-based Bias Detector (RBD, 2025) improves evaluation accuracy by **18.5%** and consistency by 10.9% as a plug-in debiasing module—directly applicable.

**Hallucination in multi-document synthesis is severe.** NAACL 2025 findings show LLMs generate convincing but fabricated summaries **~50% of the time** when no relevant information exists in source documents. Every finding in GapAnalysis.md must trace back to a specific specialist review. MiniCheck (Tang et al., 2024) provides efficient fact-checking of LLM outputs against grounding documents.

---

## 4. Adaptive per-thread debate with convergence detection beats fixed rounds

The thread-based debate architecture benefits from three key insights: debate is a martingale (so directed interventions matter more than more rounds), conditional participation dramatically reduces cost, and identity anonymization prevents the dominant failure mode.

**The martingale problem.** Choi, Zhu & Li (2025) proved that multi-agent debate modeled as Bayesian posterior belief update forms a **martingale—expected belief in the correct answer remains unchanged across rounds**. Most performance gains from multi-agent debate come from initial ensemble diversity (majority voting), not from the debate process itself. The intervention that works: "MAD-oracle"—once an agent produces a high-confidence correct answer, **lock it from further revision**. This breaks the martingale symmetry and creates directional drift toward correctness. For code review: when 5+ specialists agree on a finding with high confidence after round 1, protect that finding from being debated away.

**MACI's dual-dial for per-thread continuation decisions.** MACI (Chang, 2023–2025) is the closest existing system to per-thread selective continuation. It uses an information dial (gates evidence by quality) and a behavior dial (schedules contentiousness from high to low). The system tracks four signals per thread: disagreement level, finding overlap, evidence quality, and argument quality. Threads halt when gains in these metrics plateau. High-quality evidence + low disagreement → 1–2 rounds. Poor evidence + high disagreement → extended debate. This is directly implementable as thread-level routing.

**Convergence detection via distributional stability.** Hu et al. (2025) used a Beta-Binomial mixture model with Kolmogorov-Smirnov statistic for adaptive stopping. Termination occurs when KS < 0.05 for **two consecutive rounds** (guarding against bouncing—Gemini-2.0-Flash was observed to destabilize after initial convergence). Key finding: agent agreement distributions converge to bimodal patterns (all agree or all disagree), meaning partial consensus is unstable and should be treated as unresolved.

**Conditional participation slashes cost by 94.5%.** S²-MAD (Zeng et al., NAACL 2025) introduced conditional participation where agents decide per-round whether their viewpoint adds information. A similarity calculation + redundancy filter suppresses "me too" contributions. Result: **94.5% token cost reduction** with <2% accuracy degradation. DyLAN (Liu et al., COLM 2024) uses an Agent Importance Score (backward message passing, inspired by backpropagation) to deactivate low-contributing agents. Their optimized team of 3 agents outperformed 7 agents in both accuracy and efficiency.

**Thread proliferation prevention requires four mechanisms:**

- **Phase-scoped discussion** (ChatDev pattern): Define allowable scope per thread upfront—a finding about SQL injection cannot spawn sub-threads about database architecture
- **Summarization gating** (GroupDebate, 2024): Compress sub-discussions before propagating; finer grouping (2,2,2 rather than 4,4) yields 10% lower cost and 17% higher accuracy
- **Redundancy filtering** (S²-MAD): Suppress contributions that don't add unique information
- **Trust-weighted sparse graphs** (CortexDebate, ACL Findings 2025): Use McKinsey Trust Formula T = (C×R×I)/S to prune unhelpful inter-agent connections, achieving up to **70.79% context length reduction**

**The dominant failure mode is sycophantic conformity, not deadlock.** Wynn, Satija & Hadfield (2025) showed debate can lead to *decreased* accuracy over time—agents shift from correct to incorrect answers favoring agreement over truth. Identity bias measurements show conformity exceeds obstinacy in most models. The proven mitigation: **response anonymization** (mask which specialist said what during debate rounds). This reduced identity bias gaps from 0.608 to 0.024 in controlled experiments with no retraining required.

**Recommended termination criteria per thread:**
1. Unanimous agreement after round 1 → close immediately (lock the finding)
2. KS statistic < 0.05 for 2 consecutive rounds → close with consensus finding
3. MACI-style plateau detection on evidence quality + disagreement metrics → close with qualified finding
4. Maximum 3 rounds reached with persistent disagreement → escalate or apply conservative default
5. K > 0.7 (Dempster-Shafer high conflict) at any point → fast-track to escalation

---

## 5. Five-stage grounding pipeline with graceful demotion replaces binary filtering

The synthesis agent's grounding validation must go beyond "does the specialist cite a real line number" to verify semantic claims while preserving valuable inferential insights through tiered confidence.

**Stage 1: Deterministic AST verification provides 100% precision on structural claims.** Research on LLM code hallucination detection (IEEE/ACM FORGE 2026) showed that deterministic AST analysis against a knowledge base achieves **100% precision and 87.6% recall** (F1 = 0.934) for detecting code hallucinations. For the synthesis agent: parse the diff, extract actual code elements (function names, variable types, line numbers), and verify every structural reference in specialist findings. Reject findings that reference phantom line numbers, nonexistent functions, or incorrect variable types. This catches the most egregious grounding failures at near-zero computational cost.

**Stage 2: NLI-based claim classification enables tiered treatment.** Natural Language Inference maps directly to code review grounding: entailment (diff directly supports the claim), contradiction (diff contradicts the claim), and neutral (claim cannot be verified from diff alone). Jacovi & Goldberg (ACL 2020) established that **binary faithfulness is unrealistic—a graded notion is essential**. The recommended three-tier classification:

- **Direct evidence**: Specialist cites specific code element visible in diff ("Line 42: `malloc()` without null check") → verify via AST
- **Inferential**: Claim requires reasoning about code behavior ("This loop causes O(n²) performance") → NLI entailment check + control flow analysis
- **Contextual**: Claim requires knowledge beyond the diff ("This architecture won't scale") → flag as ungroundable in diff, present with explicit caveat

**Stage 3: Chain-of-Verification (CoVe) for independent semantic verification.** Meta AI's CoVe (Dhuliawala et al., ACL 2024) increased FACTSCORE by **28%** through four steps: draft response, plan verification questions targeting subclaims, answer verification questions *independently* (not conditioned on the original response—this is critical), then synthesize. For each specialist finding, the synthesis agent generates verification questions ("What type is the variable on line 42?" "Is there bounds checking before this memcpy?"), answers them by re-examining the code diff without seeing the specialist's analysis, and compares results. The "factored" variant—each verification question answered in complete isolation—is the most effective.

**Stage 4: Graceful demotion via five tiers mirrors security operations best practices.** Binary include/exclude causes two documented problems: aggressive filtering removes valuable inferential insights, and permissive inclusion destroys developer trust (the "trust erosion cycle"). Semgrep's AI engine reduced 1,614 Dependabot alerts to just 31 reachable vulnerabilities (~98% noise reduction) through tiered confidence routing. The recommended tiers:

- **GROUNDED** (0.85+): Full inclusion, high priority—AST-verified and semantically confirmed
- **SUPPORTED** (0.60–0.84): Include with reasoning chain shown—inferential but consistent with diff
- **PLAUSIBLE** (0.40–0.59): Demote to "observation" with explicit caveat
- **UNVERIFIABLE** (<0.40): Demote to "suggestion" tier—requires context beyond diff
- **CONTRADICTED**: Exclude with explanation logged for audit trail

**Stage 5: Provenance tagging enables per-specialist calibration over time.** PROV-AGENT (Souza et al., IEEE eScience 2025) extends the W3C PROV standard for multi-agent AI workflows, modeling each agent as a PROV Agent subclass with LLM invocations linked to specific prompts and responses. For every finding in GapAnalysis.md, attach: source specialist, agent model version, evidence chain (code references with content hashes), grounding score, grounding tier, and synthesis decision. This enables downstream debugging and—critically—**per-specialist calibration**: if the security specialist consistently generates PLAUSIBLE-tier findings that humans later confirm, its baseline confidence should be adjusted upward.

**Code-specific insight: LLMs perform much better with targeted adjudication.** CMU SEI (Klieber & Flynn, 2024) found that GPT-4 performs significantly better when asked to adjudicate a *specific* alert on a *specific* line versus "find all errors." Microsoft's internal AI code review system, now covering **90% of PRs company-wide (600K+/month)**, uses category labels per finding (exception handling, null check, sensitive data) and never commits directly—the author retains control. IRIS (ICLR 2025) combines LLMs with static analysis for whole-repository vulnerability detection, finding 55 vulnerabilities versus CodeQL's 27, with 4 previously unknown issues.

---

## Conclusion: five architectural decisions that determine success

The research converges on five non-obvious conclusions that should shape the system architecture.

**First, the synthesis agent should generate multiple candidate merges and select, not synthesize in one pass.** The Habermas Machine's generate-then-vote approach, using the Schulze method for selection, outperformed human mediators. Single-pass synthesis is fragile and order-dependent.

**Second, debate rounds have diminishing and potentially negative returns.** The martingale property means unguided debate doesn't systematically improve accuracy. Lock high-confidence agreements early, use conditional participation to skip redundant exchanges, and cap at 3 rounds maximum before escalating.

**Third, the factual-versus-trade-off distinction must be automated, not assumed.** Pareto dominance testing and reasoning trace embedding similarity provide two complementary classifiers. Route factual disputes through cross-examination; route trade-offs through risk scoring or human escalation.

**Fourth, response anonymization is the single highest-impact intervention for debate quality.** Removing specialist identity labels from debate transcripts nearly eliminates sycophantic conformity—the dominant failure mode—without any model retraining.

**Fifth, graceful demotion preserves 3–5× more usable findings than binary filtering.** The five-tier confidence system, anchored by deterministic AST verification at the top and CoVe-style independent verification for semantic claims, balances noise reduction against insight preservation. Developer trust research shows that **false positive rates above 3–5% trigger disengagement**, making this tiering essential for production adoption.