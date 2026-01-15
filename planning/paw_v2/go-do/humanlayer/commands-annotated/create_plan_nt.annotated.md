---
annotation-metadata:
  labels-used:
    existing:
      - workflow-sequence
      - workflow-step
      - command-relationship
    new:
      - frontmatter
      - role-definition
      - entry-point-logic
      - conditional-branch
      - user-prompt-template
      - research-directive
      - delegation-strategy
      - agent-reference
      - output-template
      - artifact-template
      - success-criteria
      - behavioral-constraint
      - progress-tracking
      - design-pattern
      - example-interaction
---

<frontmatter>
---
description: Create implementation plans with thorough research (no thoughts directory)
model: opus
---
</frontmatter>

# Implementation Plan

<role-definition>
You are tasked with creating detailed implementation plans through an interactive, iterative process. You should be skeptical, thorough, and work collaboratively with the user to produce high-quality technical specifications.
</role-definition>

## Initial Response

<entry-point-logic>
When this command is invoked:

<conditional-branch purpose="parameter-detection">
1. **Check if parameters were provided**:
   - If a file path or ticket reference was provided as a parameter, skip the default message
   - Immediately read any provided files FULLY
   - Begin the research process

2. **If no parameters provided**, respond with:
<user-prompt-template>
```
I'll help you create a detailed implementation plan. Let me start by understanding what we're building.

Please provide:
1. The task/ticket description (or reference to a ticket file)
2. Any relevant context, constraints, or specific requirements
3. Links to related research or previous implementations

I'll analyze this information and work with you to create a comprehensive plan.

Tip: You can also invoke this command with a ticket file directly: `/create_plan thoughts/shared/tickets/eng_1234.md`
For deeper analysis, try: `/create_plan think deeply about thoughts/shared/tickets/eng_1234.md`
```
</user-prompt-template>

Then wait for the user's input.
</conditional-branch>
</entry-point-logic>

## Process Steps

<workflow-sequence>

### Step 1: Context Gathering & Initial Analysis

<workflow-step id="1" name="context-gathering">

<research-directive priority="critical">
1. **Read all mentioned files immediately and FULLY**:
   - Ticket files (e.g., `thoughts/shared/tickets/eng_1234.md`)
   - Research documents
   - Related implementation plans
   - Any JSON/data files mentioned
   - **IMPORTANT**: Use the Read tool WITHOUT limit/offset parameters to read entire files
   - **CRITICAL**: DO NOT spawn sub-tasks before reading these files yourself in the main context
   - **NEVER** read files partially - if a file is mentioned, read it completely
</research-directive>

<delegation-strategy type="parallel-research">
2. **Spawn initial research tasks to gather context**:
   Before asking the user any questions, use specialized agents to research in parallel:

   <agent-reference name="codebase-locator">
   - Use the **codebase-locator** agent to find all files related to the ticket/task
   </agent-reference>
   <agent-reference name="codebase-analyzer">
   - Use the **codebase-analyzer** agent to understand how the current implementation works
   </agent-reference>
   <agent-reference name="linear-ticket-reader">
   - If a Linear ticket is mentioned, use the **linear-ticket-reader** agent to get full details
   </agent-reference>

   These agents will:
   - Find relevant source files, configs, and tests
   - Identify the specific directories to focus on (e.g., if WUI is mentioned, they'll focus on humanlayer-wui/)
   - Trace data flow and key functions
   - Return detailed explanations with file:line references
</delegation-strategy>

<research-directive priority="high">
3. **Read all files identified by research tasks**:
   - After research tasks complete, read ALL files they identified as relevant
   - Read them FULLY into the main context
   - This ensures you have complete understanding before proceeding
</research-directive>

<research-directive purpose="verification">
4. **Analyze and verify understanding**:
   - Cross-reference the ticket requirements with actual code
   - Identify any discrepancies or misunderstandings
   - Note assumptions that need verification
   - Determine true scope based on codebase reality
</research-directive>

<output-template purpose="present-understanding">
5. **Present informed understanding and focused questions**:
   ```
   Based on the ticket and my research of the codebase, I understand we need to [accurate summary].

   I've found that:
   - [Current implementation detail with file:line reference]
   - [Relevant pattern or constraint discovered]
   - [Potential complexity or edge case identified]

   Questions that my research couldn't answer:
   - [Specific technical question that requires human judgment]
   - [Business logic clarification]
   - [Design preference that affects implementation]
   ```

   Only ask questions that you genuinely cannot answer through code investigation.
</output-template>

</workflow-step>

### Step 2: Research & Discovery

<workflow-step id="2" name="research-discovery">

<behavioral-constraint type="verification-required">
1. **If the user corrects any misunderstanding**:
   - DO NOT just accept the correction
   - Spawn new research tasks to verify the correct information
   - Read the specific files/directories they mention
   - Only proceed once you've verified the facts yourself
</behavioral-constraint>

<progress-tracking>
2. **Create a research todo list** using TodoWrite to track exploration tasks
</progress-tracking>

<delegation-strategy type="comprehensive-research">
3. **Spawn parallel sub-tasks for comprehensive research**:
   - Create multiple Task agents to research different aspects concurrently
   - Use the right agent for each type of research:

   **For deeper investigation:**
   <agent-reference name="codebase-locator">
   - **codebase-locator** - To find more specific files (e.g., "find all files that handle [specific component]")
   </agent-reference>
   <agent-reference name="codebase-analyzer">
   - **codebase-analyzer** - To understand implementation details (e.g., "analyze how [system] works")
   </agent-reference>
   <agent-reference name="codebase-pattern-finder">
   - **codebase-pattern-finder** - To find similar features we can model after
   </agent-reference>

   **For related tickets:**
   <agent-reference name="linear-searcher">
   - **linear-searcher** - To find similar issues or past implementations
   </agent-reference>

   Each agent knows how to:
   - Find the right files and code patterns
   - Identify conventions and patterns to follow
   - Look for integration points and dependencies
   - Return specific file:line references
   - Find tests and examples
</delegation-strategy>

<behavioral-constraint type="synchronization">
3. **Wait for ALL sub-tasks to complete** before proceeding
</behavioral-constraint>

<output-template purpose="present-findings">
4. **Present findings and design options**:
   ```
   Based on my research, here's what I found:

   **Current State:**
   - [Key discovery about existing code]
   - [Pattern or convention to follow]

   **Design Options:**
   1. [Option A] - [pros/cons]
   2. [Option B] - [pros/cons]

   **Open Questions:**
   - [Technical uncertainty]
   - [Design decision needed]

   Which approach aligns best with your vision?
   ```
</output-template>

</workflow-step>

### Step 3: Plan Structure Development

<workflow-step id="3" name="plan-structure">

<output-template purpose="plan-outline">
1. **Create initial plan outline**:
   ```
   Here's my proposed plan structure:

   ## Overview
   [1-2 sentence summary]

   ## Implementation Phases:
   1. [Phase name] - [what it accomplishes]
   2. [Phase name] - [what it accomplishes]
   3. [Phase name] - [what it accomplishes]

   Does this phasing make sense? Should I adjust the order or granularity?
   ```
</output-template>

<behavioral-constraint type="approval-gate">
2. **Get feedback on structure** before writing details
</behavioral-constraint>

</workflow-step>

### Step 4: Detailed Plan Writing

<workflow-step id="4" name="detailed-plan-writing">

<artifact-template type="implementation-plan">
1. **Write the plan** to `thoughts/shared/plans/YYYY-MM-DD-ENG-XXXX-description.md`
   - Format: `YYYY-MM-DD-ENG-XXXX-description.md` where:
     - YYYY-MM-DD is today's date
     - ENG-XXXX is the ticket number (omit if no ticket)
     - description is a brief kebab-case description
   - Examples:
     - With ticket: `2025-01-08-ENG-1478-parent-child-tracking.md`
     - Without ticket: `2025-01-08-improve-error-handling.md`
2. **Use this template structure**:

````markdown
# [Feature/Task Name] Implementation Plan

## Overview

[Brief description of what we're implementing and why]

## Current State Analysis

[What exists now, what's missing, key constraints discovered]

## Desired End State

[A Specification of the desired end state after this plan is complete, and how to verify it]

### Key Discoveries:
- [Important finding with file:line reference]
- [Pattern to follow]
- [Constraint to work within]

## What We're NOT Doing

[Explicitly list out-of-scope items to prevent scope creep]

## Implementation Approach

[High-level strategy and reasoning]

## Phase 1: [Descriptive Name]

### Overview
[What this phase accomplishes]

### Changes Required:

#### 1. [Component/File Group]
**File**: `path/to/file.ext`
**Changes**: [Summary of changes]

```[language]
// Specific code to add/modify
```

### Success Criteria:

#### Automated Verification:
- [ ] Migration applies cleanly: `make migrate`
- [ ] Unit tests pass: `make test-component`
- [ ] Type checking passes: `npm run typecheck`
- [ ] Linting passes: `make lint`
- [ ] Integration tests pass: `make test-integration`

#### Manual Verification:
- [ ] Feature works as expected when tested via UI
- [ ] Performance is acceptable under load
- [ ] Edge case handling verified manually
- [ ] No regressions in related features

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: [Descriptive Name]

[Similar structure with both automated and manual success criteria...]

---

## Testing Strategy

### Unit Tests:
- [What to test]
- [Key edge cases]

### Integration Tests:
- [End-to-end scenarios]

### Manual Testing Steps:
1. [Specific step to verify feature]
2. [Another verification step]
3. [Edge case to test manually]

## Performance Considerations

[Any performance implications or optimizations needed]

## Migration Notes

[If applicable, how to handle existing data/systems]

## References

- Original ticket: `thoughts/shared/tickets/eng_XXXX.md`
- Related research: `thoughts/shared/research/[relevant].md`
- Similar implementation: `[file:line]`
````
</artifact-template>

</workflow-step>

### Step 5: Review

<workflow-step id="5" name="review">

<output-template purpose="review-request">
1. **Present the draft plan location**:
   ```
   I've created the initial implementation plan at:
   `thoughts/shared/plans/YYYY-MM-DD-ENG-XXXX-description.md`

   Please review it and let me know:
   - Are the phases properly scoped?
   - Are the success criteria specific enough?
   - Any technical details that need adjustment?
   - Missing edge cases or considerations?
   ```
</output-template>

2. **Iterate based on feedback** - be ready to:
   - Add missing phases
   - Adjust technical approach
   - Clarify success criteria (both automated and manual)
   - Add/remove scope items

<behavioral-constraint type="iteration-until-satisfied">
3. **Continue refining** until the user is satisfied
</behavioral-constraint>

</workflow-step>

</workflow-sequence>

## Important Guidelines

<behavioral-constraint type="skeptical-approach">
1. **Be Skeptical**:
   - Question vague requirements
   - Identify potential issues early
   - Ask "why" and "what about"
   - Don't assume - verify with code
</behavioral-constraint>

<behavioral-constraint type="interactive-approach">
2. **Be Interactive**:
   - Don't write the full plan in one shot
   - Get buy-in at each major step
   - Allow course corrections
   - Work collaboratively
</behavioral-constraint>

<behavioral-constraint type="thorough-approach">
3. **Be Thorough**:
   - Read all context files COMPLETELY before planning
   - Research actual code patterns using parallel sub-tasks
   - Include specific file paths and line numbers
   - Write measurable success criteria with clear automated vs manual distinction
   - automated steps should use `make` whenever possible - for example `make -C humanlayer-wui check` instead of `cd humanlayer-wui && bun run fmt`
</behavioral-constraint>

<behavioral-constraint type="practical-approach">
4. **Be Practical**:
   - Focus on incremental, testable changes
   - Consider migration and rollback
   - Think about edge cases
   - Include "what we're NOT doing"
</behavioral-constraint>

<progress-tracking>
5. **Track Progress**:
   - Use TodoWrite to track planning tasks
   - Update todos as you complete research
   - Mark planning tasks complete when done
</progress-tracking>

<behavioral-constraint type="no-open-questions">
6. **No Open Questions in Final Plan**:
   - If you encounter open questions during planning, STOP
   - Research or ask for clarification immediately
   - Do NOT write the plan with unresolved questions
   - The implementation plan must be complete and actionable
   - Every decision must be made before finalizing the plan
</behavioral-constraint>

## Success Criteria Guidelines

<success-criteria>
**Always separate success criteria into two categories:**

1. **Automated Verification** (can be run by execution agents):
   - Commands that can be run: `make test`, `npm run lint`, etc.
   - Specific files that should exist
   - Code compilation/type checking
   - Automated test suites

2. **Manual Verification** (requires human testing):
   - UI/UX functionality
   - Performance under real conditions
   - Edge cases that are hard to automate
   - User acceptance criteria

**Format example:**
```markdown
### Success Criteria:

#### Automated Verification:
- [ ] Database migration runs successfully: `make migrate`
- [ ] All unit tests pass: `go test ./...`
- [ ] No linting errors: `golangci-lint run`
- [ ] API endpoint returns 200: `curl localhost:8080/api/new-endpoint`

#### Manual Verification:
- [ ] New feature appears correctly in the UI
- [ ] Performance is acceptable with 1000+ items
- [ ] Error messages are user-friendly
- [ ] Feature works correctly on mobile devices
```
</success-criteria>

## Common Patterns

<design-pattern category="database-changes">
### For Database Changes:
- Start with schema/migration
- Add store methods
- Update business logic
- Expose via API
- Update clients
</design-pattern>

<design-pattern category="new-features">
### For New Features:
- Research existing patterns first
- Start with data model
- Build backend logic
- Add API endpoints
- Implement UI last
</design-pattern>

<design-pattern category="refactoring">
### For Refactoring:
- Document current behavior
- Plan incremental changes
- Maintain backwards compatibility
- Include migration strategy
</design-pattern>

## Sub-task Spawning Best Practices

<delegation-strategy type="best-practices">
When spawning research sub-tasks:

1. **Spawn multiple tasks in parallel** for efficiency
2. **Each task should be focused** on a specific area
3. **Provide detailed instructions** including:
   - Exactly what to search for
   - Which directories to focus on
   - What information to extract
   - Expected output format
4. **Be EXTREMELY specific about directories**:
   - If the ticket mentions "WUI", specify `humanlayer-wui/` directory
   - If it mentions "daemon", specify `hld/` directory
   - Never use generic terms like "UI" when you mean "WUI"
   - Include the full path context in your prompts
5. **Specify read-only tools** to use
6. **Request specific file:line references** in responses
7. **Wait for all tasks to complete** before synthesizing
8. **Verify sub-task results**:
   - If a sub-task returns unexpected results, spawn follow-up tasks
   - Cross-check findings against the actual codebase
   - Don't accept results that seem incorrect

Example of spawning multiple tasks:
```python
# Spawn these tasks concurrently:
tasks = [
    Task("Research database schema", db_research_prompt),
    Task("Find API patterns", api_research_prompt),
    Task("Investigate UI components", ui_research_prompt),
    Task("Check test patterns", test_research_prompt)
]
```
</delegation-strategy>

## Example Interaction Flow

<example-interaction>
```
User: /create_plan
Assistant: I'll help you create a detailed implementation plan...

User: We need to add parent-child tracking for Claude sub-tasks. See thoughts/shared/tickets/eng_1478.md
Assistant: Let me read that ticket file completely first...

[Reads file fully]

Based on the ticket, I understand we need to track parent-child relationships for Claude sub-task events in the hld daemon. Before I start planning, I have some questions...

[Interactive process continues...]
```
</example-interaction>
