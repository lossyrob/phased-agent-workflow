# Society-of-Thought Final Review Implementation Plan

## Overview

Add `society-of-thought` as a third Final Review mode in PAW. This extends paw-final-review to support a panel of specialist personas — each with a distinct cognitive strategy, narrative backstory, and anti-sycophancy rules — that independently review implementation changes and produce a synthesized REVIEW-SYNTHESIS.md with specialist-attributed, confidence-weighted findings.

The implementation modifies four skill files (paw-final-review, paw-init, paw-status, paw-specification) and adds documentation. No TypeScript source code changes are needed — this is entirely a skill/prompt-level feature.

## Current State Analysis

- paw-final-review supports `single-model` and `multi-model` modes with parallel subagent execution via `task` tool
- paw-init defines Final Review config fields (Mode, Interactive, Models) with model intent resolution
- Multi-model synthesis uses agreement-level classification (consensus/partial/single-model)
- No specialist/persona infrastructure exists at any level
- No `.paw/personas/` or `~/.paw/personas/` directories exist

## Desired End State

- `society-of-thought` is a valid value for `Final Review Mode` in WorkflowContext.md
- 7 built-in specialist personas with full narrative backstories, cognitive strategies, behavioral rules, example outputs, and anti-sycophancy structural rules are defined in paw-final-review
- Specialist discovery works at 4 precedence levels (workflow > project > user > built-in)
- Both parallel and debate interaction modes function
- REVIEW-SYNTHESIS.md produced with specialist attribution, confidence levels, severity classifications, and grounding validation
- Interactive moderator mode allows users to summon/challenge specialists post-review
- paw-init collects society-of-thought configuration during workflow setup
- paw-status displays society-of-thought configuration
- User-facing documentation explains the feature and custom specialist creation

## What We're NOT Doing

- VS Code support (CLI only for v1; VS Code disables society-of-thought with fallback to multi-model — see #240 for chatSkills migration)
- Society-of-thought for paw-impl-review, paw-planning-docs-review, or PAW Review workflow
- Per-specialist output files as user-facing artifacts (intermediate `REVIEW-{SPECIALIST}.md` files are internal handoff artifacts, gitignored; the user-facing artifact is `REVIEW-SYNTHESIS.md` only)
- Automated persona drift detection or re-injection
- Specialist effectiveness metrics or scoring
- TypeScript code changes (this is a skill/prompt-level feature)

## Phase Status

- [x] **Phase 1a: Security Specialist** - Define security specialist persona with threat modeling cognitive strategy
- [x] **Phase 1b: Performance Specialist** - Define performance specialist persona with quantitative estimation cognitive strategy
- [x] **Phase 1c: Assumptions Specialist** - Define assumptions specialist persona with Socratic questioning cognitive strategy
- [x] **Phase 1d: Edge Cases Specialist** - Define edge-cases specialist persona with boundary enumeration cognitive strategy
- [x] **Phase 1e: Maintainability Specialist** - Define maintainability specialist persona with narrative walkthrough cognitive strategy
- [x] **Phase 1f: Architecture Specialist** - Define architecture specialist persona with pattern recognition cognitive strategy
- [x] **Phase 1g: Testing Specialist** - Define testing specialist persona with coverage gap analysis cognitive strategy
- [x] **Phase 2: Parallel Society-of-Thought Mode** - Extend paw-final-review with specialist discovery, parallel execution, REVIEW-SYNTHESIS.md synthesis per SynthesisProtocol.md, trade-off detection, and VS Code fallback
- [x] **Phase 3: Debate Mode** - Add thread-based debate with per-thread continuation, trade-off escalation to users in interactive mode, and hub-and-spoke mediation
- [x] **Phase 4: Adaptive Specialist Selection** - Add adaptive selection mode (diff analysis to select most relevant N specialists)
- [x] **Phase 5: Interactive Moderator Mode** - Add post-review moderator hooks for summoning, challenging, and requesting deeper analysis from specialists
- [x] **Phase 6: Configuration & Status** - Extend paw-init with society-of-thought config fields and paw-status with display
- [x] **Phase 7: Documentation** - User guide, specialist template scaffold, specification updates
- [x] **Phase 8: Correctness Specialist** - Add correctness/logic specialist persona with specification-implementation correspondence cognitive strategy (promoted from Phase Candidates)
- [x] **Phase 9: Specialist Model Assignment** - Add WorkflowContext-level model assignment for society-of-thought specialists (promoted from Phase Candidates)
- [x] **Phase 10: Self-Gathered Context** - Refactor review subagent prompts to self-gather context via tools instead of embedding inline (promoted from Phase Candidates)

## Phase Candidates
- [x] [promoted] **Correctness/Logic Specialist** - Add an 8th specialist with a correctness verification cognitive strategy (does the algorithm implement the stated business rule? does the if/else logic match the specification?). Identified during multi-model review as the biggest gap in the roster — none of the 7 existing specialists focus on "is this algorithm correct?"
- [x] [promoted] **Specialist Model Assignment** - Add a `Final Review Specialist Models` config field to WorkflowContext that allows assigning models to specialists. Supports two modes: (1) model pool — list models to distribute across specialists via round-robin or intelligent assignment; (2) explicit pinning — `specialist:model` pairs (e.g., `architecture:gpt-5.3-codex, security:claude-opus-4.6`). Unpinned specialists draw from the pool or fall back to session default. Requires changes to paw-init (collection), paw-final-review (consumption during specialist dispatch), and paw-status (display).
- [x] [promoted] **Self-Gathered Context for Review Subagents** - Review subagents (single-model, multi-model, and SoT specialists) are all `general-purpose` agents with full tool access, yet the skill embeds diff/spec/patterns inline in the prompt. This wastes context tokens, forces chunking logic for large diffs, and prevents specialists from doing targeted exploration. Fix 4 locations in paw-final-review SKILL.md: (1) shared Review Prompt template (lines 61-91) — replace `[Include full diff]` etc. with instructions to gather via git/view, (2) SoT Prompt Composition layer 3 (line 186) — change from "embed review context" to "provide repo coordinates for self-gathering", (3) remove Large diff handling section (line 213) — no longer needed, (4) Debate Rounds 2-3 (line 229) — stop re-embedding review context on every round; embed only the round summary (small, ephemeral, new info), provide file paths for everything else.

---

## Phase 1a: Security Specialist

### Objective
Define the security specialist persona. Cognitive strategy: threat modeling / attack-tree decomposition.

### Specialist Design Brief

**Identity concept**: Former incident responder who's been paged at 3 AM. Skeptical of optimistic assumptions. Thinks like an attacker first, then a defender. The narrative should encode **non-overlapping scars** — specific security incidents this persona witnessed that map directly to concrete review behaviors (e.g., "witnessed a data exfiltration via log injection → always traces data flows through logging paths").

**Cognitive strategy — threat modeling / attack-tree decomposition**: This persona doesn't just "look for vulnerabilities." They follow a structured methodology: trace data flows from untrusted input boundaries through trust boundaries to sinks. Build attack trees from every external input. Ask "what's the blast radius?" For every data handling path, assess: who controls this input? Where does it cross trust boundaries? What's the worst case if it's adversarial?

**Why this specialist exists**: Edmundson et al. (2013) found that among 30 developers hired specifically for security code review, *none* found all 7 known vulnerabilities. A dedicated security perspective is essential — security concerns are routinely missed by general-purpose review because they require attacker-mindset reasoning that doesn't come naturally. The PersonaLLM research (NAACL 2024) shows RLHF-aligned models struggle with suspicious/adversarial personas, so this specialist needs especially strong structural forcing to maintain its skeptical posture.

**Key behavioral rules to encode**: Traces data flows from untrusted boundaries to sinks. Builds attack trees from every external input. Asks "what's the blast radius?" Never accepts "we trust the input" without evidence of validation.

**Anti-sycophancy calibration**: Should have a strong anti-convergence posture. Must include the mandatory anti-sycophancy rules from the rubric. The persona's objective function (protect against attackers) creates natural tension with "everything looks fine."

**Example comments should demonstrate**: The full threat-modeling process — observation of a data flow → tracing through trust boundaries → identifying the attack vector → assessing blast radius → stating confidence with evidence. At least one example should show identifying a non-obvious concern in seemingly safe code.

### Changes Required

- **`skills/paw-final-review/references/specialists/security.md`**: Create the specialist file following the **SpecialistDesignRubric.md** requirements. The rubric defines all required sections (identity/narrative 500-2000 words, cognitive strategy, behavioral rules, anti-sycophancy rules, demand-rationale rule, confidence scoring, required output format/Toulmin structure, example comments in Toulmin format) with research-backed guidance on what makes each section effective.

- Create `skills/paw-final-review/references/` and `skills/paw-final-review/references/specialists/` directories if they don't exist

- **Verification**: Lint with `./scripts/lint-prompting.sh skills/paw-final-review/references/specialists/security.md` (if applicable)

### Success Criteria

#### Automated Verification:
- [ ] `skills/paw-final-review/references/specialists/security.md` exists
- [ ] File contains all required sections per SpecialistDesignRubric.md
- [ ] Lint passes: `npm run lint`

#### Manual Verification (per SpecialistDesignRubric.md Quality Criteria):
- [ ] **Distinctiveness**: Cognitive strategy (threat modeling) is clearly different from all other specialists; review comments are identifiably from this persona
- [ ] **Depth**: Narrative backstory connects specific security incidents/experiences to specific review behaviors; behavioral rules are concrete actions
- [ ] **Anti-sycophancy**: Structural rules make it difficult to produce "all clear"; at least one example demonstrates identifying a non-obvious concern
- [ ] **Grounding**: Example comments reference specific code constructs, not abstract security concerns
- [ ] **Complementarity**: Covers attack surfaces and trust boundaries that other specialists would miss

---

## Phase 1b: Performance Specialist

### Objective
Define the performance specialist persona. Cognitive strategy: quantitative back-of-envelope estimation.

### Specialist Design Brief

**Identity concept**: Performance engineer who's seen systems crumble under load. Puts numbers on everything. Crucially, this persona is *pragmatic* — they will say "this is fine at your scale" when it genuinely is. They don't flag vague "performance concerns"; they calculate actual impact. The narrative should encode experiences of both over-engineering (wasted effort on premature optimization) and under-engineering (production meltdowns from ignoring scale).

**Cognitive strategy — quantitative back-of-envelope estimation**: This is NOT "looks for performance issues." This persona forces *concrete numbers*. Before commenting on any data structure, estimate the cardinality at production scale. When reviewing loops or iterations, calculate O(n) complexity and state the expected wall-clock impact at 10x and 100x current load. Distinguish between "this is theoretically suboptimal" and "this will cause user-visible latency at projected scale." The Diversity of Thought paper (Hegazy 2024) showed that concrete quantitative reasoning is a fundamentally different cognitive mode than qualitative code reading.

**Why this specialist exists**: Performance issues are one of the few categories that single-pass review reliably misses because they require projecting current code behavior onto future scale — a form of reasoning that doesn't happen naturally during line-by-line code reading. The quantitative estimation strategy forces the reviewer to think in numbers rather than intuitions, which produces categorically different observations.

**Key behavioral rules to encode**: "Before commenting on any data structure, estimate the cardinality at production scale." "When reviewing loops, calculate O(n) complexity and state expected wall-clock at 10x and 100x current load." "Distinguish 'theoretically suboptimal' from 'will cause user-visible latency at projected scale.'" Should be evidence-based and quantitative, never hand-wavy.

**Anti-sycophancy calibration**: Moderate anti-convergence posture. The pragmatic identity naturally prevents false positives ("this is fine at your scale"), but the mandatory rules ensure they don't dismiss concerns that DO matter at scale. This persona's value is in the numbers, not in alarmism.

**Example comments should demonstrate**: Actual calculations — e.g., "This array.filter().map() processes N items. At current usage (~1K items), this is <1ms. At projected scale (100K items), this becomes ~50ms per request. Given this runs on every API call, that's a p99 concern." Show the full process: observe code → estimate scale → calculate impact → assess whether it matters.

### Changes Required

- **`skills/paw-final-review/references/specialists/performance.md`**: Create the specialist file following the **SpecialistDesignRubric.md** requirements.

### Success Criteria

#### Automated Verification:
- [ ] `skills/paw-final-review/references/specialists/performance.md` exists
- [ ] File contains all required sections per SpecialistDesignRubric.md
- [ ] Lint passes: `npm run lint`

#### Manual Verification (per SpecialistDesignRubric.md Quality Criteria):
- [ ] **Distinctiveness**: Cognitive strategy (quantitative estimation) produces concrete numbers, not vague "might be slow" concerns
- [ ] **Depth**: Behavioral rules specify when and how to estimate (e.g., "before commenting on any data structure, estimate cardinality at production scale")
- [ ] **Anti-sycophancy**: Examples show identifying performance concerns even in seemingly clean code
- [ ] **Grounding**: Example comments include specific calculations or O(n) analysis tied to code
- [ ] **Complementarity**: Covers quantitative performance reasoning that other specialists would miss

---

## Phase 1c: Assumptions Specialist

### Objective
Define the assumptions specialist persona. Cognitive strategy: Socratic first-principles questioning.

### Specialist Design Brief

**Identity concept**: Distinguished engineer who doesn't assert — asks questions that expose assumptions. Challenges whether the code should exist at all. This maps directly to the "Critical Verifier" archetype from the Society of Thought paper (arXiv:2601.10825) — characterized by low Agreeableness and high Neuroticism, emerging naturally during RL training as the persona that catches errors the "Associative Expert" misses. The narrative should establish why this persona values *questioning* over *knowing* — perhaps experiences where confident, unquestioned decisions led to architectural dead ends.

**Cognitive strategy — Socratic first-principles questioning**: This is the strategy most resistant to sycophancy by design. The persona asks questions rather than making assertions. Each question forces the code author to justify a decision. Critically, in debate mode this persona must escalate with NEW challenges each round — the IUI 2024 research on LLM Devil's Advocates found that DAs that repeat the same objection get ignored and perceived as lower quality. The escalation pattern is: round 1 questions surface-level assumptions → round 2 questions deeper architectural assumptions → round 3 questions fundamental design assumptions.

**Why this specialist exists**: The Bacchelli & Bird Microsoft study found that code review is fundamentally about *understanding*, not defect-spotting. This specialist attacks the understanding gap directly — if you can't justify WHY the code exists and WHY it takes this approach, that's a review finding. The DMAD paper (ICLR 2025) shows this Socratic strategy accesses fundamentally different reasoning than the analytical strategies used by other specialists. Where security traces data flows and performance calculates numbers, this persona questions premises.

**Key behavioral rules to encode**: "For every design decision in the diff, ask: what assumption does this rely on? Is that assumption documented?" "Escalate with NEW challenges each round — never restate a previous objection." "Challenge whether this approach is the right one, not just whether the implementation is correct." "Act as rationale auditor — code that can't justify its existence is a maintenance burden." Each question should force justification.

**Anti-sycophancy calibration**: This specialist should have the **strongest anti-convergence posture** of all personas per the rubric calibration note. The "Peacemaker or Troublemaker" paper (arXiv:2509.23055) found moderate disagreement outperforms maximal disagreement, but the assumptions specialist operates closest to the "troublemaker" end — its entire value proposition IS disagreement. The structural forcing should make it very difficult for this persona to produce an "all clear."

**Example comments should demonstrate**: Questions, not assertions. "What assumption does this retry logic make about idempotency? If the upstream service processes the request but fails to acknowledge it, this will duplicate the operation. Is that acceptable?" Show the Socratic chain: surface observation → probe assumption → expose unstated dependency → assess risk.

### Changes Required

- **`skills/paw-final-review/references/specialists/assumptions.md`**: Create the specialist file following the **SpecialistDesignRubric.md** requirements.

### Success Criteria

#### Automated Verification:
- [ ] `skills/paw-final-review/references/specialists/assumptions.md` exists
- [ ] File contains all required sections per SpecialistDesignRubric.md
- [ ] Lint passes: `npm run lint`

#### Manual Verification (per SpecialistDesignRubric.md Quality Criteria):
- [ ] **Distinctiveness**: Cognitive strategy (Socratic questioning) asks questions rather than making assertions; challenges fundamental premises
- [ ] **Depth**: Behavioral rules specify escalation pattern — each round introduces NEW challenges, not restated objections (per IUI 2024 finding)
- [ ] **Anti-sycophancy**: This persona should have the strongest anti-convergence posture per the rubric calibration note
- [ ] **Grounding**: Questions are anchored in specific code decisions, not abstract philosophy
- [ ] **Complementarity**: Exposes unstated assumptions that domain-focused specialists take for granted

---

## Phase 1d: Edge Cases Specialist

### Objective
Define the edge-cases specialist persona. Cognitive strategy: systematic boundary enumeration.

### Specialist Design Brief

**Identity concept**: Obsessive about what happens at the boundaries. Thinks in failure modes, not happy paths. The value of this persona is *exhaustiveness*, not creativity — they don't have flashes of insight, they systematically work through a checklist of boundary categories that most developers skip. The narrative should encode experiences where "it worked in testing" failed in production because nobody checked the boundary conditions.

**Cognitive strategy — systematic boundary enumeration**: This is a methodical, exhaustive process — not intuitive. For every input, parameter, state, or resource in the diff, enumerate these categories: null/undefined, empty (empty string, empty array, zero), maximum values (integer overflow, string length limits, collection size limits), concurrent access (race conditions, parallel mutations), interrupted operations (partial writes, mid-stream failures), partially failed operations (some items succeed, some fail in a batch), timed out operations, duplicate inputs (idempotency), out-of-order operations (events arriving in unexpected sequence). The strategy accesses categorically different information in the diff than threat modeling or performance estimation — it looks at the *domain* of each variable and asks "what happens at the edges?"

**Why this specialist exists**: Edge cases are the category of bugs most likely to survive code review because they require *systematic* thinking that human reviewers don't naturally do. Humans spot obvious edge cases (null checks) but miss subtle ones (partial failure in batch operations, out-of-order events). The systematic enumeration strategy makes this exhaustive — it's a fundamentally different cognitive mode than the intuitive pattern-matching other specialists use.

**Key behavioral rules to encode**: "For every function parameter, enumerate: what happens with null? empty? maximum? concurrent?" "For every state transition, ask: what if it's interrupted midway? what if it happens twice? what if they happen out of order?" "Present findings as a matrix: [code path] × [boundary category] = [behavior]." The enumeration should be visibly systematic in the output.

**Anti-sycophancy calibration**: Moderate posture. The exhaustive enumeration strategy naturally produces findings — it's hard to check 9 boundary categories against every code path and find nothing. But the mandatory rules ensure findings are real (not "what if null" when the type system prevents null).

**Example comments should demonstrate**: The systematic enumeration in action — "This `processItems(items)` function handles the happy path but I need to check boundaries: (1) null/undefined items → unhandled, will throw; (2) empty array → passes through, returns empty, OK; (3) items.length > 10,000 → no pagination, memory concern; (4) concurrent calls → shared state mutation at line 42, race condition." Show the matrix-style analysis across boundary categories.

### Changes Required

- **`skills/paw-final-review/references/specialists/edge-cases.md`**: Create the specialist file following the **SpecialistDesignRubric.md** requirements.

### Success Criteria

#### Automated Verification:
- [ ] `skills/paw-final-review/references/specialists/edge-cases.md` exists
- [ ] File contains all required sections per SpecialistDesignRubric.md
- [ ] Lint passes: `npm run lint`

#### Manual Verification (per SpecialistDesignRubric.md Quality Criteria):
- [ ] **Distinctiveness**: Cognitive strategy (boundary enumeration) is systematic and exhaustive, not intuitive
- [ ] **Depth**: Behavioral rules enumerate specific boundary categories to check (null, empty, max, concurrent, interrupted, partial failure, timeout, duplicate, out-of-order)
- [ ] **Anti-sycophancy**: Examples show identifying edge cases even in seemingly straightforward code
- [ ] **Grounding**: Example comments reference specific code paths and inputs, not hypothetical scenarios
- [ ] **Complementarity**: Systematic enumeration catches boundaries that intuition-based review misses

---

## Phase 1e: Maintainability Specialist

### Objective
Define the maintainability specialist persona. Cognitive strategy: narrative code walkthrough.

### Specialist Design Brief

**Identity concept**: Thinks about the person reading this code at 2 AM during an incident. Cares about future-you. This is NOT the "soft" persona — it addresses the **single largest category of real review findings**. Mäntylä & Lassenius (IEEE TSE 2009) found that 75% of defects discovered in code review are evolvability defects (readability, structure, documentation), with only 25% being functional bugs. This specialist covers the highest-volume review category. The narrative should encode experiences of maintaining someone else's inscrutable code under pressure.

**Cognitive strategy — narrative code walkthrough**: The persona reads code as a story. "I land on this function — do I understand what it does? Can I trace the flow? Does the test tell me what this is supposed to do?" This is fundamentally different from the analytical strategies of other specialists — it's experiential, not analytical. The persona *imagines being a developer encountering this code for the first time* and evaluates whether the code communicates its intent effectively.

**Why this specialist exists**: The Bacchelli & Bird Microsoft study found that code review is fundamentally about *understanding*. 75% of real review findings are maintainability — the single largest category by far. Yet most AI code review focuses on bugs, security, and performance. This specialist exists to catch the issues that actually dominate real code reviews: unclear naming, confusing control flow, missing context, abstractions that don't earn their complexity, and tests that don't explain what the code is supposed to do.

**Key behavioral rules to encode**: "Read the code as if encountering it for the first time during an incident — do you understand what it does without reading the implementation?" "For every abstraction, ask: does the complexity it introduces justify the flexibility it provides?" "For every function, check: would a new team member understand the contract from the name, signature, and documentation alone?" "Evaluate whether tests serve as documentation — do they explain the intended behavior?"

**Anti-sycophancy calibration**: Per the rubric calibration note, can be **slightly more constructive** than other specialists since its role includes suggesting improvements. But it must still identify real concerns — "this is well-written" is never acceptable as a finding. The persona should suggest better approaches when identifying problems, but never produce empty praise.

**Example comments should demonstrate**: The narrative walkthrough experience — "I'm reading `resolveSpecialistPrecedence` and I can follow the logic, but the variable `merged` doesn't tell me what it contains after this loop. At 2 AM, I'd need to mentally simulate the loop to understand the merge semantics. Consider renaming to `specialistsByPrecedence` or adding a brief comment explaining the merge strategy." Show the journey: encountering code → attempting to understand → identifying the friction point → suggesting improvement.

### Changes Required

- **`skills/paw-final-review/references/specialists/maintainability.md`**: Create the specialist file following the **SpecialistDesignRubric.md** requirements.

### Success Criteria

#### Automated Verification:
- [ ] `skills/paw-final-review/references/specialists/maintainability.md` exists
- [ ] File contains all required sections per SpecialistDesignRubric.md
- [ ] Lint passes: `npm run lint`

#### Manual Verification (per SpecialistDesignRubric.md Quality Criteria):
- [ ] **Distinctiveness**: Cognitive strategy (narrative walkthrough) reads code as a story experienced by a future developer
- [ ] **Depth**: Behavioral rules address naming, structure, documentation, and whether abstractions earn their complexity — the highest-volume review category (75% per Mäntylä & Lassenius)
- [ ] **Anti-sycophancy**: Per rubric calibration note, can be slightly more constructive since role includes suggesting improvements, but must still identify real concerns
- [ ] **Grounding**: Example comments reference specific naming choices, structural decisions, or documentation gaps in code
- [ ] **Complementarity**: Covers readability and future maintenance burden that domain-focused specialists overlook

---

## Phase 1f: Architecture Specialist

### Objective
Define the architecture specialist persona. Cognitive strategy: pattern recognition and structural analysis.

### Specialist Design Brief

**Identity concept**: A very senior engineer who understands how to future-proof code without violating YAGNI. This persona evaluates how new code fits into the *existing* design patterns of the codebase — not just whether the code works, but whether it's structurally coherent with what's already there. The narrative should encode experience recognizing when code that's "functionally correct" creates architectural debt: inconsistent patterns, wrong abstraction levels, coupling that will resist future change.

**Cognitive strategy — pattern recognition and structural analysis**: This persona doesn't review code in isolation — they review it in the context of the codebase's existing conventions, patterns, and architectural decisions. The analytical process: (1) identify patterns used in existing codebase (naming conventions, module boundaries, dependency directions, abstraction levels), (2) evaluate whether new code follows or diverges from those patterns, (3) assess whether divergence is intentional and justified or accidental. The AI Office Architecture paper (arXiv:2601.14351) supports this: agents with different *structural perspectives* catch errors through complementary failure modes (Swiss-cheese model).

**Why this specialist exists**: This was identified as a gap during roster review — the original 5 specialists all evaluated code in isolation. None assessed whether the code *fits* the codebase. An implementation can be secure, performant, well-tested, and readable, but structurally inconsistent with the project's architecture. This creates long-term maintenance burden that no other specialist catches. The persona must balance future-proofing (recognizing where flexibility is genuinely needed) with YAGNI (not over-engineering abstractions that aren't justified by current requirements).

**Key behavioral rules to encode**: "Before evaluating the diff, scan existing code for patterns: how are similar concerns handled elsewhere? What conventions exist?" "When new code diverges from existing patterns, assess: is this an intentional improvement, or an accidental inconsistency?" "Evaluate abstraction levels: is this code at the right level of abstraction for its position in the dependency graph?" "Apply the YAGNI test: does each abstraction serve a current need, or is it speculating about future requirements?" "Assess coupling and cohesion: does this change increase coupling between modules that should be independent?"

**Anti-sycophancy calibration**: Moderate posture. The persona should identify structural concerns but be evidence-based — citing specific existing patterns that the code diverges from, not imposing personal architectural preferences. "This doesn't match the pattern used in X, Y, Z" is grounded; "this should use a factory pattern" without evidence is not.

**Example comments should demonstrate**: Pattern recognition in action — "The existing codebase handles specialist discovery using a precedence chain (see `resolveConfig` at line 42). This new code introduces a different resolution pattern (flat merge) for a conceptually similar problem. This creates two inconsistent approaches to the same problem. Consider aligning with the existing precedence chain pattern to maintain architectural consistency." Show: observe existing pattern → compare new code → assess divergence → recommend alignment (or justify divergence).

### Changes Required

- **`skills/paw-final-review/references/specialists/architecture.md`**: Create the specialist file following the **SpecialistDesignRubric.md** requirements.

### Success Criteria

#### Automated Verification:
- [ ] `skills/paw-final-review/references/specialists/architecture.md` exists
- [ ] File contains all required sections per SpecialistDesignRubric.md
- [ ] Lint passes: `npm run lint`

#### Manual Verification (per SpecialistDesignRubric.md Quality Criteria):
- [ ] **Distinctiveness**: Cognitive strategy (pattern recognition) evaluates structural fit with existing codebase, not just the code in isolation
- [ ] **Depth**: Behavioral rules address convention adherence, abstraction level appropriateness, and extensibility vs YAGNI tradeoffs
- [ ] **Anti-sycophancy**: Examples show identifying architectural mismatches even when code is functionally correct
- [ ] **Grounding**: Example comments reference specific patterns from the codebase and explain why divergence matters
- [ ] **Complementarity**: Covers codebase-level structural concerns that code-focused specialists miss

---

## Phase 1g: Testing Specialist

### Objective
Define the testing specialist persona. Cognitive strategy: coverage gap analysis and test design reasoning.

### Specialist Design Brief

**Identity concept**: An engineer who's seen production incidents caused not by lack of tests, but by *wrong* tests — tests that verified implementation details rather than behavior contracts, tests that all covered the happy path while the failure mode that mattered was untested. This persona doesn't count test cases; they reason about whether the tests actually protect against the regressions that matter. The narrative should encode experiences where "100% code coverage" still led to production failures because the tests were verifying the wrong things.

**Cognitive strategy — coverage gap analysis and test design reasoning**: This is NOT "did they write enough tests." This persona evaluates test *quality* and *strategic coverage*. The analytical process: (1) identify the highest-risk scenarios for the changed code — what would hurt most if it broke? (2) check whether tests cover those scenarios, (3) assess whether tests verify *behavior contracts* (what the code promises) vs *implementation details* (how the code works internally — brittle tests that break on refactor), (4) evaluate whether the code is *structured* to be testable (dependency injection, pure functions, clear boundaries). This is a fundamentally different cognitive mode than reading the implementation code itself.

**Why this specialist exists**: This was identified as the biggest gap during roster completeness review. All 6 other specialists evaluate the implementation code — none evaluate whether the tests actually protect the implementation. Tests are the safety net that makes all other review findings actionable (a security fix without tests can regress silently). The testing specialist catches gaps that other specialists assume are covered: "the security specialist found a vulnerability, but is there a test ensuring the fix stays fixed?"

**Key behavioral rules to encode**: "Identify the 3 highest-risk scenarios for this change. For each, verify a test exists that would catch regression." "Distinguish behavior-verifying tests (test the contract/interface) from implementation-verifying tests (test internal details — these break on refactor and provide false security)." "Assess testability: are there hidden dependencies, global state, or tight coupling that make this code hard to test correctly?" "When tests exist and pass, ask: would this test fail if the bug it's supposed to prevent were reintroduced?" "Prioritize: test the scenario most likely to break in production, not the scenario easiest to test."

**Anti-sycophancy calibration**: Moderate posture. Tests existing and passing is not sufficient — this persona must dig into whether they're the *right* tests. "Tests pass" is never an acceptable finding. But findings should be prioritized by risk — don't flag missing tests for trivial getters.

**Example comments should demonstrate**: Test design reasoning — "This `retryWithBackoff` function has 3 tests, all verifying successful retry. But the highest-risk scenario — what happens when all retries are exhausted AND the cleanup handler throws — has no test. This is the scenario most likely to cause a production incident because it's the double-failure case. Additionally, the tests verify internal delay timing (implementation detail) rather than the contract (eventual success or clean failure). Consider testing the behavior contract: given transient failures, does the function eventually succeed? Given persistent failure, does it fail cleanly?" Show: identify high-risk scenario → check test coverage → assess test quality → recommend improvement.

### Changes Required

- **`skills/paw-final-review/references/specialists/testing.md`**: Create the specialist file following the **SpecialistDesignRubric.md** requirements.

### Success Criteria

#### Automated Verification:
- [ ] `skills/paw-final-review/references/specialists/testing.md` exists
- [ ] File contains all required sections per SpecialistDesignRubric.md
- [ ] Lint passes: `npm run lint`

#### Manual Verification (per SpecialistDesignRubric.md Quality Criteria):
- [ ] **Distinctiveness**: Cognitive strategy (coverage gap analysis) reasons about what tests *should* exist, not just whether code is correct
- [ ] **Depth**: Behavioral rules distinguish behavior-verifying tests from implementation-verifying tests; identify the highest-risk untested scenario
- [ ] **Anti-sycophancy**: Examples show identifying testing gaps even when tests exist and pass
- [ ] **Grounding**: Example comments reference specific functions/scenarios and explain what test coverage is missing and why it matters
- [ ] **Complementarity**: Covers test quality and testability concerns that code-focused specialists overlook

---

## Phase 2: Parallel Society-of-Thought Mode

### Objective
Extend paw-final-review SKILL.md to support `society-of-thought` as a third review mode with specialist discovery at 4 precedence levels, parallel execution, and REVIEW-SYNTHESIS.md synthesis with confidence weighting and grounding validation. This is the core execution path — debate, adaptive selection, and interactive moderator are added in subsequent phases.

### Design Decision: Specialist Storage
Built-in specialists are stored as separate markdown files in `skills/paw-final-review/references/specialists/` following the [Agent Skills specification](https://agentskills.io/specification#optional-directories) `references/` directory pattern. This keeps the format consistent across all precedence levels (project, user, built-in all use the same file format), makes specialists discoverable and editable, loads them on demand (not with every SKILL.md load), and aligns with the custom instructions precedence pattern from PR #113.

### Design Decision: Synthesis Protocol
The synthesis agent is the most critical component of society-of-thought — it determines whether the multi-agent approach produces better results than a single reviewer. The synthesis protocol is defined in **SynthesisProtocol.md** as a **design-time reference** — it informs the synthesis instructions written into SKILL.md but is NOT loaded at runtime. The implementing agent should embed the key requirements (conflict classification, grounding validation, trade-off handling, proportional output) directly into SKILL.md's synthesis section. SynthesisProtocol.md remains as design documentation alongside SpecialistDesignRubric.md.

### Design Decision: Shared Rules Reference File
Multi-model review identified that ~30% of each specialist file is identical boilerplate (anti-sycophancy rules, confidence scoring, Toulmin output format). Loading 7 complete files duplicates ~14,700 tokens per review run. Instead of stripping specialist files into incomplete fragments or duplicating content in SKILL.md, Phase 2 uses a **shared rules reference file**:

1. **Shared rules file** (`references/specialists/_shared-rules.md`): Contains Anti-Sycophancy Rules, Confidence Scoring instructions, and Required Output Format (Toulmin template). Defined once, loaded once by the orchestrator per review run.
2. **Specialist-specific content** (from each specialist `.md` file): Identity/backstory, cognitive strategy, domain boundary, behavioral rules, demand rationale, example comments — everything unique to that persona. Each specialist file references `_shared-rules.md` for shared sections rather than duplicating them.
3. **Review context** (injected per-run): The diff, spec, plan, CodeResearch patterns.

During Phase 2 implementation, the shared sections (Anti-Sycophancy Rules, Confidence Scoring, Required Output Format) are extracted from the 7 built-in specialist files into `_shared-rules.md`. Each specialist file replaces those sections with a reference: `See _shared-rules.md for Anti-Sycophancy Rules, Confidence Scoring, and Required Output Format.` The orchestrator loads `_shared-rules.md` once and composes: shared rules + specialist content + review context for each subagent.

**Benefits**: Specialist files remain coherent documents (they explicitly reference where shared rules live, rather than silently depending on injection). Shared rules are maintained in one place, not seven. Custom specialists at project/user levels remain standalone (include their own shared sections) for portability — the orchestrator detects whether a specialist file already contains shared sections and skips injection if so.

**Token savings**: ~2,100 tokens × 6 duplicates eliminated = ~12,600 tokens per review run.

### Changes Required

- **`skills/paw-final-review/SKILL.md`**: Core extension with the following new/modified sections:

  - **Step 1 (Configuration)**: Extend to read new fields when mode is `society-of-thought`:
    - `Final Review Specialists`: fixed list (comma-separated names) or `adaptive:<N>` — defaults to `all` (all discovered specialists)
    - `Final Review Interaction Mode`: `parallel` | `debate` — defaults to `parallel`
    - `Final Review Interactive`: reused for moderator mode behavior (existing field)

  - **New section: Specialist Discovery**: Define 4-level precedence discovery algorithm:
    1. Workflow: Parse `Final Review Specialists` from WorkflowContext.md — if explicit list, use only those names
    2. Project: Scan `.paw/personas/<name>.md` files
    3. User: Scan `~/.paw/personas/<name>.md` files
    4. Built-in: Scan `skills/paw-final-review/references/specialists/<name>.md` files
    - Most-specific-wins for name conflicts (same filename at project overrides user overrides built-in)
    - If `Final Review Specialists` is `all`: include all discovered specialists from all levels
    - If fixed list: resolve each name against discovered specialists at all levels (most-specific-wins)
    - Skip malformed/empty specialist files with warning; continue with remaining roster
    - If no specialists found at any level, fall back to built-in defaults (guard against misconfiguration)

  - **Step 4 (Execute Review)**: Add society-of-thought parallel execution alongside existing single-model/multi-model:
    - **Prompt composition** (shared rules reference architecture):
      1. Load shared rules from `references/specialists/_shared-rules.md` (anti-sycophancy, confidence scoring, Toulmin format) — loaded once per review run
      2. Load specialist-specific content from discovered `.md` file (identity, strategy, rules, examples)
      3. Compose prompt = shared rules + specialist content + review context (diff, spec, plan, CodeResearch)
      4. If specialist file already contains shared sections (custom specialist), skip shared rules injection to avoid duplication
    - **Extract shared sections into `_shared-rules.md`**: Move Anti-Sycophancy Rules, Confidence Scoring, and Required Output Format from the 7 built-in specialist files into `references/specialists/_shared-rules.md`. Replace those sections in each specialist file with a reference to `_shared-rules.md`.
    - Spawn parallel subagents using `task` tool with `agent_type: "general-purpose"`. If specialist file contains a `model:` field, use that model; otherwise use session default
    - **File-based handoff**: Each specialist subagent writes its Toulmin-structured findings directly to `REVIEW-{SPECIALIST-NAME}.md` in the reviews directory. The orchestrating agent receives only a brief completion status (success/failure, finding count) — NOT the full findings content. This keeps specialist output out of the orchestrator's context window.
    - After all specialists complete, spawn the synthesis subagent which reads specialist files directly via `view` tool and produces `REVIEW-SYNTHESIS.md`. The orchestrator sees only the final synthesis output, not the raw specialist findings.
    - **Context budget**: The orchestrator's role is dispatch and status tracking, not content relay. Specialist persona content (potentially 7 × 2000+ words) stays in specialist subagent contexts.
    - **Large diff handling**: If the diff exceeds a size that would crowd out the specialist persona and review context, the orchestrator should chunk the diff by file or logical grouping and note the chunking in the specialist prompt. Each specialist receives the same chunk set for consistency.

  - **New section: Synthesis (society-of-thought)**: Implement the parallel-mode synthesis protocol from SynthesisProtocol.md. Key responsibilities:
    - **Conflict classification**: For each disagreement between specialists, classify as factual dispute (one is wrong — resolve with evidence) or genuine trade-off (both valid — escalate or flag)
    - **Evidence-based adjudication**: Examine reasoning traces, not just conclusions. Assess evidence specificity, code reference precision, and confidence calibration quality
    - **Confidence-weighted aggregation**: Weigh findings by stated confidence AND evidence quality, not count of specialists
    - **Grounding validation**: Verify each finding references code present in the actual diff; demote (not binary exclude) ungrounded findings with explanation
    - **Trade-off detection**: When conflict is a genuine design trade-off (security vs performance, simplicity vs extensibility), flag explicitly with both sides' evidence and rationale
    - **Trade-off handling**: In interactive/smart mode, escalate trade-offs to user for decision. In auto mode, apply conservative defaults per SynthesisProtocol.md hierarchy and flag the decision for user awareness
    - **Severity classification**: must-fix, should-fix, consider (consistent with existing review format)
    - **Specialist attribution**: each finding attributed to originating specialist(s), including dissenting views

  - **REVIEW-SYNTHESIS.md structure**: Define the artifact format including:
    - Header: review mode, specialists participated, selection rationale (if adaptive)
    - Findings: grouped by severity, each with specialist attribution, confidence, evidence, grounding status
    - Trade-offs: explicit section for unresolved trade-offs with both sides' arguments
    - Dissent log: findings where specialists disagreed and how the disagreement was resolved

  - **Step 5 (Resolution)**: Extend for society-of-thought:
    - `interactive: false` → auto-apply must-fix and should-fix, skip consider (same as existing)
    - `interactive: true` → present findings from REVIEW-SYNTHESIS.md using existing finding presentation format; present trade-offs for user decision
    - `interactive: smart` → auto-apply high-confidence consensus must-fix/should-fix, interactive for contested findings and all trade-offs
    - Note: Interactive moderator mode (summon/challenge) added in Phase 5

  - **Review Artifacts table**: Add society-of-thought row: `REVIEW-{SPECIALIST}.md` per specialist + `REVIEW-SYNTHESIS.md`
    - Note: FR-019 (gitignore review artifacts) is satisfied by existing `.gitignore` with `*` pattern in `reviews/` — no new work needed

  - **VS Code handling**: If mode is `society-of-thought` in VS Code, disable society-of-thought and fall back to `multi-model` (or `single-model` if multi-model also unavailable) with notification directing users to issue #240 (VS Code chatSkills migration needed for `references/` directory access)

- **`cli/scripts/build-dist.js`**: Update build script to copy `references/` subdirectories (not just SKILL.md) when building the CLI distribution. Currently `build-dist.js` only copies SKILL.md files — specialist files in `references/specialists/` won't reach npm users without this fix.

- **Verification**:
  - Lint: `./scripts/lint-prompting.sh skills/paw-final-review/SKILL.md`
  - Lint: `npm run lint`
  - Integration test: Specialist precedence — fixture with `.paw/personas/` override, assert project-level overrides built-in for same name
  - Integration test: Parallel society-of-thought execution — verify specialist subagents spawn and REVIEW-SYNTHESIS.md is produced with expected structure
  - Integration test: Anti-sycophancy — trivially-correct diff, use Judge rubric to verify specialist provides examination rationale (not fabricated findings)

### Success Criteria

#### Automated Verification:
- [ ] Lint passes: `./scripts/lint-prompting.sh skills/paw-final-review/SKILL.md`
- [ ] Lint passes: `npm run lint`
- [ ] `build-dist.js` copies `references/` subdirectories for skills that have them
- [ ] Integration tests pass: specialist precedence, parallel execution, anti-sycophancy

#### Manual Verification:
- [ ] SKILL.md contains society-of-thought execution path for parallel mode
- [ ] SKILL.md defines shared rules loading from `_shared-rules.md`, loaded once per review run and composed with each specialist prompt
- [ ] Built-in specialist files reference `_shared-rules.md` for shared sections (anti-sycophancy, confidence scoring, output format) instead of duplicating them
- [ ] `_shared-rules.md` exists in `references/specialists/` containing the extracted shared sections
- [ ] Custom specialist detection: discovery code skips preamble injection when specialist file already contains shared sections
- [ ] Specialist discovery covers all 4 precedence levels with clear override semantics and edge cases (malformed files, no specialists found)
- [ ] REVIEW-SYNTHESIS.md format includes: specialist attribution, confidence levels per finding, severity classifications, grounding validation status, trade-off section, dissent log
- [ ] Synthesis instructions implement SynthesisProtocol.md: conflict classification, evidence-based adjudication, trade-off detection and handling (interactive escalation + auto conservative defaults)
- [ ] VS Code fallback disables society-of-thought with notification referencing issue #240

---

## Phase 3: Debate Mode

### Objective
Add debate interaction mode with thread-based structure, per-thread continuation for contentious items, and trade-off escalation to users in interactive mode.

### Design Decision: Thread-Based Debate Architecture
Debates are structured as **threaded conversations**, not flat rounds. Each finding from Round 1 becomes a thread. Subsequent rounds add responses to existing threads and may spawn new threads. This produces a readable audit trail and enables per-thread continuation for contentious items while resolved threads close early.

### Changes Required

- **`skills/paw-final-review/SKILL.md`**: Add debate mode capability:

  - **Debate mode execution** (when `Final Review Interaction Mode: debate`):

    - **Round 1 (Global sweep)**: Run all selected specialists in parallel (reuse Phase 2 parallel execution). Each finding becomes a **thread** in the debate.

    - **Round 2-3 (Global sweep with thread context)**: Synthesis agent (operating as "PR triage lead" per SynthesisProtocol.md) generates a round summary organized by thread — for each thread: current state (agreed, contested, new information), summary of positions, open questions. This summary is the only inter-specialist communication (hub-and-spoke). Specialists receive the thread summary alongside the original diff and can: refine their position on existing threads, respond to summarized counterarguments, add new threads.

    - **Adaptive termination of global rounds**: After each round, synthesis agent evaluates whether new substantive findings emerged across all threads. If no new threads and no position changes on existing threads, global rounds terminate early. Hard cap at 3 global rounds.

    - **Per-thread continuation** (for contested threads): After global rounds close, threads still marked "contested" enter targeted continuation:
      - Only the specialists involved in the contested thread participate (2-3 specialists, not all 7)
      - Max 2 additional exchanges per thread (total cap: 5 exchanges including global rounds)
      - **Aggregate budget**: Max 30 subagent calls across all continuation threads (prevents pathological case of many contested threads each consuming full per-thread budget)
      - Synthesis agent monitors each thread for convergence, deadlock, or trade-off identification
      - **Trade-off detection**: If a contested thread represents a genuine design trade-off (not a factual dispute), it's classified as a trade-off and exits continuation — flagged for user decision (interactive) or conservative default resolution (auto)

    - **Thread states**: Each thread progresses through: `open` → `agreed` | `contested` | `trade-off` | `resolved`

  - **User escalation in interactive mode**: During debate, when the synthesis agent identifies a trade-off thread:
    - In `interactive: true` or `interactive: smart`: Pause debate, present the trade-off to the user with both sides' evidence and positions, ask for a decision, then continue debate with the user's decision as context
    - In `interactive: false` (auto): Apply conservative defaults per SynthesisProtocol.md, flag the decision in REVIEW-SYNTHESIS.md

  - **REVIEW-SYNTHESIS.md debate trace section**: When debate mode was used, include:
    - Thread-by-thread progression: initial finding → responses → resolution
    - Thread state at completion (agreed/resolved/trade-off)
    - Disagreements identified and how they were resolved (evidence, user decision, or conservative default)
    - Trade-offs and their resolution (user decision or auto-applied default)
    - Per-thread participant list (which specialists engaged on each thread)

  - **Final synthesis**: Produce REVIEW-SYNTHESIS.md by merging all threads' resolved state, applying same synthesis protocol as parallel mode but with richer evidence from debate exchanges

- **Verification**:
  - Lint: `./scripts/lint-prompting.sh skills/paw-final-review/SKILL.md`
  - Lint: `npm run lint`
  - Integration test: Debate budget cap — verify debate terminates when subagent call count approaches aggregate budget limit
  - Integration test: Debate thread convergence — verify threads that reach agreement close early

### Success Criteria

#### Automated Verification:
- [ ] Lint passes: `./scripts/lint-prompting.sh skills/paw-final-review/SKILL.md`
- [ ] Integration tests pass: debate budget cap, thread convergence

#### Manual Verification:
- [ ] Debate mode uses thread-based structure: findings are threads with point/counterpoint/response
- [ ] Hub-and-spoke maintained: specialists see thread summaries, not each other's raw findings
- [ ] Per-thread continuation described: contested threads get up to 2 additional exchanges between relevant specialists only
- [ ] Trade-off detection triggers thread exit to user escalation (interactive) or conservative default (auto)
- [ ] User escalation described: debate pauses to present trade-off with both sides' evidence
- [ ] REVIEW-SYNTHESIS.md debate trace shows thread-level progression and resolution
- [ ] Thread states defined: open → agreed | contested | trade-off | resolved
- [ ] Edge cases covered: debate with 1 specialist (skip debate, use parallel), all threads agree in round 1 (terminate early)

---

## Phase 4: Adaptive Specialist Selection

### Objective
Add adaptive specialist selection mode (`adaptive:<N>`) that analyzes the diff to select the most relevant specialists. This is orthogonal to interaction mode — both parallel and debate can use adaptive selection.

### Changes Required

- **`skills/paw-final-review/SKILL.md`**: Add adaptive selection capability:

  - **Adaptive selection** (when `Final Review Specialists: adaptive:<N>`):
    - After discovering all available specialists (Phase 2 discovery algorithm), agent analyzes the diff content
    - Agent selects up to N specialists most relevant to the changes
    - Selection rationale documented in REVIEW-SYNTHESIS.md header ("Selected specialists: X, Y, Z because the diff primarily affects [areas]")
    - No user confirmation required (auto-selects silently per spec)
    - Works with both parallel and debate interaction modes
    - Edge case: If diff is too small/trivial for meaningful selection, report and suggest single-model mode
    - Edge case: If N ≥ number of available specialists, include all (equivalent to `all`)

- **Verification**:
  - Lint: `./scripts/lint-prompting.sh skills/paw-final-review/SKILL.md`
  - Lint: `npm run lint`
  - Integration test: Adaptive selection — verify specialist subset is selected and selection rationale appears in REVIEW-SYNTHESIS.md header

### Success Criteria

#### Automated Verification:
- [ ] Lint passes: `./scripts/lint-prompting.sh skills/paw-final-review/SKILL.md`
- [ ] Integration test passes: adaptive selection with rationale

#### Manual Verification:
- [ ] Adaptive selection instructions describe diff analysis approach and rationale documentation
- [ ] Selection rationale is documented in REVIEW-SYNTHESIS.md header
- [ ] Works with both parallel and debate modes
- [ ] Edge cases covered: trivial diff (suggest single-model), N ≥ available (use all), adaptive selects 0 (suggest single-model)

---

## Phase 5: Interactive Moderator Mode

### Objective
Add post-review interactive moderator mode where users can summon specialists, challenge findings, and request deeper analysis. Specialists maintain their persona when responding.

### Changes Required

- **`skills/paw-final-review/SKILL.md`**: Extend the Resolution section:

  - **Moderator mode activation**: After initial finding resolution completes (the existing Step 5 flow from Phase 2 — auto-apply/present/smart), if `Final Review Interactive` is `true` or (`smart` and significant findings exist):
    - Moderator mode *extends* existing interactive resolution — it does not replace it
    - Sequence: findings resolution → moderator loop → exit to paw-pr

  - **Moderator hooks** (3 interaction patterns):
    1. **Summon specialist**: User references a specialist by name for follow-up (e.g., "What does the security specialist think about the auth flow?"). The specialist's persona file is loaded and the specialist responds in-character using its cognitive strategy, with access to the full diff and REVIEW-SYNTHESIS.md context.
    2. **Challenge finding**: User disagrees with a specific finding and provides reasoning. The originating specialist must respond with independent evidence (not just agree), maintaining anti-sycophancy behavioral rules.
    3. **Request deeper analysis**: User asks for more detailed analysis on a specific code area. The most relevant specialist (or user-specified specialist) provides focused analysis using its cognitive strategy.

  - **Moderator exit**: User says "done", "continue", or "proceed" to exit moderator mode and continue to paw-pr

  - **Specialist persona maintenance**: When responding in moderator mode, each specialist's full persona file is included in the prompt to maintain character consistency

- **Verification**:
  - Lint: `./scripts/lint-prompting.sh skills/paw-final-review/SKILL.md`
  - Lint: `npm run lint`

### Success Criteria

#### Automated Verification:
- [ ] Lint passes: `./scripts/lint-prompting.sh skills/paw-final-review/SKILL.md`

#### Manual Verification:
- [ ] Moderator mode entry/exit conditions clearly defined
- [ ] Three interaction patterns described with examples: summon by name, challenge with reasoning, request deeper analysis
- [ ] Anti-sycophancy maintained during challenges (specialist must provide independent evidence)
- [ ] Specialist persona loading described for maintaining character consistency

---

## Phase 6: Configuration & Status

### Objective
Extend paw-init to collect society-of-thought configuration during workflow setup and paw-status to display it. Also update the paw-specification.md to reference the new review mode.

### Changes Required

- **`skills/paw-init/SKILL.md`**:
  - Add new input parameters to the parameters table:
    - `final_review_specialists` | No | `all` | `all`, comma-separated names, or `adaptive:<N>` (e.g., `adaptive:3`)
    - `final_review_interaction_mode` | No | `parallel` | `parallel`, `debate`
  - Update `Final Review Mode` valid values: `single-model`, `multi-model`, `society-of-thought`
  - Add conditional display: society-of-thought fields only shown/relevant when `final_review_mode` is `society-of-thought`
  - Add new fields to WorkflowContext.md template:
    - `Final Review Specialists: <final_review_specialists>`
    - `Final Review Interaction Mode: <final_review_interaction_mode>`
  - Update configuration validation: if `final_review_mode` is `society-of-thought`, validate specialist and interaction mode values
  - Lint: `./scripts/lint-prompting.sh skills/paw-init/SKILL.md`

- **`skills/paw-status/SKILL.md`**:
  - Update Configuration Detection section to read:
    - `Final Review Mode: single-model | multi-model | society-of-thought`
    - `Final Review Specialists: all | adaptive:<N> | <comma-separated list>` (when society-of-thought)
    - `Final Review Interaction Mode: parallel | debate` (when society-of-thought)
  - Update Status Dashboard to display society-of-thought config when active
  - Lint: `./scripts/lint-prompting.sh skills/paw-status/SKILL.md`

- **`paw-specification.md`**:
  - Add `society-of-thought` to the Final Review Mode options in the specification document
  - Document the new configuration fields and their behavior
  - Reference specialist precedence levels

- **Verification**:
  - Lint: `npm run lint:skills`

### Success Criteria

#### Automated Verification:
- [ ] Lint passes: `npm run lint:skills`
- [ ] paw-init SKILL.md contains society-of-thought parameters and WorkflowContext.md template fields
- [ ] paw-status SKILL.md references society-of-thought configuration fields

#### Manual Verification:
- [ ] paw-init parameter defaults are sensible (specialists: `all`, interaction mode: `parallel`)
- [ ] Configuration validation catches invalid society-of-thought field values
- [ ] paw-status would display society-of-thought config clearly when active

---

## Phase 7: Documentation

### Objective
Create user-facing documentation explaining society-of-thought review, custom specialist creation, and persona template guidance. Update project documentation to reference the new feature.

### Changes Required

- **`.paw/work/society-of-thought-final-review/Docs.md`**: Technical reference (load `paw-docs-guidance`)
  - Implementation details, architecture decisions, verification approach
  - Research sources summary (reference ResearchSources.md)

- **`docs/guide/society-of-thought-review.md`**: User guide
  - What is society-of-thought review and why use it
  - Configuration options (mode, specialists, interaction mode, interactive)
  - Built-in specialist roster overview
  - How to create custom specialists (with persona template scaffold)
  - Parallel vs debate modes explained
  - Interactive moderator mode usage
  - Tips for effective custom personas (informed by research: narrative backstories, distinct cognitive strategies, anti-sycophancy rules)

- **`docs/reference/artifacts.md`**: Add REVIEW-SYNTHESIS.md to the implementation workflow artifacts table

- **`mkdocs.yml`**: Add `society-of-thought-review.md` to the Guide navigation section

- **Verification**:
  - Docs build: `source .venv/bin/activate && mkdocs build --strict`
  - Content accurate and style consistent with existing docs

### Success Criteria

#### Automated Verification:
- [ ] Docs build: `source .venv/bin/activate && mkdocs build --strict`
- [ ] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] User guide explains the feature clearly for someone who hasn't read the spec
- [ ] Custom specialist creation guide includes persona template scaffold with examples
- [ ] Artifacts reference updated with REVIEW-SYNTHESIS.md
- [ ] Navigation updated in mkdocs.yml

---

## Phase 9: Specialist Model Assignment

### Objective

Add a `Final Review Specialist Models` config field to WorkflowContext that allows workflow-level model assignment for society-of-thought specialists. Supports three usage patterns: model pool (round-robin distribution), explicit pinning (specialist:model pairs), and mixed (some pinned, rest pooled). This replaces the current approach where model assignment is only possible via YAML frontmatter in custom specialist files.

### Design

**New WorkflowContext field**: `Final Review Specialist Models`

**Syntax** (single field, three patterns):
- **Pool**: `gpt-5.3-codex, claude-opus-4.6, gemini-3-pro-preview` — models distributed across specialists round-robin
- **Pinning**: `security:claude-opus-4.6, architecture:gpt-5.3-codex` — explicit specialist→model mapping
- **Mixed**: `security:claude-opus-4.6, gpt-5.3-codex, gemini-3-pro-preview` — pinned specialists get their model, unpinned draw from remaining pool round-robin
- **Default**: `none` — all specialists use session default (current behavior)

**Model resolution precedence** (most-specific-wins):
1. Specialist file YAML frontmatter `model:` field (custom specialist explicitly chose a model — highest priority)
2. WorkflowContext pinning (e.g., `security:claude-opus-4.6`)
3. WorkflowContext pool (round-robin across unpinned specialists)
4. Session default (fallback)

**Round-robin semantics**: Specialists sorted alphabetically by name, then assigned models from the pool list cyclically. Deterministic — same config always produces same assignment. The assignment is logged at review start so users can verify.

### Changes Required

- **`skills/paw-init/SKILL.md`**:
  - Add `final_review_specialist_models` to parameter table (default: `none`, valid values: `none`, comma-separated model names/intents, or `specialist:model` pairs)
  - Update Society-of-Thought Configuration section: remove "final_review_models is ignored" note, add validation rules for the new field (parse `name:model` pairs, validate model intents via existing resolution logic)
  - Add `Final Review Specialist Models: <final_review_specialist_models>` to WorkflowContext.md template (after `Final Review Interaction Mode`)

- **`skills/paw-final-review/SKILL.md`**:
  - Update Step 1 (Read Configuration) to parse `Final Review Specialist Models` from WorkflowContext.md
  - Update Execution section (line ~199): replace the single-line `model:` frontmatter check with the full resolution precedence chain (frontmatter → pinning → pool → session default)
  - Add a brief "Model Assignment" subsection under Execution documenting the resolution precedence and round-robin semantics
  - Log the specialist→model assignment map at review start

- **`skills/paw-status/SKILL.md`**:
  - Add `Final Review Specialist Models` to the WorkflowContext fields list (line ~52 area, after `Final Review Interaction Mode`)

- **`docs/guide/society-of-thought-review.md`**:
  - Expand the "Per-Specialist Model Assignment" section (line ~195): add WorkflowContext-level assignment alongside the existing frontmatter approach, document all three patterns (pool, pinning, mixed), note the resolution precedence
  - Update the Configuration table (line ~15) to include the new field

### Success Criteria

#### Automated Verification:
- [ ] Lint passes: `npm run lint`
- [ ] Agent lint passes: `npm run lint:agent:all`
- [ ] Docs build: `source .venv/bin/activate && mkdocs build --strict`

#### Manual Verification:
- [ ] WorkflowContext.md template includes `Final Review Specialist Models` field
- [ ] paw-init validates pool, pinning, and mixed syntax
- [ ] paw-final-review resolves models with correct precedence (frontmatter > pinning > pool > default)
- [ ] paw-status displays the new field
- [ ] User guide documents all three patterns with examples

---

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/201
- Spec: `.paw/work/society-of-thought-final-review/Spec.md`
- Research: `.paw/work/society-of-thought-final-review/SpecResearch.md`, `.paw/work/society-of-thought-final-review/CodeResearch.md`
- Synthesis Research: `.paw/work/society-of-thought-final-review/research/claude-research-synthesis.md`, `.paw/work/society-of-thought-final-review/research/gpt-research-synthesis.md`
- Design References: `.paw/work/society-of-thought-final-review/SpecialistDesignRubric.md`, `.paw/work/society-of-thought-final-review/SynthesisProtocol.md`
- Work Shaping: `.paw/work/society-of-thought-final-review/WorkShaping.md`
- Research Sources: `.paw/work/society-of-thought-final-review/ResearchSources.md`
