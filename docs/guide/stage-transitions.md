# Stage Transitions

PAW workflows consist of multiple stages, and navigating between them is a key part of the development process. This guide explains how to work with the PAW agent for stage transitions, how review policies affect the flow, and how to check your progress.

## Working with the PAW Agent

The PAW agent is an intelligent orchestrator that understands natural language requests and routes them to appropriate skills. You can navigate stages using natural requests:

| Request Pattern | Skill Used | When to Use |
|-----------------|------------|-------------|
| "Create a spec for..." | `paw-spec` | Start or refine a specification |
| "Research how X works" | `paw-spec-research` or `paw-code-research` | Answer research questions (context-dependent) |
| "Create an implementation plan" | `paw-planning` | Create an implementation plan |
| "Implement phase N" | `paw-implement` | Execute an implementation phase |
| "Review my changes" | `paw-impl-review` | Verify and push implementation |
| "Create the final PR" | `paw-pr` | Create the final pull request |
| "What's the status?" | `paw-status` | Check workflow progress |

### Context-Sensitive Routing

The PAW agent adapts based on your current workflow position:

- **Research requests**: Routes to spec research from the Spec stage, or code research from planning stages
- **Implement requests**: Auto-detects the current phase from `ImplementationPlan.md`
- **Non-linear requests**: "Update spec to align with plan changes" routes appropriately

### The `continue` Command

When you want to proceed to the default next stage, simply type:

```
continue
```

This tells the PAW agent to proceed to the recommended next activity.

## Review Policies

PAW supports three review policies that control when the workflow pauses for human review at artifact boundaries:

### Always Review Policy

In `always` mode, the workflow pauses after every artifact is produced for potential iteration.

**Best for:**

- Learning PAW workflows
- Complex work requiring careful review between stages
- Situations where you want to pause and think between stages

### Milestones Review Policy (Default)

In `milestones` mode, the workflow pauses only at key milestone artifacts:

**Pauses at (milestone artifacts):**

- Spec.md (after specification is created)
- ImplementationPlan.md (after plan is created)
- Phase PR completion (after each phase PR is opened)
- Final PR creation

**Auto-proceeds at (non-milestone artifacts):**

- WorkflowContext.md
- SpecResearch.md
- CodeResearch.md
- Docs.md (part of implementation phase)
- Intermediate commits

**Best for:**

- Experienced PAW users who want speed with control at key points
- Most production workflows

### Planning-Only Review Policy

In `planning-only` mode, the workflow pauses at specification and implementation plan milestones, then proceeds autonomously through all implementation phases until the final PR.

**Pauses at:**

- Spec.md (after specification is created)
- ImplementationPlan.md (after plan is created)
- Final PR creation

**Auto-proceeds at:**

- Phase completions (unlike `milestones` policy)
- All non-milestone artifacts

!!! warning "Local Strategy Required"
    The `planning-only` review policy requires **local review strategy**. It's incompatible with PRs strategy because intermediate PR reviews require human decisions.

**Best for:**

- Users who want to review plans upfront, then trust autonomous execution
- Well-specified work where planning review is sufficient
- Workflows where phase-level interruptions slow progress unnecessarily

### Never Review Policy

In `never` mode, the workflow proceeds continuously without review pauses.

!!! warning "Local Strategy Required"
    The `never` review policy requires **local review strategy**. It's incompatible with PRs strategy because intermediate PR reviews require human decisions.

**Best for:**

- Routine, well-understood tasks
- When you trust the workflow to proceed without intervention

## Setting Your Review Policy

Review policy is set during workflow initialization and stored in `WorkflowContext.md`:

```markdown
# WorkflowContext

Work Title: Auth System
Work ID: auth-system
Target Branch: feature/auth-system
Workflow Mode: full
Review Strategy: prs
Review Policy: milestones    # ← Your review policy
Session Policy: per-stage
...
```

To change the policy for an existing workflow, edit `WorkflowContext.md` directly.

## Inline Instructions

You can customize activity behavior by adding instructions to your requests:

```
implement Phase 2 but add rate limiting
```

```
continue but focus on error handling
```

```
research but skip external dependencies
```

The additional context is passed to the target skill as part of the delegation.

## Capturing Phase Candidates

During implementation, you may realize additional work is needed that wasn't in the original plan. Instead of stopping to define a full phase, you can quickly capture the idea:

```
note: we should also refactor the auth module
```

```
capture candidate: add caching for the API responses
```

```
this would be cleaner if we extracted a helper function - add that as a candidate
```

The agent appends a one-liner to the `## Phase Candidates` section in `ImplementationPlan.md` and continues the current phase without interruption.

When all planned phases complete, you'll be prompted to decide on each candidate:

- **Promote** — Elaborate into a full phase with code research and planning
- **Skip** — Mark as skipped and proceed to Final PR
- **Defer** — Mark as deferred for future work outside this workflow

## Checking Workflow Status

At any point, you can check your workflow progress:

### Via Natural Request

Ask "what's the status?" or "where am I?" to get a comprehensive report:

- Completed artifacts
- Current phase progress
- Git branch status
- PR states and review comments
- Recommended next steps

### Via Command Palette

Use **PAW: Get Work Status** for a quick status check with work item selection.

### What Status Reports Include

The `paw-status` skill analyzes:

1. **Artifact Inventory**: Which files exist (Spec.md, ImplementationPlan.md, etc.)
2. **Phase Progress**: Current implementation phase and completion status
3. **Git State**: Branch, commits ahead/behind, uncommitted changes
4. **PR Analysis**: Open PRs, review comments needing attention
5. **Recommended Actions**: Clear next steps based on current state

## Handling PR Review Comments

When using the **PRs strategy**, pull requests may receive review comments that need addressing:

| PR Type | Request | Skills Involved |
|---------|---------|-----------------|
| Planning PR | "address PR comments" | `paw-planning` |
| Phase PR | "address PR comments" | `paw-implement` → `paw-impl-review` |
| Final PR | "address PR comments" | `paw-implement` → `paw-impl-review` |

The PAW agent routes to the appropriate skill based on which PR has pending comments.

## Multi-Work-Item Management

When working on multiple features simultaneously:

```
What PAW work items do I have?
```

The `paw-status` skill lists all workflows sorted by most recently modified, showing:

- Work Title
- Work ID
- Last modified time
- Current stage

