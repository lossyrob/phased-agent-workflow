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

**Codebase research**: When questions arise about existing system behavior, patterns, or integration points, delegate to `paw-code-research` skill via subagent with specific questions. Request findings returned in chat summary rather than full artifact generation. Integrate findings into the conversation.

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

## Artifact Content

WorkShaping.md should capture:
- Problem statement (who benefits, what problem is solved)
- Work breakdown (core functionality vs supporting features)
- Edge cases with expected handling
- Rough architecture (component interactions, data flow)
- Critical analysis (value assessment, build vs modify tradeoffs)
- Codebase fit (similar features, reuse opportunities)
- Risk assessment (potential negative impacts, gotchas)
- Open questions for downstream stages
- Session notes: key decisions and insights from the Q&A (e.g., scope decisions, rejected alternatives, surprising discoveries)

Use clear section headers. Omit sections that don't apply.

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
