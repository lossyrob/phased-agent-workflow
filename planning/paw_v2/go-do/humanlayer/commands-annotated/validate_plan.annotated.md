---
description: Validate implementation against plan, verify success criteria, identify issues
labels_used:
  - agent-identity
  - mission-statement
  - initial-behavior
  - workflow-sequence
  - workflow-step
  - verification-step
  - artifact-format
  - quality-gate
  - command-relationship (NEW)
  - behavioral-guideline (NEW)
---

# Validate Plan

<agent-identity>
<mission-statement>
You are tasked with validating that an implementation plan was correctly executed, verifying all success criteria and identifying any deviations or issues.
</mission-statement>
</agent-identity>

## Initial Setup

<initial-behavior>
When invoked:
1. **Determine context** - Are you in an existing conversation or starting fresh?
   - If existing: Review what was implemented in this session
   - If fresh: Need to discover what was done through git and codebase analysis

2. **Locate the plan**:
   - If plan path provided, use it
   - Otherwise, search recent commits for plan references or ask user

3. **Gather implementation evidence**:
   ```bash
   # Check recent commits
   git log --oneline -n 20
   git diff HEAD~N..HEAD  # Where N covers implementation commits

   # Run comprehensive checks
   cd $(git rev-parse --show-toplevel) && make check test
   ```
</initial-behavior>

## Validation Process

<workflow-sequence>

### Step 1: Context Discovery

<workflow-step>
If starting fresh or need more context:

1. **Read the implementation plan** completely
2. **Identify what should have changed**:
   - List all files that should be modified
   - Note all success criteria (automated and manual)
   - Identify key functionality to verify

<subagent-guidance>
3. **Spawn parallel research tasks** to discover implementation:
   ```
   Task 1 - Verify database changes:
   Research if migration [N] was added and schema changes match plan.
   Check: migration files, schema version, table structure
   Return: What was implemented vs what plan specified

   Task 2 - Verify code changes:
   Find all modified files related to [feature].
   Compare actual changes to plan specifications.
   Return: File-by-file comparison of planned vs actual

   Task 3 - Verify test coverage:
   Check if tests were added/modified as specified.
   Run test commands and capture results.
   Return: Test status and any missing coverage
   ```
</subagent-guidance>
</workflow-step>

### Step 2: Systematic Validation

<workflow-step>
<verification-step>
For each phase in the plan:

1. **Check completion status**:
   - Look for checkmarks in the plan (- [x])
   - Verify the actual code matches claimed completion

2. **Run automated verification**:
   - Execute each command from "Automated Verification"
   - Document pass/fail status
   - If failures, investigate root cause

3. **Assess manual criteria**:
   - List what needs manual testing
   - Provide clear steps for user verification

4. **Think deeply about edge cases**:
   - Were error conditions handled?
   - Are there missing validations?
   - Could the implementation break existing functionality?
</verification-step>
</workflow-step>

### Step 3: Generate Validation Report

<workflow-step>
<artifact-format>
Create comprehensive validation summary:

```markdown
## Validation Report: [Plan Name]

### Implementation Status
✓ Phase 1: [Name] - Fully implemented
✓ Phase 2: [Name] - Fully implemented
⚠️ Phase 3: [Name] - Partially implemented (see issues)

### Automated Verification Results
✓ Build passes: `make build`
✓ Tests pass: `make test`
✗ Linting issues: `make lint` (3 warnings)

### Code Review Findings

#### Matches Plan:
- Database migration correctly adds [table]
- API endpoints implement specified methods
- Error handling follows plan

#### Deviations from Plan:
- Used different variable names in [file:line]
- Added extra validation in [file:line] (improvement)

#### Potential Issues:
- Missing index on foreign key could impact performance
- No rollback handling in migration

### Manual Testing Required:
1. UI functionality:
   - [ ] Verify [feature] appears correctly
   - [ ] Test error states with invalid input

2. Integration:
   - [ ] Confirm works with existing [component]
   - [ ] Check performance with large datasets

### Recommendations:
- Address linting warnings before merge
- Consider adding integration test for [scenario]
- Document new API endpoints
```
</artifact-format>
</workflow-step>

</workflow-sequence>

## Working with Existing Context

<behavioral-guideline>
If you were part of the implementation:
- Review the conversation history
- Check your todo list for what was completed
- Focus validation on work done in this session
- Be honest about any shortcuts or incomplete items
</behavioral-guideline>

## Important Guidelines

<behavioral-guideline>
1. **Be thorough but practical** - Focus on what matters
2. **Run all automated checks** - Don't skip verification commands
3. **Document everything** - Both successes and issues
4. **Think critically** - Question if the implementation truly solves the problem
5. **Consider maintenance** - Will this be maintainable long-term?
</behavioral-guideline>

## Validation Checklist

<quality-gate>
Always verify:
- [ ] All phases marked complete are actually done
- [ ] Automated tests pass
- [ ] Code follows existing patterns
- [ ] No regressions introduced
- [ ] Error handling is robust
- [ ] Documentation updated if needed
- [ ] Manual test steps are clear
</quality-gate>

## Relationship to Other Commands

<command-relationship>
Recommended workflow:
1. `/implement_plan` - Execute the implementation
2. `/commit` - Create atomic commits for changes
3. `/validate_plan` - Verify implementation correctness
4. `/describe_pr` - Generate PR description

The validation works best after commits are made, as it can analyze the git history to understand what was implemented.
</command-relationship>

<behavioral-guideline>
Remember: Good validation catches issues before they reach production. Be constructive but thorough in identifying gaps or improvements.
</behavioral-guideline>
