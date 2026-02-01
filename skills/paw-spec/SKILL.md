---
name: paw-spec
description: Specification activity skill for PAW workflow. Converts issue/brief into structured feature specification with user stories, requirements, and success criteria.
---

# Specification

Convert a rough Issue / feature brief into a **structured feature specification**. Emphasizes prioritized user stories, enumerated requirements, measurable success criteria, explicit assumptions, and traceability.

> **Reference**: Follow Core Implementation Principles from `paw-workflow` skill.

## Capabilities

- Create new specification from issue/brief or WorkShaping.md output
- Clarify ambiguous requirements through interactive Q&A
- Generate research prompt for factual questions about existing system
- Integrate research findings into specification
- Revise spec based on downstream learnings (e.g., align with implementation plan)
- Address PR review comments on specification

## Core Principles

1. **User value focus**: Describe WHAT & WHY, not implementation details 
2. **Independently testable stories**: Prioritize user stories (P1 highest) with acceptance scenarios and "Independent Test" statement
3. **Resolve before drafting**: Clarification questions answered before drafting—no unresolved critical questions or placeholder markers
4. **Enumerated traceability**: Use IDs (FR-001, SC-001) linking stories ↔ FRs ↔ SCs; cite research sources
5. **Research vs design**: Research documents existing behavior; design decisions belong in spec based on requirements
6. **Explicit assumptions**: Replace low-impact unknowns with documented assumptions
7. **Measurable & tech-agnostic**: Success criteria measurable without referencing specific technologies
8. **Scope & risk**: Maintain explicit In/Out boundaries; enumerate risks with mitigations
9. **No speculation**: Every feature maps to a defined story—no "future maybe" items

## Clarification Phase

Before drafting the specification, identify and resolve gaps that only the user can answer. This phase always runs during initial spec creation regardless of Review Policy—it's the most important step to get right.

### When to Clarify

After reading the issue/brief, scan for high-impact gaps:
- **Scope boundaries**: What's explicitly in vs out?
- **User roles**: Who are the distinct users/personas?
- **Success criteria**: How will we know it works? (measurable)
- **Edge cases**: What happens when X fails/is empty/conflicts?
- **Non-functional requirements**: Performance, security, scale constraints?
- **Ambiguous terminology**: Terms that could mean multiple things?

**Skip clarification if**: The issue/brief is comprehensive and gaps are low-impact or can be handled as documented assumptions.

### Clarification Process

Ask questions **one at a time**:
1. Identify the single highest-impact unclear item
2. Formulate a focused question (prefer multiple choice when options are finite)
3. Include AI recommendation with reasoning when applicable
4. Wait for user response
5. Integrate answer into working understanding
6. Repeat until gaps resolved or user signals done

### Question Guidelines

- Ask only what the user can answer (intent, priorities, business constraints)
- Prefer multiple choice over freeform when options are enumerable
- One question per turn—never batch multiple questions
- High-impact only: skip stylistic or low-stakes gaps
- Include recommendation when you have one: "Recommended: X (because...)"

**Example questions**:
- "Should admin users have different permissions than regular users? (Recommended: Yes, admins need audit capabilities)"
- "What happens if the external API is unavailable? Options: (a) Show cached data, (b) Show error, (c) Retry with backoff"
- "Is there a maximum number of items a user can create? (This affects data model and UI)"

### Exit Conditions

Stop clarification when:
- All high-impact gaps are resolved
- User signals: "done", "skip", "proceed", "that's enough"
- ~5-10 questions reached (avoid fatigue—remaining gaps become assumptions)

## Execution Based on Context

### New Specification (No SpecResearch.md)

**Desired end state**: Research prompt generated OR specification complete

**Input source precedence**: WorkShaping.md (if exists) → issue/brief → user description

- Check for WorkShaping.md in work directory; if present, use its structured content as primary input
- Run Clarification Phase to resolve remaining user-intent gaps before drafting
- Classify unknowns: assumptions (document in spec) vs research questions (generate prompt)
- If research needed: generate ResearchQuestions at `.paw/work/<work-id>/ResearchQuestions.md` and STOP
- If no research needed: proceed to complete specification

### Resume After Research (SpecResearch.md exists)

**Desired end state**: Complete specification integrating research findings

- Map research answers to requirements
- Resolve any new clarifications surfaced by research
- Assemble complete specification

### Revise Specification

**Desired end state**: Spec aligned with downstream artifacts, traceability maintained

- Identify specific sections needing updates based on alignment requirements
- Make targeted revisions while maintaining ID traceability
- Update version/date in spec header

### Address PR Review Comments

Load `paw-review-response` utility skill for mechanics. Focus on what spec sections to update and how to maintain traceability.

## Research Question Guidelines

Research answers "how does the system work today?" NOT "what should we build?"

**Appropriate:**
- "How does the authentication system validate sessions?" → Learn pattern → Decide approach
- "What error format do existing APIs use?" → Learn structure → Decide format

**Inappropriate:**
- "Should we use JWT or sessions?" → Design decision, not research
- "What status codes for new endpoint?" → Design decision, not research

## ResearchQuestions Format

Generate ResearchQuestions at `.paw/work/<work-id>/ResearchQuestions.md` containing:
- Target branch and issue URL (for context)
- Agent notes from intake that help researcher understand constraints
- Numbered list of internal system behavior questions
- Optional section for external/context questions

## Specification Template

```markdown
# Feature Specification: <FEATURE NAME>

**Branch**: <branch>  |  **Created**: <YYYY-MM-DD>  |  **Status**: Draft
**Input Brief**: <one-line intent>

## Overview
<2-4 paragraphs describing WHAT and WHY from user perspective.
Flowing narrative prose—user journey and value. No implementation details.>

## Objectives
<Bulleted behavioral goals. Observable outcomes, technology-agnostic.
Optional rationale: "Enable X (Rationale: this allows users to...)">

## User Scenarios & Testing
### User Story P1 – <Title>
Narrative: <short user journey>
Independent Test: <single action verifying value>
Acceptance Scenarios:
1. Given <context>, When <action>, Then <outcome>

### User Story P2 – <Title>
...

### Edge Cases
- <edge condition & expected behavior>

## Requirements
### Functional Requirements
- FR-001: <testable capability> (Stories: P1)
- FR-002: <testable capability> (Stories: P1,P2)

### Key Entities (omit if none)
- <Entity>: <description>

### Cross-Cutting / Non-Functional (omit if in Success Criteria)
- <constraint with measurable aspect>

## Success Criteria
- SC-001: <measurable outcome, tech-agnostic> (FR-001)
- SC-002: <measurable outcome> (FR-002, FR-003)

## Assumptions
- <Assumed default & rationale>

## Scope
In Scope:
- <included boundary>
Out of Scope:
- <explicit exclusion>

## Dependencies
- <system/service/feature flag>

## Risks & Mitigations
- <risk>: <impact>. Mitigation: <approach>

## References
- Issue: <link>
- Research: .paw/work/<work-id>/SpecResearch.md
```

## Quality Checklist

### Content Quality
- [ ] Focuses on WHAT & WHY (no implementation details)
- [ ] No code snippets, file paths, API signatures
- [ ] Story priorities clear (P1 highest)
- [ ] Each story independently testable with ≥1 acceptance scenario
- [ ] Edge cases enumerated

### Narrative Quality
- [ ] Overview: 2-4 paragraphs of flowing prose
- [ ] Objectives: bulleted behavioral goals
- [ ] User perspective throughout—no implementation details

### Requirement Completeness
- [ ] All FRs testable & observable
- [ ] FRs mapped to user stories
- [ ] Success Criteria measurable & tech-agnostic
- [ ] Success Criteria linked to FRs
- [ ] Assumptions documented
- [ ] Dependencies listed

### Ambiguity Control
- [ ] No unresolved clarification questions
- [ ] No vague adjectives without metrics

### Scope & Risk
- [ ] Clear In/Out boundaries
- [ ] Risks & mitigations captured

### Research Integration
- [ ] System research questions answered or converted to assumptions
- [ ] Optional external questions listed for manual completion

## Workflow Mode Adaptation

**Full mode**: Standard spec with comprehensive coverage

**Minimal mode**: Spec stage typically skipped. If invoked, create lightweight spec focusing on core FRs and acceptance criteria.

**Custom mode**: Check Custom Workflow Instructions. Adapt depth per instructions.

## Completion Response

## Completion Response

Report to PAW agent based on outcome:

**Research needed**: Include ResearchQuestions path, question count, documented assumptions count, and indicate waiting for research.

**Specification complete**: Include artifact path, counts (user stories, FRs, success criteria), and confirmation that quality checklist passes.
