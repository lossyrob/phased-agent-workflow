# Exclude PAW Artifacts

## Overview

This feature enables PAW users to exclude workflow artifacts from git tracking while preserving local access. Developers benefit from PAW's structured workflow even when committing artifacts would be counterproductive—such as contributing to non-PAW repositories or making lightweight changes where artifacts represent disproportionate overhead.

Two mechanisms support artifact exclusion:

1. **Upfront decision during initialization** — Select "Don't Track" at the artifact tracking prompt
2. **Mid-workflow escape hatch** — Run "PAW: Stop Tracking Artifacts" command to switch after artifacts are already committed

The implementation uses a simple convention: a `.gitignore` file in the workflow directory (`.paw/work/<work-id>/.gitignore`) containing `*` serves as both the mechanism and indicator for artifact exclusion. Agents check for this file to determine commit behavior.

## Architecture and Design

### Design Decisions

**Filesystem marker pattern**: The presence of `.paw/work/<work-id>/.gitignore` is the sole indicator for tracking preference. This approach:
- Requires no schema changes to WorkflowContext.md
- Is discoverable and debuggable (users can inspect the file)
- Portable across git workflows (standard git behavior)
- Self-documenting (the mechanism is the indicator)

**Agent-based command execution**: The "Stop Tracking Artifacts" command follows PAW's architecture philosophy—agents provide decision-making logic, tools provide procedural operations. Rather than hardcoding git commands in TypeScript, the command opens a chat with an agent that executes the git operations.

**Separate tracking from commits**: Code changes continue committing normally regardless of artifact tracking preference. Only `.paw/` workflow artifacts are affected.

### Component Changes

| Component | Change |
|-----------|--------|
| `src/ui/userInput.ts` | Added `collectArtifactTracking()` function and `trackArtifacts` field |
| `src/prompts/workflowInitPrompt.ts` | Added `TRACK_ARTIFACTS` and `ARTIFACT_TRACKING_SECTION` template variables |
| `src/prompts/workItemInitPrompt.template.md` | Added conditional commit logic for artifact tracking |
| `src/commands/stopTrackingArtifacts.ts` | New command for mid-workflow tracking toggle |
| `src/utils/workItemScanner.ts` | Extracted shared utility for work item scanning |
| `agents/PAW-02B Impl Planner.agent.md` | Added `.gitignore` checks at three artifact staging locations |
| `agents/PAW-04 Documenter.agent.md` | Added `.gitignore` checks at two documentation staging locations |

### Integration Points

The artifact tracking preference flows through:

1. **UI collection** → `collectArtifactTracking()` returns boolean
2. **Prompt construction** → `constructAgentPrompt()` includes tracking variables
3. **Initialization agent** → Creates `.gitignore` when "Don't Track" selected
4. **Downstream agents** → Check for `.gitignore` before staging artifacts

## User Guide

### Choosing Artifact Tracking at Initialization

When running "PAW: New PAW Workflow", after selecting handoff mode, you'll see:

| Option | Description |
|--------|-------------|
| **Track** (default) | Standard PAW behavior—artifacts visible in PRs and version history |
| **Don't Track** | Artifacts stay local only, excluded from git |

**When to choose "Don't Track":**
- Contributing to repositories that don't use PAW
- Making quick bug fixes where artifacts are disproportionate overhead
- External contributions where maintainers may find artifacts unexpected

### Stopping Tracking Mid-Workflow

If you discover mid-workflow that artifact tracking is unnecessary:

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run **"PAW: Stop Tracking Artifacts"**
3. Select your work item from the list
4. An agent session opens and executes the git commands

The command:
- Untracks committed artifacts from git index (keeps files locally)
- Creates `.gitignore` in the workflow directory
- Stages the new `.gitignore` file

**Note**: Previously committed artifacts remain in git history. This command only affects future commits.

### Verifying Artifact Exclusion

After enabling artifact exclusion, verify with:

```bash
# Check .gitignore exists
cat .paw/work/<work-id>/.gitignore
# Should output: *

# Verify artifacts are untracked
git status
# Should not show .paw/work/<work-id>/ files as tracked or staged
```

## Technical Reference

### Artifact Tracking Detection

Agents check for artifact exclusion by testing file existence:

```
Check if `.paw/work/<feature-slug>/.gitignore` exists:
- If exists → skip staging `.paw/` artifacts
- If absent → proceed with normal artifact staging
```

### Stop Tracking Command

The command constructs a query for the agent to execute:

```typescript
const query = `Stop tracking PAW artifacts for Work ID: ${selection.slug}

Execute the following git commands:
1. git rm --cached -r .paw/work/${selection.slug}/
2. echo '*' > .paw/work/${selection.slug}/.gitignore
3. git add .paw/work/${selection.slug}/.gitignore
`;
```

**Idempotency**: The command checks for existing `.gitignore` before proceeding and displays a warning if artifacts are already excluded.

### Affected Agents

| Agent | Locations Modified |
|-------|-------------------|
| PAW-02B Impl Planner | PR review response staging, prs strategy completion, local strategy completion |
| PAW-04 Documenter | prs strategy staging, local strategy staging |

Other agents (PAW-01A, PAW-01B, PAW-02A, PAW-03A, PAW-03B, PAW-05) don't commit workflow artifacts and require no modification.

## Edge Cases and Limitations

### Handled Edge Cases

- **No active workflows**: Command displays informative warning
- **Already excluded**: Command detects existing `.gitignore` and shows warning (idempotent)
- **Multiple workflows**: User selects which workflow to stop tracking

### Limitations

- **No "Re-enable Tracking" command**: Manually delete `.gitignore` and stage artifacts if needed
- **History not rewritten**: Previously committed artifacts remain in git history
- **Per-workflow only**: No global/workspace-level default for artifact tracking
- **All-or-nothing**: Cannot selectively track some artifacts but not others

## Testing Guide

### How to Test Artifact Exclusion at Initialization

1. Run "PAW: New PAW Workflow" 
2. Complete prompts until "Artifact Tracking" appears
3. Select "Don't Track"
4. Complete initialization
5. Verify:
   - `.paw/work/<work-id>/.gitignore` exists containing `*`
   - `git status` shows no `.paw/` files staged
   - WorkflowContext.md exists locally but isn't committed

### How to Test Mid-Workflow Stop Tracking

1. Initialize a workflow with "Track" selected
2. Complete at least one phase to commit artifacts
3. Run "PAW: Stop Tracking Artifacts"
4. Select your work item
5. Let the agent execute git commands
6. Verify:
   - `.gitignore` created with `*`
   - Artifacts untracked (`git status` shows deletion from index)
   - Files still exist on filesystem
   - Future phases don't include artifacts in commits

### How to Test Agent Behavior

1. Create `.paw/work/<work-id>/.gitignore` manually with content `*`
2. Run a PAW agent that would normally commit artifacts (e.g., Impl Planner completing planning phase)
3. Verify the agent skips artifact staging while still committing code changes

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/130
- Specification: [.paw/work/exclude-paw-artifacts/Spec.md](Spec.md)
- Implementation Plan: [.paw/work/exclude-paw-artifacts/ImplementationPlan.md](ImplementationPlan.md)
