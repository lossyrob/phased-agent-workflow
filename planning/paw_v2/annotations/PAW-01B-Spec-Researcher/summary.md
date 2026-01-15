# PAW-01B Spec Researcher Agent - Structure Summary

## Agent Identity
- **Name**: PAW-01B Spec Researcher Agent
- **Mission**: Describe how the system works today—answer factual questions from the spec research prompt without suggesting design or improvements
- **Phase**: Stage 01B (Spec Research)
- **Operating Principle**: Behavioral documentation only, no evaluation or recommendations

## Annotation Counts

| Category | Count |
|----------|-------|
| Guardrails | 10 |
| Workflow Steps | 5 |
| Decision Frameworks | 2 |
| Classification Logic | 2 |
| Artifact Formats | 2 |
| Quality Gates | 1 |
| Handoff Instructions | 2 |
| Communication Patterns | 2 |
| Examples | 2 |
| Context Requirements | 2 |

**Total Annotations**: 30

## Scope Breakdown

| Scope | Count | Percentage |
|-------|-------|------------|
| `reusable` | 11 | ~37% |
| `phase-bound` | 12 | ~40% |
| `workflow` | 4 | ~13% |
| (unspecified) | 3 | ~10% |

## Structural Analysis

### Reusable Content (Extractable Skills)
- **Read files fully**: Never use limit/offset parameters for complete context
- **Be concise**: Direct, factual answers without exhaustive detail
- **No proposals/refactors**: Document only, no "shoulds"
- **No speculation**: State only what exists or mark as unknown
- **Keep answers concise**: Essential facts only, avoid context bloat
- **Anti-evaluation directives**: Describe, don't evaluate or recommend
- **Idempotent artifact updates**: Update only affected sections, no unnecessary churn
- **MCP tool preference**: Use platform tools over CLI commands for issue/PR operations
- **Incremental building pattern**: Summary → questions → finalize

### Phase-Bound Content (Spec Research-Specific)
- **Behavioral scope definition**: What to document vs what NOT to document
- **SpecResearch.md format**: Section structure (Summary, Agent Notes, Findings, etc.)
- **Question-answer format**: Question, Answer, Evidence, Implications structure
- **Behavioral vs implementation distinction**: SpecResearch vs CodeResearch differentiation
- **Open Unknowns classification**: Internal questions that can't be answered
- **External knowledge section**: Manual fill for context questions
- **Canonical output path**: `.paw/work/<feature-slug>/SpecResearch.md`
- **Quality checklist**: Phase-specific completion criteria
- **Handoff example**: Specific message format for Spec Research completion

### Workflow-Controlling Content
- **PAW Context requirement**: {{PAW_CONTEXT}} injection point
- **Handoff instructions**: {{HANDOFF_INSTRUCTIONS}} injection point
- **No commit/push rule**: Other agents handle git operations
- **Stage transition**: Return to PAW-01A Specification after research

## Potential Gaps

- ⚠️ No explicit guidance for handling very large research prompts (prioritization)
- ⚠️ No rollback guidance if research produces conflicting information
- ⚠️ No explicit timeout or scope-limiting guidance for extensive codebases
- ✓ Quality gate present with clear checklist
- ✓ Handoff instructions clear with example
- ✓ Behavioral vs implementation boundary well-defined

## Key Workflow Paths

```
Path 1: Standard Flow
  Check for prompt path → Receive prompt → Question-by-question research
  → Build SpecResearch.md incrementally → Quality check → Handoff to 01A

Path 2: No Prompt Provided
  Check for prompt path → Request prompt path or content → Continue standard flow
```

## Artifact Dependencies

### Inputs
- `prompts/01B-spec-research.prompt.md` or pasted questions (required)
- Existing codebase and documentation (implicit)
- Issue content if relevant (optional)

### Outputs
- `SpecResearch.md` at `.paw/work/<feature-slug>/SpecResearch.md`

### Downstream Consumers
- PAW-01A Specification Agent (integrates research findings into spec)

## Comparison with Related Agents

| Aspect | PAW-01B Spec Researcher | PAW-02A Code Researcher |
|--------|------------------------|-------------------------|
| Focus | Behavioral documentation | Implementation details |
| Output | SpecResearch.md | CodeResearch.md |
| Detail level | Conceptual, user-facing | File paths, line numbers |
| Code references | No file:line | Yes, with locations |
| Design suggestions | Never | Never |
| Consumer | Spec Agent | Impl Planner |

## Key Differentiators

This agent is notable for:
1. **Strong anti-evaluation stance**: Multiple guardrails explicitly prohibit suggestions/improvements
2. **Behavioral-only focus**: Explicitly excludes implementation details (delegated to Code Research)
3. **Circular handoff**: Returns to parent agent (01A) rather than advancing to next phase
4. **Conciseness emphasis**: Multiple guardrails stress brevity over completeness
