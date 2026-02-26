# Deep Research: Temporal & Perspective Shifts for Multi-Agent Review Diversification

## Research Objective

I'm designing a feature for a **Society of Thought (SoT) engine** — a multi-agent deliberative review system used for AI-assisted code review, design review, and planning review. The engine orchestrates specialist personas (security, architecture, performance, testing, etc.) that independently analyze the same artifact and then synthesize findings through parallel or debate interaction.

Each specialist has:
- A **domain** (e.g., security, architecture)
- A **cognitive strategy** (e.g., adversarial probing, pattern-matching, boundary analysis)
- A **narrative backstory** grounding their perspective in formative professional experiences
- Optionally, a **different LLM** powering them (cross-model diversity is already supported)

**The proposed feature**: Add an orthogonal diversity axis — **perspective shifts** — where the same persona can be run with different temporal or contextual framings to produce meaningfully more diverse findings. Early ad hoc experiments pairing pre-launch framing ("find the cracks before we ship") with post-launch retrospective framing ("six months after launch, what broke?") on the same persona produced noticeably different findings than model diversity alone.

## What I Need

Comprehensive research across academic literature, industry practice, and AI/ML research covering the following areas. Prioritize findings with empirical evidence, but include well-reasoned theoretical frameworks too.

---

### 1. Temporal Perspective Shifts in Multi-Agent Systems

- **Temporal framing effects on LLM output**: Does instructing an LLM to reason from a future retrospective ("imagine this has been in production for 6 months — what went wrong?") versus a present-tense evaluation ("review this code for issues") produce measurably different findings? Any studies on hindsight bias simulation, prospective hindsight (premortem technique), or temporal reframing in LLM prompting?

- **Premortem / prospective hindsight research**: Gary Klein's premortem technique has been studied in human decision-making. Has anyone applied this to LLM-based evaluation systems? Does the "imagine failure has already occurred" framing improve defect detection or risk identification in AI agents?

- **Temporal diversity in ensemble/debate systems**: In multi-agent debate or ensemble evaluation architectures (e.g., LLM-as-judge with multiple perspectives), has anyone systematically varied temporal framing as a diversity axis? What were the results compared to other diversity strategies (different models, different prompts, different temperatures)?

---

### 2. Perspective-Taking and Role Diversity in LLM Systems

- **Persona-based diversity research**: Studies on how assigning different personas, roles, or perspectives to LLMs affects output diversity and quality. Does the "same role, shifted lens" approach (same domain expert but different framing) produce meaningfully different outputs compared to "different role" approaches?

- **Cognitive diversity dimensions**: Beyond temporal shifts, what other perspective axes have been studied or proposed for multi-agent LLM systems? Examples: adversarial vs. collaborative, greenfield vs. legacy migration, individual contributor vs. team lead, optimistic vs. pessimistic, etc. Which axes produce the most orthogonal (non-redundant) findings?

- **Perspective shift saturation**: How many perspective axes can be combined before diminishing returns or incoherence? Is there research on the cognitive/prompt coherence limits when layering multiple framing dimensions (role × temporal × adversarial stance × experience level)?

---

### 3. Multi-Model Diversity and Its Interaction with Prompt Diversity

- **Model diversity vs. prompt diversity**: In systems that already use different LLMs for different agents, does adding prompt-level diversity (perspective shifts) provide additive benefit? Or does model diversity already capture most of the output variance, making prompt diversity redundant?

- **Interaction effects**: Are there known interaction effects between model choice and perspective framing? E.g., does a future-retrospective prompt on GPT-5 produce more differentiated output from a present-tense prompt on Claude Opus than two present-tense prompts on the same two models?

- **Optimal diversity strategies**: Research on how to maximize diversity of findings in multi-agent evaluation systems — what combination of model diversity, prompt diversity, temperature variation, and persona variation produces the highest-quality aggregate output with the least redundancy?

---

### 4. Prompt Engineering for Perspective Shifts

- **Techniques for shifting perspective while preserving identity**: How do you change an agent's temporal or contextual lens without overriding its specialist domain and cognitive strategy? Practical prompt engineering patterns for "additive framing" that layers on top of an existing persona rather than replacing it.

- **Framing stability across models**: Do perspective shift prompts work consistently across different LLMs, or do some models respond more strongly to temporal reframing than others? Any research on cross-model robustness of perspective prompts?

- **Prompt structure for perspective variants**: Should the perspective shift be injected as a system-level frame, a user-level instruction, or embedded in the persona narrative? Research on where in the prompt architecture framing is most effective for LLMs.

---

### 5. Evaluation and Measurement

- **Measuring diversity of findings**: How do you quantitatively measure whether perspective shifts actually produce more diverse (and not just more) findings? Metrics for output diversity in multi-agent evaluation systems — semantic similarity, topic coverage, finding category distribution, novel finding rate.

- **Quality vs. quantity trade-off**: Does increasing perspective diversity increase the total volume of findings without improving the signal-to-noise ratio? Research on precision/recall trade-offs in multi-perspective evaluation.

- **Synthesis challenges**: When agents with different temporal framings produce conflicting assessments of the same code, how should a synthesis layer resolve the conflict? Is a confidence-weighted approach sufficient, or does temporal framing require special handling in synthesis?

---

### 6. Related Architectures and Systems

- **Existing multi-agent debate/evaluation systems**: Survey of existing systems that use multi-agent architectures for code review, document review, or evaluation tasks. How do they handle diversity? Examples: ChatEval, AgentReview, LLM-Debate, multi-agent code review tools, ensemble-based evaluation frameworks.

- **Society of Mind / Society of Thought implementations**: Systems inspired by Minsky's Society of Mind that use specialized agents with distinct perspectives. How do they manage diversity and avoid groupthink?

- **Red team / blue team / purple team patterns**: In AI safety and adversarial testing, how are different perspectives structured? Is there crossover applicability to code review diversification?

---

### 7. Composability and Configuration Design

- **User-facing configuration patterns**: In systems with multiple diversity axes, how is this exposed to users? Automatic pairing (system decides which perspectives to apply)? Explicit configuration? Adaptive selection based on content?

- **Combinatorial explosion management**: If you have N personas × M models × P perspectives, you get N×M×P agents. Research on managing this explosion — pruning strategies, adaptive selection, cost/quality trade-offs.

- **First-class concept vs. configuration layer**: From a software architecture perspective, should "perspective" be a first-class concept alongside "persona" (with its own definition files, discovery, and precedence), or should it be a configuration parameter applied to existing personas? Trade-offs of each approach.

---

## Output Format

For each research area, provide:
1. **Key findings** with citations (paper titles, authors, publication venues, dates)
2. **Relevance assessment** — how directly applicable is this to the SoT engine design
3. **Design implications** — concrete takeaways for how to implement perspective shifts
4. **Open questions** — gaps in the research that may require experimentation

Conclude with a **synthesis section** that recommends:
- Which perspective axes to prioritize for initial implementation
- Whether perspectives should be first-class or a configuration layer
- How perspective diversity interacts with existing model diversity
- A rough design sketch for how perspectives could compose with the existing SoT specialist system
