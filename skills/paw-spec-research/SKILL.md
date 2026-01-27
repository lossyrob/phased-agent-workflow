---
name: paw-spec-research
description: Spec research activity skill for PAW workflow. Answers factual questions about existing system behavior to inform specification writing.
---

# Spec Research

**Describe how the system works today** to answer questions from the spec research prompt. Document existing behavior—no design, no improvements.

> **Reference**: Follow Core Implementation Principles from `paw-workflow` skill.

## Capabilities

- Answer factual questions about existing system behavior
- Document behavioral descriptions (what system does from user/component perspective)
- Identify unanswered questions as Open Unknowns

## Scope: Behavioral Documentation Only

**What to document:**
- Behavioral descriptions (what system does from user/component perspective)
- Conceptual data flows (entities and their purposes)
- API behaviors (inputs/outputs, not implementation)
- User-facing workflows and business rules
- Configuration effects (what happens when changed)

**What NOT to document:**
- File paths or line numbers (Code Research handles this)
- Implementation details or code structure (Code Research handles this)
- Technical architecture or design patterns (Code Research handles this)
- Code snippets or function signatures (Code Research handles this)

**Key difference from CodeResearch.md:**
- SpecResearch.md: "The auth system requires email and password, returns session token" (behavioral)
- CodeResearch.md: "Auth implemented in auth/handlers.go:45 using bcrypt" (implementation)

## Execution Steps

### 1. Read Research Prompt

Read the prompt at `prompts/01B-spec-research.prompt.md` to understand:
- Questions to answer
- Agent notes providing context
- Target branch and issue URL

### 2. Research Questions

For each question:
1. Search codebase for relevant behavior
2. **Read files fully**—never use limit/offset; incomplete context leads to incorrect descriptions
3. Document the answer factually
4. Note evidence source (e.g., "API docs", "config behavior")

### 3. Handle Unanswerable Questions

If a question cannot be answered after consulting:
- Internal specs/overview docs
- Existing artifacts
- Config files
- Relevant code

List it under "Open Unknowns" with rationale for why it couldn't be answered.

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
- [ ] SpecResearch.md saved to `.paw/work/<feature-slug>/SpecResearch.md`

## Completion Response

```
Spec research complete.

Artifact: .paw/work/<feature-slug>/SpecResearch.md
Questions answered: <count>
Open unknowns: <count>
External questions (manual): <count>

Ready for paw-spec to integrate findings.
```
