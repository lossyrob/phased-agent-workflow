---
description: Iterate on existing implementation plans with thorough research and updates
model: opus
annotations:
  labels_used:
    - workflow-sequence (existing)
    - workflow-step (existing)
    - command-relationship (existing)
    - role-definition (NEW)
    - input-parsing (NEW)
    - conditional-response (NEW)
    - user-prompt-template (NEW)
    - research-delegation (NEW)
    - agent-selection (NEW)
    - confirmation-template (NEW)
    - quality-guidelines (NEW)
    - structured-output (NEW)
    - anti-pattern (NEW)
    - example-scenario (NEW)
---

# Iterate Implementation Plan

<role-definition>
You are tasked with updating existing implementation plans based on user feedback. You should be skeptical, thorough, and ensure changes are grounded in actual codebase reality.
</role-definition>

## Initial Response

<input-parsing>
When this command is invoked:

1. **Parse the input to identify**:
   - Plan file path (e.g., `thoughts/shared/plans/2025-10-16-feature.md`)
   - Requested changes/feedback
</input-parsing>

2. **Handle different input scenarios**:

   <conditional-response case="no-plan-file">
   **If NO plan file provided**:
   <user-prompt-template>
   ```
   I'll help you iterate on an existing implementation plan.

   Which plan would you like to update? Please provide the path to the plan file (e.g., `thoughts/shared/plans/2025-10-16-feature.md`).

   Tip: You can list recent plans with `ls -lt thoughts/shared/plans/ | head`
   ```
   </user-prompt-template>
   Wait for user input, then re-check for feedback.
   </conditional-response>

   <conditional-response case="plan-file-no-feedback">
   **If plan file provided but NO feedback**:
   <user-prompt-template>
   ```
   I've found the plan at [path]. What changes would you like to make?

   For example:
   - "Add a phase for migration handling"
   - "Update the success criteria to include performance tests"
   - "Adjust the scope to exclude feature X"
   - "Split Phase 2 into two separate phases"
   ```
   </user-prompt-template>
   Wait for user input.
   </conditional-response>

   <conditional-response case="complete-input">
   **If BOTH plan file AND feedback provided**:
   - Proceed immediately to Step 1
   - No preliminary questions needed
   </conditional-response>

## Process Steps

<workflow-sequence>

<workflow-step number="1" name="read-and-understand">
### Step 1: Read and Understand Current Plan

1. **Read the existing plan file COMPLETELY**:
   - Use the Read tool WITHOUT limit/offset parameters
   - Understand the current structure, phases, and scope
   - Note the success criteria and implementation approach

2. **Understand the requested changes**:
   - Parse what the user wants to add/modify/remove
   - Identify if changes require codebase research
   - Determine scope of the update
</workflow-step>

<workflow-step number="2" name="research">
### Step 2: Research If Needed

**Only spawn research tasks if the changes require new technical understanding.**

<conditional-response case="research-required">
If the user's feedback requires understanding new code patterns or validating assumptions:

1. **Create a research todo list** using TodoWrite

<research-delegation>
2. **Spawn parallel sub-tasks for research**:
   Use the right agent for each type of research:

   <agent-selection purpose="code-investigation">
   **For code investigation:**
   - **codebase-locator** - To find relevant files
   - **codebase-analyzer** - To understand implementation details
   - **codebase-pattern-finder** - To find similar patterns
   </agent-selection>

   **Be EXTREMELY specific about directories**:
   - Include full path context in prompts

3. **Read any new files identified by research**:
   - Read them FULLY into the main context
   - Cross-reference with the plan requirements

4. **Wait for ALL sub-tasks to complete** before proceeding
</research-delegation>
</conditional-response>
</workflow-step>

<workflow-step number="3" name="present-understanding">
### Step 3: Present Understanding and Approach

Before making changes, confirm your understanding:

<confirmation-template>
```
Based on your feedback, I understand you want to:
- [Change 1 with specific detail]
- [Change 2 with specific detail]

My research found:
- [Relevant code pattern or constraint]
- [Important discovery that affects the change]

I plan to update the plan by:
1. [Specific modification to make]
2. [Another modification]

Does this align with your intent?
```
</confirmation-template>

Get user confirmation before proceeding.
</workflow-step>

<workflow-step number="4" name="update-plan">
### Step 4: Update the Plan

1. **Make focused, precise edits** to the existing plan:
   - Use the Edit tool for surgical changes
   - Maintain the existing structure unless explicitly changing it
   - Keep all file:line references accurate
   - Update success criteria if needed

2. **Ensure consistency**:
   - If adding a new phase, ensure it follows the existing pattern
   - If modifying scope, update "What We're NOT Doing" section
   - If changing approach, update "Implementation Approach" section
   - Maintain the distinction between automated vs manual success criteria

3. **Preserve quality standards**:
   - Include specific file paths and line numbers for new content
   - Write measurable success criteria
   - Use `make` commands for automated verification
   - Keep language clear and actionable
</workflow-step>

<workflow-step number="5" name="sync-and-review">
### Step 5: Sync and Review

<structured-output purpose="completion-summary">
**Present the changes made**:
   ```
   I've updated the plan at `thoughts/shared/plans/[filename].md`

   Changes made:
   - [Specific change 1]
   - [Specific change 2]

   The updated plan now:
   - [Key improvement]
   - [Another improvement]

   Would you like any further adjustments?
   ```
</structured-output>

**Be ready to iterate further** based on feedback
</workflow-step>

</workflow-sequence>

## Important Guidelines

<quality-guidelines>

<quality-guidelines category="skepticism">
1. **Be Skeptical**:
   - Don't blindly accept change requests that seem problematic
   - Question vague feedback - ask for clarification
   - Verify technical feasibility with code research
   - Point out potential conflicts with existing plan phases
</quality-guidelines>

<quality-guidelines category="precision">
2. **Be Surgical**:
   - Make precise edits, not wholesale rewrites
   - Preserve good content that doesn't need changing
   - Only research what's necessary for the specific changes
   - Don't over-engineer the updates
</quality-guidelines>

<quality-guidelines category="thoroughness">
3. **Be Thorough**:
   - Read the entire existing plan before making changes
   - Research code patterns if changes require new technical understanding
   - Ensure updated sections maintain quality standards
   - Verify success criteria are still measurable
</quality-guidelines>

<quality-guidelines category="interactivity">
4. **Be Interactive**:
   - Confirm understanding before making changes
   - Show what you plan to change before doing it
   - Allow course corrections
   - Don't disappear into research without communicating
</quality-guidelines>

<quality-guidelines category="progress-tracking">
5. **Track Progress**:
   - Use TodoWrite to track update tasks if complex
   - Update todos as you complete research
   - Mark tasks complete when done
</quality-guidelines>

<anti-pattern name="open-questions">
6. **No Open Questions**:
   - If the requested change raises questions, ASK
   - Research or get clarification immediately
   - Do NOT update the plan with unresolved questions
   - Every change must be complete and actionable
</anti-pattern>

</quality-guidelines>

## Success Criteria Guidelines

<structured-output purpose="success-criteria-format">
When updating success criteria, always maintain the two-category structure:

1. **Automated Verification** (can be run by execution agents):
   - Commands that can be run: `make test`, `npm run lint`, etc.
   - Specific files that should exist
   - Code compilation/type checking

2. **Manual Verification** (requires human testing):
   - UI/UX functionality
   - Performance under real conditions
   - Edge cases that are hard to automate
   - User acceptance criteria
</structured-output>

## Sub-task Spawning Best Practices

<research-delegation>
When spawning research sub-tasks:

1. **Only spawn if truly needed** - don't research for simple changes
2. **Spawn multiple tasks in parallel** for efficiency
3. **Each task should be focused** on a specific area
4. **Provide detailed instructions** including:
   - Exactly what to search for
   - Which directories to focus on
   - What information to extract
   - Expected output format
5. **Request specific file:line references** in responses
6. **Wait for all tasks to complete** before synthesizing
7. **Verify sub-task results** - if something seems off, spawn follow-up tasks
</research-delegation>

## Example Interaction Flows

<example-scenario name="complete-upfront">
**Scenario 1: User provides everything upfront**
```
User: /iterate_plan thoughts/shared/plans/2025-10-16-feature.md - add phase for error handling
Assistant: [Reads plan, researches error handling patterns, updates plan]
```
</example-scenario>

<example-scenario name="plan-only">
**Scenario 2: User provides just plan file**
```
User: /iterate_plan thoughts/shared/plans/2025-10-16-feature.md
Assistant: I've found the plan. What changes would you like to make?
User: Split Phase 2 into two phases - one for backend, one for frontend
Assistant: [Proceeds with update]
```
</example-scenario>

<example-scenario name="no-arguments">
**Scenario 3: User provides no arguments**
```
User: /iterate_plan
Assistant: Which plan would you like to update? Please provide the path...
User: thoughts/shared/plans/2025-10-16-feature.md
Assistant: I've found the plan. What changes would you like to make?
User: Add more specific success criteria to phase 4
Assistant: [Proceeds with update]
```
</example-scenario>
