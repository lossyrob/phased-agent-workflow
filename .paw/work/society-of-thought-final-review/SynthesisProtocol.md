# Synthesis Protocol

This document defines how the synthesis agent merges findings from multiple specialist reviewers into a single REVIEW-SYNTHESIS.md. It is the companion to SpecialistDesignRubric.md — the rubric defines how specialists produce findings, this protocol defines how findings are merged, conflicts are resolved, and trade-offs are handled.

## Why This Matters

The synthesis step determines whether multi-agent review produces better results than a single reviewer. Research shows that naive aggregation (majority voting, single-pass merging) fails in specific, documented ways: correlated biases produce "confabulation consensus" (AgentAuditor 2025), position bias causes >30% degradation for middle-context information (Liu et al., TACL 2024), and sycophantic conformity drives agents toward agreement regardless of evidence (Wynn et al. 2025). This protocol addresses each failure mode with structural constraints.

---

## Synthesis Agent Identity

The synthesis agent operates as a **"PR triage lead"** — a functional role with explicit structural constraints. This is NOT a neutral, persona-less agent (research shows true neutrality is unachievable in LLMs), nor a specialist with domain biases. The functional role provides task framing: "You are performing final merge triage on findings from multiple code reviewers."

### Structural Constraints

The synthesis agent:
- **May only** merge, deduplicate, classify conflicts, request verification, and flag trade-offs
- **Must NOT** generate new findings — it is not an eighth reviewer
- **Must** link every output claim to a specific specialist finding with evidence
- **Must** randomize specialist input ordering to prevent position bias
- **Must** apply the configured priority hierarchy transparently when resolving trade-offs

---

## Specialist Output Contract

Every specialist must emit findings in Toulmin-structured format. This makes disagreements diagnosable — the synthesis agent can identify whether specialists disagree on observed data, inference rules, or exception conditions.

### Required Finding Structure

```
### Finding: [one-sentence claim]

**Severity**: must-fix | should-fix | consider
**Confidence**: HIGH | MEDIUM | LOW
**Category**: [specialist name]

#### Grounds (Evidence)
[Diff-anchored evidence: file, line numbers, quoted code snippets]

#### Warrant (Rule)
[The rule connecting evidence to conclusion — why does this evidence support this claim?]

#### Rebuttal Conditions
[What would falsify this finding? Under what conditions is this NOT a concern?]

#### Suggested Verification
[How could this finding be verified? Static check, test, runtime assertion?]
```

This operationalizes Toulmin argumentation (Verheij 2009, ASPIC+ framework) for machine-adjudicated code review. The Rebuttal Conditions field is critical — it gives the synthesis agent a concrete way to check whether a finding's exceptions apply, and it forces specialists to reason about when they might be wrong.

---

## Synthesis Requirements

The synthesis agent must achieve these outcomes when merging specialist findings. The specific approach is left to agent judgment, but every requirement must be met. Each requirement addresses a documented failure mode from multi-agent aggregation research.

### Cluster by code location before merging

Group findings by shared code anchors (file + line range) and topic area across specialists. Process each cluster independently before cross-cluster integration. This prevents the "Lost in the Middle" problem (Liu et al., TACL 2024) — processing 7 sequential reviews degrades >30% for middle-context info; topic clustering mitigates this.

### Classify every inter-specialist disagreement

When specialists disagree, classify as one of:
- **Factual dispute** (same premise, contradictory claims): One is wrong. Check rebuttal conditions against the diff — if either specialist's rebuttal holds, that finding is resolved. Otherwise assess evidence specificity (prefer diff-anchored over inferential).
- **Trade-off** (different quality objectives, both valid): Both are right. Escalate to user (interactive/smart mode) or apply priority hierarchy (auto mode) with transparent documentation.

**Heuristic**: If specialists cite different objective functions (different quality attributes), it's likely a trade-off. If they disagree about a shared premise (same property of code), it's likely a factual dispute.

### Validate grounding for every finding

Classify each finding into one of three tiers:

| Tier | Criteria | Treatment |
|------|----------|-----------|
| **Direct** | Cites specific lines/functions visible in the diff | Full inclusion, high confidence |
| **Inferential** | Requires reasoning about code behavior but anchored in diff elements | Include with reasoning chain shown |
| **Contextual** | Requires knowledge beyond the diff | Demote to "observations" with caveat |

Findings that reference code NOT in the diff (phantom line numbers, nonexistent functions) are excluded with explanation in the synthesis trace.

### Prevent position and identity bias

Strip specialist identity labels during internal processing — work with the evidence, not the source. Randomize processing order of specialist inputs. Re-attach attribution only in the final output.

### Merge agreements, preserve dissent

When multiple specialists flag the same concern with compatible claims, merge into a single finding with combined evidence, increased confidence, and full attribution. When disagreements remain unresolved, include both positions with an "unresolved" flag rather than silently dropping the minority view.

### Produce proportional output

Verbose specialists must not dominate the output. Weight findings by evidence quality and confidence, not by word count or finding count.

### Handle trade-offs with structured escalation

In interactive/smart mode, present trade-offs to the user with: shared facts (diff-anchored), decision axis (which quality attributes conflict), options with consequences, and recommendation per priority hierarchy. In auto mode, apply priority hierarchy, document the decision, and flag it prominently.

### Output quality checks

Before emitting REVIEW-SYNTHESIS.md, verify:
- Completeness: All non-excluded findings included
- Evidence quality: Evidence chains clear and traceable
- Actionability: Each finding has concrete suggested verification
- Balance: Specialist perspectives represented proportionally

**Design note**: Earlier iterations specified a rigid 7-phase pipeline. This was restructured as required outcomes because PAW's own principles favor end-state descriptions — and synthesis benefits from agent judgment about how to achieve these outcomes in different contexts.

---

## Trade-off Priority Hierarchy

The default priority hierarchy for auto-mode trade-off resolution:

```
Correctness > Security > Reliability > Performance > Maintainability > Developer Experience
```

This hierarchy is:
- **Configurable** at project level (`.paw/config.md` or similar) or workflow level (WorkflowContext.md)
- **Transparent** — when applied, the synthesis agent documents which rule was used and what alternative was foregone
- **Defensible** — grounded in security engineering principles (fail-safe defaults, least privilege) and risk management frameworks (NIST RMF)

When the hierarchy is insufficient (e.g., both options degrade security in different ways), the trade-off is escalated to the user in interactive/smart mode or flagged as "requires human judgment" in auto mode.

---

## Debate-Specific Synthesis

When debate mode is used, the synthesis agent has additional responsibilities during debate rounds (see Phase 3 of ImplementationPlan.md for the full debate protocol):

### Inter-Round Summary Generation

After each debate round, the synthesis agent generates a thread-level summary:
- **Anonymized**: Specialist identities are replaced with "Reviewer A, B, C..." to prevent sycophantic conformity (Wynn et al. 2025: reduced identity bias from 0.608 to 0.024)
- **Thread-structured**: Each finding thread shows: current state (agreed/contested/new info), summary of positions, open questions
- This summary is the ONLY information specialists see from other reviewers (hub-and-spoke)

### De-Anonymization in Final Output

The final REVIEW-SYNTHESIS.md debate trace section de-anonymizes all participants, showing full specialist attribution for transparency. Anonymization is a runtime mechanism for debate quality; the output artifact shows the complete picture.

### Thread State Management

The synthesis agent tracks thread states and manages transitions:
- `open` → Initial finding, not yet debated
- `agreed` → Multiple specialists concur, or no challenge raised
- `contested` → Active disagreement with ongoing debate
- `trade-off` → Classified as value-based conflict, exits debate for escalation/default
- `resolved` → Factual dispute settled by evidence

### Lock High-Confidence Agreements

When 5+ specialists agree on a finding with HIGH confidence after round 1, protect that finding from being debated away in subsequent rounds. This breaks the "martingale" property of debate (Choi et al. 2025) — unguided debate doesn't systematically improve accuracy, but locking correct answers creates directional drift toward correctness.

---

## REVIEW-SYNTHESIS.md Structure

### Parallel Mode Output

```markdown
# REVIEW-SYNTHESIS.md

## Review Summary
- Mode: society-of-thought (parallel)
- Specialists: [list of participating specialists]
- Selection rationale: [if adaptive mode was used]

## Must-Fix Findings
[Findings with severity: must-fix, organized by risk]

## Should-Fix Findings
[Findings with severity: should-fix]

## Consider
[Findings with severity: consider]

## Trade-offs Requiring Decision
[Unresolved trade-offs with both sides' evidence and recommendation]

## Observations
[Contextual-tier findings — require knowledge beyond this diff]

## Synthesis Trace
[For each finding: source specialist(s), grounding tier, conflict resolution (if any)]
```

### Debate Mode Output

Adds a Debate Trace section:

```markdown
## Debate Trace

### Thread: [code anchor / topic]
- **Round 1**: [Anonymized during debate] Reviewer A raised [claim]. Reviewer C challenged [warrant].
- **Round 2**: Reviewer A provided [additional evidence]. Reviewer C revised position.
- **Resolution**: Agreed — [final merged finding]
- **Participants**: security, performance [de-anonymized]

### Thread: [code anchor / topic]
- **Round 1**: Reviewer B flagged [performance concern]. Reviewer D flagged [security concern on same code].
- **Classification**: Trade-off (Performance vs Security)
- **Resolution**: Escalated to user / Applied priority hierarchy (Security > Performance)
- **Participants**: performance, security [de-anonymized]
```

---

## Research References

Key papers informing this protocol (full details in ResearchSources.md and research/ directory):

- **Habermas Machine (Tessler et al., Science 2024)**: Multi-candidate generation + Schulze voting; AI mediator preferred 56% vs human 44%
- **AgentAuditor (2025)**: Reasoning-tree audit at divergence points; exposes confabulation consensus
- **ReConcile (ACL 2024)**: Confidence-weighted voting with recalibration
- **Toulmin argumentation (Verheij 2009, ASPIC+)**: Structured argument decomposition for machine adjudication
- **"Lost in the Middle" (Liu et al., TACL 2024)**: >30% degradation from position bias; category-based clustering mitigates
- **Wynn et al. (2025)**: Response anonymization reduces identity bias from 0.608 to 0.024
- **DReaMAD (2025)**: Strategic prior knowledge + forced perspective diversification counters belief entrenchment
- **S²-MAD (NAACL 2025)**: Conditional participation reduces token cost 94.5% with <2% accuracy loss
- **Choi, Zhu & Li (2025)**: Multi-agent debate forms a martingale; lock high-confidence agreements to break symmetry
- **"Team of Rivals" (arXiv 2601.14351)**: 90%+ error interception with asymmetric veto authority and conservative defaults
- **MACI (Chang 2023-2025)**: Dual-dial (information + behavior) for per-thread continuation decisions
- **Pareto dominance / ATAM**: Classification test for trade-off vs factual dispute
- **Microsoft SDL / OWASP / ISO 25010**: Priority hierarchy foundations
