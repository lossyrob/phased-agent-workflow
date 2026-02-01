---
name: paw-work-shaping
description: Interactive pre-spec ideation utility skill. Agent-led Q&A to progressively clarify vague ideas, research codebase context, and produce structured WorkShaping.md artifact.
---

# Work Shaping

Interactive ideation session to transform vague ideas into structured, spec-ready work items. Runs in main agent context (not a subagent) to maintain natural conversation flow.

## When to Use

- User explicitly asks to explore, shape, or flesh out an idea
- Request has exploratory language ("what if", "maybe we could", "I'm thinking about")
- User expresses uncertainty ("I'm not sure if...", "not sure how to approach")
- Idea is too vague for direct specification

## Session Flow

### 1. Opening

Acknowledge the idea and set expectations:
- This is an exploratory conversation to clarify the work
- You'll ask questions to understand intent, constraints, and scope
- User can end anytime; you'll signal when "complete enough"

### 2. Progressive Clarification

Agent-led Q&A to build understanding:

**Question strategy**:
- One question at a time
- Start broad (intent, value proposition), then narrow (boundaries, constraints)
- Offer recommendations when you have informed opinions
- Prefer multiple choice when options are enumerable

**Topics to explore** (adapt based on idea):
- Core value: What problem does this solve? Who benefits?
- Scope boundaries: What's definitely in? What's explicitly out?
- User interactions: How will users engage with this?
- Edge cases: What happens when X fails/is empty/conflicts?
- Success definition: How will we know it works?
- Constraints: Performance, security, compatibility requirements?

**Codebase research**: When questions arise about existing system behavior, patterns, or integration points, delegate to `paw-code-research` skill via subagent with specific questions. Integrate findings into the conversation.

### 3. Completion Detection

Signal "complete enough" when:
- Core value proposition is clear
- Scope boundaries are defined
- Major edge cases identified
- No critical unknowns remain

Offer to:
- Continue exploring specific areas
- Generate the WorkShaping.md artifact
- Hand off to specification stage

User can also end anytime with "that's enough", "let's write it up", etc.

### 4. Artifact Generation

Synthesize the conversation into WorkShaping.md.

## WorkShaping.md Template

```markdown
# Work Shaping: <Work Title>

**Date**: <YYYY-MM-DD>
**Status**: Shaped (ready for specification)

## Problem Statement

<Clear description of the problem being solved and who benefits>

## Work Breakdown

### Core Functionality
- <Main capability 1>
- <Main capability 2>

### Supporting Features
- <Supporting item>

## Edge Cases and Boundary Conditions

- <Edge case>: <How it should be handled>

## Rough Architecture

<High-level component interactions, data flow, integration points>

## Critical Analysis

### Value Assessment
<Why this is worth building, what alternatives exist>

### Build vs. Modify Tradeoffs
<New construction vs. extending existing features>

## Codebase Fit

### Similar Existing Features
- <Existing feature and how it relates>

### Reuse Opportunities
- <Existing code/patterns that can be leveraged>

## Risk Assessment

### Potential Negative Impacts
- <Risk>: <Impact and mitigation thoughts>

### Implementation Gotchas
- <Gotcha to watch for>

## Open Questions

<Any remaining questions that spec stage should address>

## Session Notes

<Key insights or decisions from the shaping conversation>
```

## Artifact Location

**Primary**: `.paw/work/<work-id>/WorkShaping.md` (if work directory exists)

**Fallback**: Workspace root. Prompt user for alternate location if needed.

## Quality Checklist

- [ ] Problem statement is clear and user-focused
- [ ] Work breakdown covers core and supporting functionality
- [ ] Edge cases enumerated with expected handling
- [ ] Architecture sketch shows component relationships
- [ ] Critical analysis includes value assessment and tradeoffs
- [ ] Codebase fit identifies reuse opportunities
- [ ] Risks and gotchas documented
- [ ] Open questions captured for downstream stages
