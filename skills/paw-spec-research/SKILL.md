---
name: paw-spec-research
description: Spec research activity skill for PAW workflow. Answers factual questions about existing system behavior to inform specification writing.
---

# Spec Research

> **Execution Context**: This skill typically runs in a **subagent** session, delegated by the PAW orchestrator. Return structured results to the orchestrator upon completion.

**Describe how the system works today** to answer questions from the spec research prompt. Document existing behavior—no design, no improvements.

> **Reference**: Follow Core Implementation Principles from `paw-workflow` skill.

## Capabilities

- Answer factual questions about existing system behavior
- Document behavioral descriptions (what system does from user/component perspective)
- Identify unanswered questions as Open Unknowns

## Scope: Behavioral Documentation Only

> **Note**: The file:line citation requirement from `paw-workflow` Core Principles applies to *implementation claims* in CodeResearch.md, not behavioral documentation here. SpecResearch.md documents *what* the system does, not *how* it's implemented.

**What to document:**
- Behavioral descriptions (what system does from user/component perspective)
- Conceptual data flows (entities and their purposes)
- API behaviors (inputs/outputs, not implementation)
- User-facing workflows and business rules
- Configuration effects (what happens when changed)

**What NOT to document:**
- Implementation details or code structure (Code Research handles this)
- Technical architecture or design patterns (Code Research handles this)
- Code snippets or function signatures (Code Research handles this)

**Evidence references**: Use documentation-level citations (e.g., "README section X", "API docs", "config file behavior") rather than code file:line references.

**Key difference from CodeResearch.md:**
- SpecResearch.md: "The auth system requires email and password, returns session token" (behavioral)
- CodeResearch.md: "Auth implemented in auth/handlers.go:45 using bcrypt" (implementation)

## Desired End State

SpecResearch.md artifact created at `.paw/work/<work-id>/SpecResearch.md` containing:
- Summary of key findings about existing system behavior
- Each question answered with evidence source and spec implications
- Unanswerable questions listed as Open Unknowns with rationale
- External questions preserved for manual completion

## Research Process

Read `.paw/work/<work-id>/ResearchQuestions.md` for questions and context. For each question, search the codebase for relevant behavior, ensure sufficient context before stating behavior confidently, and document answers factually with evidence sources.

## SpecResearch.md Template

```markdown
---
date: <YYYY-MM-DD HH:MM:SS TZ>
git_commit: <current commit hash>
branch: <target branch>
repository: <repo name>
topic: "<feature name> Spec Research"
tags: [research, specification]
status: complete
---

# Spec Research: <Feature Name>

## Summary
<1-2 paragraphs: Key findings overview. What the research revealed about existing system behavior.>

## Agent Notes
<Preserve notes from Spec Agent verbatim. Omit section if no notes in prompt.>

## Research Findings

### Question 1: <question text>
**Answer**: <factual behavior description>
**Evidence**: <source of information - e.g., "API documentation", "observed config behavior">
**Implications**: <how this impacts spec requirements or scope>

### Question 2: <question text>
**Answer**: <factual behavior description>
**Evidence**: <source>
**Implications**: <impact on spec>

## Open Unknowns
<List internal questions that couldn't be answered with rationale.>

- <question>: <why it couldn't be answered>

Note: The Spec Agent will review these with you. You may provide answers if possible.

## User-Provided External Knowledge (Manual Fill)
<Unchecked list of optional external/context questions for manual completion.>

- [ ] <external question 1>
- [ ] <external question 2>
```

## Quality Guidelines

### Anti-Evaluation Directives (CRITICAL)

**YOUR JOB IS TO DESCRIBE THE SYSTEM AS IT EXISTS TODAY**
- DO NOT suggest improvements or alternative implementations
- DO NOT critique current behavior or identify problems
- DO NOT recommend optimizations, refactors, or fixes
- DO NOT evaluate whether the current approach is good or bad
- ONLY document observable behavior and facts supported by the codebase

### Keep Answers Concise

- Answer questions directly with essential facts only
- Avoid exhaustive lists, lengthy examples, or unnecessary detail
- Goal: Give Spec Agent enough info to write clear requirements, not document every edge case

### Idempotent Updates

- Build SpecResearch.md incrementally
- Re-running with same inputs should reproduce same document
- Preserve existing accurate sections; avoid rewriting unrelated portions

## Quality Checklist

Before completion:
- [ ] All internal questions answered or listed as Open Unknowns with rationale
- [ ] Answers are factual and evidence-based (no speculation)
- [ ] Responses are concise and directly address questions
- [ ] Behavioral focus maintained (no implementation details)
- [ ] Optional external questions copied to manual section
- [ ] SpecResearch.md saved to `.paw/work/<work-id>/SpecResearch.md`

## Completion Response

Report to PAW agent: artifact path, counts (questions answered, open unknowns, external questions for manual completion), and readiness for spec integration.
