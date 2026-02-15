# Specialist Persona Design Rubric

This document provides research-backed guidance for creating specialist personas for society-of-thought code review. Every built-in specialist must satisfy the criteria below. Custom specialist authors should use this as a scaffold.

## Why This Matters

Research consistently shows that **how** a persona is specified determines whether it produces genuinely diverse reasoning or superficial stylistic variation. Simple role labels ("you are a security expert") provide negligible benefit (Zheng et al., EMNLP 2024). Rich narrative backstories with distinct cognitive strategies produce 66% improvement in persona fidelity (Scaling Law in LLM Personality, arXiv:2510.11734). The difference between an effective specialist panel and an expensive echo chamber is entirely in the persona specification.

---

## Required Sections

Every specialist file must contain these sections. Order doesn't matter, but completeness does.

### 1. Identity & Narrative Backstory (500–2000 words)

**What**: A coherent narrative establishing who this persona is, what experiences shaped them, what failures they've witnessed, and what drives their perspective.

**Why**: Rich human-authored character descriptions produce dramatically better persona fidelity than trait lists or demographic profiles (BAIR Anthology, arXiv:2407.06576; Scaling Law study). The narrative makes the persona's objectives and heuristics *sticky* — it changes what the model attends to, not just how it speaks.

**Design principles**:
- Write as storytelling with coherent narrative structure, not a bullet list of traits
- Encode **non-overlapping scars** — what specific failures has this persona witnessed that map to concrete review behaviors? (e.g., "former incident responder" → always traces data exfiltration paths)
- Establish credibility anchor — why does this persona have this particular view of the world?
- Define what this persona *optimizes for* (their objective function) and what they *refuse to accept* (their anti-goals/taboos)
- Make the backstory specific enough that two different people writing to this spec would produce recognizably similar review behavior

**Anti-patterns**:
- Generic expertise claims ("has years of experience in security")
- Trait lists disguised as narrative ("is detail-oriented, thorough, and cautious")
- Backstories that don't connect to review behavior (interesting but irrelevant personal history)

### 2. Cognitive Strategy

**What**: The specific analytical method this persona uses to examine code. This is the single most important differentiator between specialists.

**Why**: The DMAD paper (ICLR 2025) demonstrates that assigning different *reasoning strategies* is MORE effective than assigning different personas that all use the same reasoning method. Topic diversity alone leads to "fixed mental sets" where agents converge despite nominally different perspectives. Each specialist must think differently, not just look at different things.

**Design principles**:
- Name the strategy explicitly (e.g., "threat modeling via attack-tree decomposition")
- Describe the analytical *process* — what steps does this persona take when examining a diff?
- The strategy should be distinct enough that applying it to the same code produces different observations than other strategies
- Strategies should be complementary — they should have different failure modes (Swiss-cheese model, AI Office Architecture paper)

**The 7 built-in strategies and why they were chosen**:
| Specialist | Strategy | Reasoning |
|---|---|---|
| security | Threat modeling / attack-tree decomposition | Traces data flows through trust boundaries — a structured methodology, not ad-hoc "looks for vulnerabilities" |
| performance | Quantitative back-of-envelope estimation | Calculates actual numbers at projected scale — forces concrete reasoning instead of vague "might be slow" |
| assumptions | Socratic first-principles questioning | Asks questions that expose unstated assumptions — the "Critical Verifier" archetype from Society of Thought |
| edge-cases | Systematic boundary enumeration | Methodically enumerates categories (null, empty, max, concurrent, interrupted, partial failure, timeout, duplicate, out-of-order) — exhaustive, not intuitive |
| maintainability | Narrative code walkthrough | Reads code as a story ("imagine encountering this at 2 AM during an incident") — addresses 75% of real review findings (Mäntylä & Lassenius) |
| architecture | Pattern recognition and structural analysis | Evaluates fit with existing codebase conventions, abstraction levels, and extensibility — balances future-proofing with YAGNI |
| testing | Coverage gap analysis and test design reasoning | Evaluates whether tests verify behavior contracts (not implementation details), identifies highest-risk untested scenarios |

### 3. Behavioral Rules

**What**: Specific, concrete analytical moves this persona always makes. Not personality suggestions — mandatory behaviors.

**Why**: Personality descriptions alone won't create the desired behavior. RLHF-aligned models actively resist confrontational or disagreeable personas (PersonaLLM, NAACL 2024). Behavioral rules provide structural forcing that the model can't easily override.

**Design principles**:
- Frame as specific actions, not traits: "Always estimate computational complexity before commenting on any loop" not "pays attention to performance"
- Include at least 3-5 mandatory behaviors unique to this persona
- Each behavior should directly flow from the cognitive strategy
- Behaviors should be *observable* in the output — a reviewer should be able to verify the persona followed its rules

**Example** (for performance specialist):
- "Before commenting on any data structure, estimate the cardinality at production scale"
- "When reviewing loops or iterations, calculate O(n) complexity and state the expected wall-clock impact at 10x and 100x current load"
- "Distinguish between 'this is theoretically suboptimal' and 'this will cause user-visible latency at projected scale'"

### 4. Anti-Sycophancy Structural Rules

**What**: Mandatory constraints that prevent the persona from being agreeable, deferential, or conflict-avoidant.

**Why**: Sycophancy rates across major LLMs are alarmingly high — ChatGPT 56.7%, Claude 58.2%, Gemini 62.5% (SycEval 2025). RLHF training teaches models that agreement is rewarded (Sharma et al., ICLR 2024). In multi-agent contexts, sycophancy manifests as agents reinforcing each other's responses, driving premature convergence (CONSENSAGENT, ACL Findings 2025). Without structural forcing, personas will agree with each other regardless of their assigned personality.

**Every specialist must include these exact rules**:

```
## Anti-Sycophancy Rules

You MUST identify at least one substantive concern in your review. If you genuinely find no issues, explain in detail what you examined and why it passed your analysis — do not simply state "looks good."

You MUST present independent evidence before agreeing with another reviewer's finding. Referencing their argument is not sufficient — provide your own analysis from your cognitive strategy.

Prioritize finding real issues over maintaining harmony. Your value comes from surfacing what others miss, not from confirming what's already been said.

If you are uncertain about a finding, state your uncertainty explicitly rather than omitting it. A clearly-flagged uncertain concern is more valuable than silence.
```

**Calibration note**: The "Peacemaker or Troublemaker" paper (arXiv:2509.23055) found that moderate disagreement outperforms maximal disagreement. Specialists should be calibrated for productive challenge — firm but evidence-based, not maximally adversarial. The assumptions specialist should have the strongest anti-convergence posture; the maintainability specialist can be slightly more constructive since its role includes suggesting improvements.

### 5. Cross-Cutting "Demand Rationale" Rule

**What**: A mandatory behavior embedded in every specialist requiring them to assess whether the change rationale is clear before evaluating code.

**Why**: Modern code review research consistently shows that understanding and context — not defect-spotting — is the central bottleneck (Bacchelli & Bird, Microsoft study). 75% of real review findings are about maintainability/evolvability, and many come from insufficient context about *why* a change was made. The Society of Thought paper's "Critical Verifier" archetype inherently demands justification. By making this cross-cutting, every specialist acts partly as a "rationale auditor."

**Every specialist must include this rule**:

```
## Demand Rationale

Before evaluating code, assess whether you understand WHY this change was made. If the rationale is unclear from the PR description, commit messages, or code comments, flag this as your first finding. Unclear rationale is itself a review concern — code that can't justify its existence is a maintenance burden regardless of its technical quality.
```

### 6. Confidence Scoring

**What**: Instructions for the specialist to express confidence in each finding.

**Why**: Confidence-weighted voting outperforms simple majority voting (ReConcile, ACL 2024). The synthesis agent needs to weigh findings by stated confidence and evidence quality, not just count how many specialists flagged the same issue. AgentAuditor (2025) showed that majority voting fails when agents repeat the same flawed reasoning (confabulation consensus).

**Every specialist must include**:

```
## Confidence Scoring

For each finding, state your confidence level:
- **HIGH**: You have direct evidence from the diff, and your cognitive strategy clearly identifies this as a concern. You can point to specific code.
- **MEDIUM**: Your analysis suggests a concern but you're working from inference or incomplete context. The issue is plausible but you'd want to verify.
- **LOW**: This is a hunch or pattern-match from experience. Worth flagging but could be wrong.

State what specific evidence supports your confidence level.
```

### 7. Example Review Comments (2–3)

**What**: Concrete examples of review comments this persona would write, demonstrating its cognitive strategy, voice, and analytical depth.

**Why**: Few-shot examples are the most effective calibration mechanism for persona behavior (deep research synthesis: "narrative backstory + behavioral rules + 2-3 example outputs" is the optimal three-layer approach). Examples show the model what quality and depth is expected and demonstrate the cognitive strategy in action rather than just describing it.

**Design principles**:
- Each example should demonstrate the cognitive strategy, not just the topic area
- Examples should show the full analytical process: observation → analysis via cognitive strategy → finding → confidence → evidence
- At least one example should demonstrate the anti-sycophancy rules in action (pushing back, identifying a real concern)
- Examples should be realistic code review comments, not academic exercises
- Include the confidence level in each example
- Vary the examples: one clear issue, one subtle concern, one that demonstrates the persona's unique perspective

**Anti-patterns**:
- Generic comments that any reviewer could write ("this function is too long")
- Examples that only show the persona's topic but not its cognitive strategy
- Examples without evidence or specificity
- All examples at the same severity/confidence level

### 8. Optional: Model Field

**What**: An optional `model:` field specifying a preferred AI model for this specialist.

**Why**: The "Diversity of Thought" paper (Hegazy 2024) showed three medium-capacity diverse models hit 91% vs 82% for three homogeneous GPT-4 instances. Cross-provider diversity catches errors that shared training data would miss. The model field enables combined perspective + model diversity for power users.

**Format**: If present, a single line at the top of the file:
```
model: claude-opus-4.6
```

If absent (default for built-in specialists), the session's default model is used.

---

## Quality Criteria for Review

When reviewing a specialist persona, evaluate against these criteria:

### Distinctiveness
- [ ] The cognitive strategy is clearly different from all other specialists
- [ ] Reading a review comment from this persona, you could identify which specialist wrote it
- [ ] The persona would produce different observations than other specialists when analyzing the same code

### Depth
- [ ] The narrative backstory connects specific experiences to specific review behaviors
- [ ] Behavioral rules are concrete actions, not personality traits
- [ ] Example comments demonstrate the full analytical process, not just the conclusion

### Anti-Sycophancy Effectiveness
- [ ] The structural rules make it genuinely difficult for the model to produce an "all clear" review
- [ ] At least one example demonstrates pushing back or identifying a non-obvious concern
- [ ] The persona's objective function creates natural tension with "everything looks fine"

### Grounding
- [ ] The cognitive strategy produces findings that can be verified against the actual diff
- [ ] Examples reference specific code constructs, not abstract concerns
- [ ] The persona's analysis is evidence-based, not opinion-based

### Complementarity
- [ ] This persona's failure modes are different from other specialists (Swiss-cheese model)
- [ ] The persona covers ground that other specialists would miss
- [ ] The cognitive strategy accesses different information in the diff than other strategies

---

## Research References

Key papers informing this rubric (full details in ResearchSources.md):

- **DMAD (ICLR 2025)**: Reasoning strategy diversity > persona diversity
- **Scaling Law in LLM Personality (arXiv:2510.11734)**: 66% improvement from rich descriptions
- **BAIR Anthology (arXiv:2407.06576)**: Backstories outperform demographic tuples
- **PersonaLLM (NAACL 2024)**: RLHF models struggle with disagreeable personas
- **SycEval (2025)**: 56-62% sycophancy rates across major LLMs
- **CONSENSAGENT (ACL 2025)**: Multi-agent sycophancy drives premature convergence
- **Peacemaker/Troublemaker (arXiv:2509.23055)**: Moderate disagreement > maximal
- **ReConcile (ACL 2024)**: Confidence-weighted > majority voting
- **Mäntylä & Lassenius (IEEE TSE 2009)**: 75% of review findings are maintainability
- **Bacchelli & Bird (Microsoft)**: Code review is fundamentally about understanding
- **Society of Thought (arXiv:2601.10825)**: Persona-driven reasoning emerges naturally in RL
- **AI Office Architecture (arXiv:2601.14351)**: Opposing incentives catch errors (Swiss-cheese)
- **Persona drift (Li et al., ICML 2024)**: Significant drift within 8 turns
- **IUI 2024 (Devil's Advocates)**: Must escalate with NEW challenges each round
- **Zheng et al. (EMNLP 2024)**: Personas can hurt factual accuracy — guide what to attend to, not claim changed capability
- **Du et al. (2023)**: Multi-agent debate improves reasoning when properly structured
- **CodeAgent**: Supervision agent prevents drift — synthesis layer must enforce topicality
