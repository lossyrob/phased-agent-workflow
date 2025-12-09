# Stage Transitions

PAW workflows consist of multiple stages, and navigating between them is a key part of the development process. This guide explains how to transition between stages using commands, how handoff modes affect the flow, and how to check your progress.

## Stage Transition Commands

When a PAW agent completes its work, it presents actionable next steps. Use these commands to navigate:

| Command | Target Agent | When to Use |
|---------|--------------|-------------|
| `spec` | Specification Agent | Start or refine a specification |
| `research` | Spec Researcher or Code Researcher | Answer research questions (context-dependent) |
| `plan` | Implementation Planner | Create an implementation plan |
| `implement` | Implementer | Execute an implementation phase |
| `review` | Implementation Reviewer | Verify and push implementation |
| `docs` | Documenter | Create documentation |
| `pr` | Final PR Agent | Create the final pull request |
| `status` | Status Agent | Check workflow progress |

### Context-Sensitive Commands

Some commands adapt to your current workflow position:

- **`research`**: Maps to Spec Researcher from the Spec stage, or Code Researcher from planning stages
- **`implement`**: Auto-detects the current phase from `ImplementationPlan.md`

### The `continue` Command

When you want to proceed to the default next stage (what auto mode would do), simply type:

```
continue
```

This is useful in Manual mode when the recommended next step is obvious and you don't want to type the full command.

## Handoff Modes

PAW supports three handoff modes that control how stage transitions are handled:

### Manual Mode (Default)

In Manual mode, you have full control over every transition. After each stage completes, the agent presents options and waits for your command.

**Best for:**

- Learning PAW workflows
- Complex work requiring careful review between stages
- Situations where you want to pause and think between stages

### Semi-Auto Mode

Semi-Auto mode automatically proceeds at routine transitions but pauses at decision points:

**Auto-proceeds at:**

- Spec → Spec Research (when research is needed)
- Spec Research → back to Spec Agent
- Code Research → Implementation Planner

**Pauses at:**

- Before Code Research (after Spec is finalized)
- Before Implementation Phase 1
- Before each subsequent Phase (N+1)
- Before Documentation
- Before Final PR

**Best for:**

- Experienced PAW users who want speed with control at key points
- Most production workflows

### Auto Mode

Auto mode chains through all stages automatically, only stopping for tool approvals.

!!! warning "Local Strategy Required"
    Auto mode requires **local review strategy**. It's incompatible with PRs strategy because intermediate PR reviews require human decisions.

**Best for:**

- Routine, well-understood tasks
- When you trust the workflow to proceed without intervention

## Setting Your Handoff Mode

Handoff mode is set during workflow initialization and stored in `WorkflowContext.md`:

```markdown
# WorkflowContext

Work Title: Auth System
Feature Slug: auth-system
Target Branch: feature/auth-system
Workflow Mode: full
Review Strategy: prs
Handoff Mode: semi-auto    # ← Your handoff mode
...
```

To change the mode for an existing workflow, edit `WorkflowContext.md` directly.

## Inline Instructions

You can customize stage behavior without creating prompt files by adding instructions inline:

```
implement Phase 2 but add rate limiting
```

```
continue but focus on error handling
```

```
research but skip external dependencies
```

The text after "but" or "with" is passed to the target agent as additional context.

## Checking Workflow Status

At any point, you can check your workflow progress:

### Via Command

Type `status` or ask "where am I?" to get a comprehensive report:

- Completed artifacts
- Current phase progress
- Git branch status
- PR states and review comments
- Recommended next steps

### Via Command Palette

Use **PAW: Get Work Status** for a quick status check with work item selection.

### What Status Reports Include

The Status Agent analyzes:

1. **Artifact Inventory**: Which files exist (Spec.md, ImplementationPlan.md, etc.)
2. **Phase Progress**: Current implementation phase and completion status
3. **Git State**: Branch, commits ahead/behind, uncommitted changes
4. **PR Analysis**: Open PRs, review comments needing attention
5. **Recommended Actions**: Clear next steps based on current state

## Handling PR Review Comments

When using the **PRs strategy**, pull requests may receive review comments that need addressing:

| PR Type | Command | Agents Involved |
|---------|---------|-----------------|
| Planning PR | `address comments` | Implementation Planner |
| Phase PR | `address comments` | Implementer → Reviewer |
| Docs PR | `address comments` | Documenter |
| Final PR | `address comments` | Implementer → Reviewer |

The system routes you to the appropriate agent based on which PR has pending comments.

## Generating Custom Prompts

When you need deep customization for a specific stage, generate a prompt file:

```
generate prompt for implementer Phase 3
```

This creates a file at `.paw/work/<slug>/prompts/03A-implement-phase3.prompt.md` that you can edit before executing.

## Multi-Work-Item Management

When working on multiple features simultaneously:

```
What PAW work items do I have?
```

The Status Agent lists all workflows sorted by most recently modified, showing:

- Work Title
- Work ID (feature slug)
- Last modified time
- Current stage
