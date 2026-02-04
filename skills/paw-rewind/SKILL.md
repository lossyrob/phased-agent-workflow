---
name: paw-rewind
description: Workflow rewind utility skill for PAW workflow. Rolls back workflow state to a previous stage or phase with safeguards and user confirmation.
---

# Workflow Rewind

> **Execution Context**: This skill runs **directly** in the PAW session (not a subagent)—requires user interaction for confirmation prompts.

Roll back workflow state to a previous stage or phase. Handles safeguard checks, action preview, and git reset upon user confirmation.

> **Reference**: Follow Core Implementation Principles from `paw-workflow` skill.

## Capabilities

- Parse rewind target from natural language (spec, planning, phase N, start)
- Detect current workflow state using `paw-status` patterns
- Identify target commit for rewind point
- Check safeguards (uncommitted changes, unpushed commits, orphaned PRs)
- Present itemized action preview grouped by category
- Execute rewind via git reset on user confirmation
- Close orphaned PRs (PRs strategy) with explanatory comment

## Rewind Targets

| Target | Description | Resets to |
|--------|-------------|-----------|
| `start` | Reset to initialization | After WorkflowContext.md created |
| `spec` | Reset to post-specification | After Spec.md created (full mode only) |
| `planning` | Reset to post-research | After CodeResearch.md created |
| `phase N` | Reset to post-phase N | After Phase N completed |

**Target aliases**: "go back to spec", "rewind to planning", "reset to phase 2", "roll back to start"

## Procedure

### 1. Parse Rewind Target

Map user request to target:
- "spec", "specification" → `spec`
- "planning", "plan", "research" → `planning`
- "phase 1", "phase one", "p1" → `phase 1`
- "start", "beginning", "init" → `start`

If target unclear, ask user to clarify with available options.

### 2. Validate Target

Check target is reachable from current state:
- `spec` requires full mode (minimal mode has no spec stage)
- `phase N` requires ImplementationPlan.md with at least N phases
- Target must be before current stage (can't rewind forward)

If invalid, report error with available rewind targets.

### 3. Detect Current State

Use `paw-status` patterns to determine:
- WorkflowContext.md for configuration (mode, strategy)
- Current stage from artifact existence
- Phase progress from ImplementationPlan.md
- Git branch and status

### 4. Identify Target Commit

Find the commit representing the rewind point:

```bash
# Find commit where artifact was added
git log --oneline --diff-filter=A -- .paw/work/<work-id>/<artifact> | head -1
```

| Target | Artifact to search |
|--------|-------------------|
| `start` | WorkflowContext.md |
| `spec` | Spec.md |
| `planning` | CodeResearch.md |
| `phase N` | Search for phase completion commit message pattern |

For phase targets, search commit messages:
```bash
git log --oneline --grep="Phase N" --grep="phase N" | head -1
```

If target commit not found, report error with available recovery options.

### 5. Safeguard Checks

Before any destructive action, check and warn about:

**Uncommitted changes**:
```bash
git status --porcelain
```
If non-empty, list files and require confirmation.

**Unpushed commits**:
```bash
git rev-list @{u}..HEAD --count 2>/dev/null || echo "0"
```
If > 0, report count and require confirmation.

**Orphaned PRs** (PRs strategy only):
Query PRs with head branches matching `<target>_phase*` patterns that would be orphaned by rewind. List PR numbers/URLs.

### 6. Action Preview

Present itemized preview grouped by category:

```
Rewind to: planning (after CodeResearch.md)
Target commit: abc1234

Actions to be performed:

📁 Git Reset:
   - Reset to commit abc1234
   - Removes: ImplementationPlan.md, all phase changes

🔗 PRs to Close (PRs strategy):
   - #42: [Feature] Phase 1 implementation
   - #43: [Feature] Phase 2 implementation

⚠️ Warnings:
   - 3 uncommitted files will be discarded
   - 5 unpushed commits will be removed

Continue with rewind? [yes/no]
```

### 7. Execute Rewind

On user confirmation:

1. **Close orphaned PRs** (PRs strategy):
   - Close each PR with comment: "Workflow rewound to {target}. This PR is no longer applicable."
   - If close fails, prompt user to close manually with direct link

2. **Git reset**:
   ```bash
   git reset --hard <target-commit>
   ```

3. **Report completion**:
   - What was reverted
   - Current state after rewind
   - Recommended next step

### 8. Cancellation

If user declines confirmation:
- Report "Rewind cancelled. No changes made."
- Workflow continues at current state

## Edge Cases

**Already at target**: Report "Already at {target} stage. No rewind needed." and exit.

**Minimal mode + spec target**: Report error: "Spec stage not available in minimal workflow mode. Available targets: planning, start"

**No commit found**: Report error with manual recovery guidance: "Could not identify target commit. You may need to manually reset using `git log` to find the appropriate commit."

**PR close fails**: Prompt user: "Could not close PR #42 automatically. Please close manually: {url}"

## Guardrails

- Never execute destructive operations without explicit user confirmation
- Never rewind without showing action preview first
- Never assume commit exists—always verify
- Never modify files outside of git reset operation
- Be idempotent: cancelled rewind leaves state unchanged

## Completion Response

Report:
- Rewind status (completed/cancelled/error)
- If completed: target reached, commit hash, files reverted
- Current workflow stage after rewind
- Recommended next action
- Any manual steps required (e.g., PRs to close manually)
