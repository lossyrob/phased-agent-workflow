# Synthesis Protocol

This document defines how the synthesis agent merges findings from multiple specialist reviewers into a single GapAnalysis.md. It is the companion to SpecialistDesignRubric.md — the rubric defines how specialists produce findings, this protocol defines how findings are merged, conflicts are resolved, and trade-offs are handled.

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
## Finding: [one-sentence claim]

**Severity**: must-fix | should-fix | consider
**Confidence**: HIGH | MEDIUM | LOW
**Category**: [specialist name]

### Grounds (Evidence)
[Diff-anchored evidence: file, line numbers, quoted code snippets]

### Warrant (Rule)
[The rule connecting evidence to conclusion — why does this evidence support this claim?]

### Rebuttal Conditions
[What would falsify this finding? Under what conditions is this NOT a concern?]

### Suggested Verification
[How could this finding be verified? Static check, test, runtime assertion?]
```

This operationalizes Toulmin argumentation (Verheij 2009, ASPIC+ framework) for machine-adjudicated code review. The Rebuttal Conditions field is critical — it gives the synthesis agent a concrete way to check whether a finding's exceptions apply, and it forces specialists to reason about when they might be wrong.

---

## Synthesis Pipeline

The synthesis agent follows a multi-phase pipeline. Each phase has a specific purpose and addresses a specific failure mode.

### Phase 1: Extraction & Normalization

For each specialist's output independently:
- Extract structured findings (parsing the Toulmin format above)
- Normalize severity and confidence scales across specialists
- Strip specialist identity labels for internal processing (prevents position/identity bias)
- Validate that each finding has diff-anchored grounds

### Phase 2: Category Clustering

Group findings by shared code anchors (file + line range) and topic area across all specialists. This prevents the "Lost in the Middle" problem — instead of processing 7 sequential reviews, the agent works on topic clusters.

- Findings referencing the same code location become a cluster
- Findings addressing the same semantic concern (even at different locations) may be merged into a cluster
- Each cluster is processed independently before cross-cluster integration

### Phase 3: Within-Cluster Synthesis

For each cluster:

**Agreement detection**: When multiple specialists flag the same concern with compatible claims, merge into a single finding with combined evidence and increased confidence. Note which specialists agreed (for attribution).

**Conflict classification**: When specialists disagree within a cluster, classify the conflict:

- **Factual dispute** (same premise, contradictory claims): Specialists disagree about an observable property of the code. One is wrong. → Route to conflict resolution (see below).
- **Trade-off** (different objectives, both valid): Specialists raise concerns that optimize for different quality attributes (e.g., security vs performance). Both are right. → Route to trade-off handling (see below).

**Classification heuristic**: If two specialists disagree but cite **different objective functions** (different quality attributes), it's likely a trade-off. If they disagree about a **shared premise** (same property of the code), it's likely a factual dispute.

### Phase 4: Conflict Resolution (Factual Disputes)

When specialists make contradictory factual claims:

1. **Extract contested premises** — identify the specific data, warrant, or rebuttal condition where they diverge
2. **Check rebuttal conditions** — does either specialist's rebuttal condition hold in the diff? If so, the rebutted finding is resolved
3. **Assess evidence quality** — which finding has more specific, diff-anchored evidence? Prefer findings with direct code references over inferential claims
4. **If still unresolved** — in debate mode, this triggers a targeted debate thread. In parallel mode, include both positions in the output with an "unresolved dispute" flag and let the resolution step handle it

### Phase 5: Trade-off Handling

When a conflict is classified as a trade-off:

**In interactive or smart mode**: Escalate to user with structured presentation:
- **Shared facts** (what all specialists agree on, with diff anchors)
- **Decision axis** (what quality attribute is being optimized by each side)
- **Options** (usually 2-3) with explicit consequences
- **Recommendation** (if auto-mode priority hierarchy is configured): "Given default priority Correctness > Security > Reliability > Performance > Maintainability, the recommended resolution is X"

**In auto mode**: Apply the configured priority hierarchy and resolve:
- Document which priority rule was applied
- Document what trade-off was assumed
- Flag the decision prominently in GapAnalysis.md so users are aware

### Phase 6: Grounding Validation

Every finding in the merged output is classified into one of three grounding tiers:

| Tier | Criteria | Treatment |
|------|----------|-----------|
| **Direct** | Finding cites specific lines/functions visible in the diff; claims are verifiable by reading the cited code | Full inclusion, high confidence — appears in main findings |
| **Inferential** | Finding requires reasoning about code behavior (O(n) analysis, control flow, data flow) but reasoning is sound and anchored in diff elements | Include with reasoning chain shown — appears in main findings with evidence trail |
| **Contextual** | Finding requires knowledge beyond the diff (system architecture, deployment context, historical patterns) | Demote to "observations" section with explicit caveat: "Based on context beyond this diff" |

Findings that reference code NOT present in the diff (phantom line numbers, nonexistent functions) are excluded with an explanation logged in the synthesis trace.

### Phase 7: Multi-Candidate Generation & Selection

Generate **3 candidate GapAnalysis.md merges** with different organizational strategies:
1. **Severity-first**: Findings organized by severity (must-fix → should-fix → consider)
2. **Category-first**: Findings organized by specialist perspective cluster
3. **Risk-first**: Findings organized by risk impact (combining severity × confidence × blast radius)

Score each candidate against:
- Completeness: Does it include all non-excluded findings?
- Evidence quality: Are evidence chains clear and traceable?
- Actionability: Can a developer act on each finding?
- Balance: Are specialist perspectives represented proportionally (not dominated by verbose specialists)?

Select the highest-scoring candidate. This multi-candidate approach, inspired by the Habermas Machine (Tessler et al., Science 2024), outperforms single-pass synthesis by avoiding order-dependent and framing-dependent biases.

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

The final GapAnalysis.md debate trace section de-anonymizes all participants, showing full specialist attribution for transparency. Anonymization is a runtime mechanism for debate quality; the output artifact shows the complete picture.

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

## GapAnalysis.md Structure

### Parallel Mode Output

```markdown
# GapAnalysis.md

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
