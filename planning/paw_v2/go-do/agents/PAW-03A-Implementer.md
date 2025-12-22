# PAW-03A Implementer Agent Analysis

## Category
**Core Workflow**

This agent is a **primary implementation stage** in the main development pipeline. It is the central execution engine that transforms approved plans into working code, driving the transition from planning to completed implementation phases.

## Current Responsibilities
- Implement approved technical plans phase-by-phase
- Read and understand `ImplementationPlan.md` and `CodeResearch.md` before starting
- Handle workflow mode variations: full (multi-phase), minimal (single-phase), custom
- Handle review strategy variations: prs (phase branches) vs local (target branch)
- Create and manage phase branches with correct naming conventions
- Run automated verification (tests, linting, type checking)
- Address PR review comments through focused, grouped commits
- Update `ImplementationPlan.md` with progress, phase status, and notes
- Distinguish between phase PRs and final PRs (different branch handling)
- Block on uncertainties rather than guessing or using placeholders
- Commit changes locally (never push—that's Review Agent's job)

## Artifacts Produced
- **Code changes** across repository files (as specified in implementation plan)
- **Git commits** with detailed messages (phase work or review comment responses)
- **ImplementationPlan.md updates** (checkboxes, phase summaries, review notes)
- Phase branches when using `prs` review strategy: `<feature-branch>_phase[N]`

## Dependencies
- **Inputs from**: 
  - `ImplementationPlan.md` (from PAW-02B Impl Planner)
  - `CodeResearch.md` (from PAW-02A Code Researcher)
  - `WorkflowContext.md` (workflow settings, target branch, mode, review strategy)
  - Optional: PR with review comments (when addressing feedback)
  - Optional: `Spec.md` and issue content for context
- **Outputs to**: PAW-03B Impl Reviewer (for PR creation, pushing, review replies)
- **Tools used**: 
  - Git operations (branch, checkout, add, commit, diff)
  - File reading/editing (implementation changes)
  - Terminal commands (running tests, linting, type checking)
  - `paw_get_context` and `paw_call_agent` (for handoff)

## Subagent Invocations
- **Does not invoke other agents** during implementation work
- **Hands off to PAW-03B Impl Reviewer** upon completing each phase
- Reviewer handles: pushing, PR creation, documentation polish, PR comment replies

## V2 Mapping Recommendation

### Suggested v2 home: **Workflow Skill** (Core implementation orchestration)

This agent is the **execution engine** of the development workflow. In v2, it should remain a core workflow component with high-level orchestration, but with extracted capabilities:

1. **Implementation Orchestrator** (Workflow level)
   - Phase-by-phase execution loop
   - Mode/strategy detection and branching logic
   - Handoff coordination with Review Agent
   - Progress tracking and artifact updates

### Subagent candidate: **No** (but should invoke subagents)

The Implementer itself should not become a subagent—it IS the workflow. However, it should be restructured to:
- Invoke capability skills for specific tasks
- Delegate review comment grouping/analysis
- Call verification skills after changes

### Skills to extract:

1. **Phase Branch Manager**
   - Input: Target branch, phase number, review strategy
   - Output: Correct branch created/checked out
   - Handles: `prs` vs `local` strategy, naming conventions, branch verification

2. **PR Review Comment Processor**
   - Input: PR URL/number, implementation plan
   - Output: Grouped TODO list with commit plan
   - Handles: Filtering already-addressed comments, grouping by logical units

3. **Automated Verification Runner**
   - Input: Success criteria from plan, phase context
   - Output: Verification results (pass/fail with details)
   - Handles: Tests, linting, type checking, custom criteria

4. **Selective Commit Builder**
   - Input: Files changed, group context, commit message template
   - Output: Clean commit with only related changes
   - Handles: Selective staging, unrelated file filtering, commit verification

5. **Implementation Plan Updater**
   - Input: Phase completed, notes, review tasks
   - Output: Updated ImplementationPlan.md with appended summaries
   - Handles: Checkbox marking, phase status, preserving prior content

6. **Blocking Issue Reporter**
   - Input: Expected vs found state, phase context
   - Output: Structured block notification (for human)
   - Handles: Plan/reality mismatches, missing prerequisites

## Lessons Learned

### Pattern: Workflow Mode Polymorphism
- **Insight**: Agent adapts behavior based on `full`, `minimal`, or `custom` workflow modes and `prs` vs `local` review strategies
- **V2 implication**: Workflow skills need mode awareness—consider mode as a first-class configuration parameter passed to skills
- **Key signal**: "Read Workflow Mode and Review Strategy from WorkflowContext.md at startup. Adapt your implementation approach..."

### Pattern: Implementation ↔ Review Separation
- **Insight**: Strict separation between "making code work" (Implementer) and "making code reviewable" (Reviewer)
- **V2 implication**: This is a healthy boundary—implementation skills should not include documentation/PR operations; those belong to review skills
- **Key signal**: "You DO NOT: Open PRs, reply to PR comments, or push branches"
- **Note**: The Implementer focuses on **forward momentum**, Reviewer focuses on **quality gate**

### Pattern: Phase-Aware Context Loading
- **Insight**: Agent loads different contexts for phase PRs vs final PRs (single phase vs all phases + spec + docs)
- **V2 implication**: Context-loading should be a skill that can be parameterized: single-phase-context vs full-context
- **Key signal**: "For Final PRs: Load context from all phases, Spec.md, and Docs.md"

### Pattern: Blocking Over Guessing
- **Insight**: Explicit "Block on Uncertainties" section—stop and ask rather than speculate
- **V2 implication**: Implementation skills should have clear failure modes that escalate to human rather than proceeding with partial/placeholder work
- **Key signal**: "DO NOT leave TODO comments, placeholder code, or speculative logic in place of real solutions"

### Pattern: Grouped Commit Strategy (for Review Feedback)
- **Insight**: Review comments are grouped into logical units, each becoming a focused commit
- **V2 implication**: "PR comment processor" is a distinct skill with its own logic for grouping, filtering, and commit planning
- **Key signal**: "Group review comments into commit groups... Each group should represent a coherent unit of work"

### Pattern: Never Push Discipline
- **Insight**: Implementer commits but never pushes—push is Review Agent's responsibility
- **V2 implication**: Workflow should enforce this boundary: implementation skill produces commits, review skill handles remote operations
- **Key signal**: "DO NOT push commits - the Implementation Review Agent will verify your changes and push after review"

### Anti-Pattern: Large Monolithic Agent
- **Insight**: This agent is ~350 lines with many conditional paths (mode, strategy, PR type)
- **V2 implication**: This is a strong candidate for decomposition—extract skills to reduce the main agent's complexity
- **Warning sign**: Multiple "### For X" sections that each describe a different workflow path

### Pattern: Artifact Update Discipline
- **Insight**: Explicit rules for minimal, idempotent artifact updates (only mark what's actually done)
- **V2 implication**: Artifact-updating skills need idempotency guarantees—re-running should produce no new diffs
- **Key signal**: "Re-running the same phase with identical results should produce no additional changes"
