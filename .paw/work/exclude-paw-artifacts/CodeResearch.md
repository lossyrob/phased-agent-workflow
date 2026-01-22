---
date: 2026-01-21T22:12:55-05:00
git_commit: 31aac4aee11bd7c660ffbc0407a82bd20f0bb67f
branch: feature/130-exclude-paw-artifacts
repository: phased-agent-workflow
topic: "Exclude PAW Artifacts from Git Tracking Implementation"
tags: [research, codebase, user-input, commands, prompts, agents, git-operations]
status: complete
last_updated: 2026-01-21
---

# Research: Exclude PAW Artifacts from Git Tracking

**Date**: 2026-01-21 22:12:55 EST
**Git Commit**: 31aac4aee11bd7c660ffbc0407a82bd20f0bb67f
**Branch**: feature/130-exclude-paw-artifacts
**Repository**: phased-agent-workflow

## Research Question

Where and how should artifact tracking control be implemented? Document the exact locations for:
1. Adding artifact tracking prompt to workflow initialization
2. Creating "PAW: Stop Tracking Artifacts" command
3. Modifying agent prompts to check for `.gitignore` before committing artifacts

## Summary

This research documents the implementation locations for the artifact tracking exclusion feature. The feature requires changes at four points: (1) user input collection in `userInput.ts`, (2) prompt template construction in `workflowInitPrompt.ts`, (3) initialization prompt template instructions in `workItemInitPrompt.template.md`, (4) a new VS Code command, and (5) agent instruction updates in three agent files. The codebase uses consistent patterns for Quick Pick menus, command registration, and template variable substitution that the new feature can follow.

## Detailed Findings

### 1. User Input Collection Flow

The workflow initialization sequence is defined in [src/ui/userInput.ts](src/ui/userInput.ts).

**Current prompt sequence** (from `collectUserInputs` function at line 247-362):
1. Issue URL (optional) - line 276
2. Branch name (optional) - line 294
3. Workflow mode - line 338
4. Review strategy - line 344
5. Handoff mode - line 350

**Insertion point for artifact tracking prompt**: After handoff mode selection (per Spec.md FR-001), at approximately line 354 in `collectUserInputs()`.

**Pattern to follow** - see `collectHandoffMode()` at lines 198-238:
```typescript
// Quick Pick with descriptive options
const modeSelection = await vscode.window.showQuickPick([
  {
    label: "Track",
    description: "Workflow artifacts committed to git (default)",
    detail: "Standard PAW behavior—artifacts visible in PRs and version history",
    value: true,
  },
  {
    label: "Don't Track",
    description: "Exclude workflow artifacts from git",
    detail: "For external contributions or lightweight changes—artifacts stay local only",
    value: false,
  }
], {
  placeHolder: "Select artifact tracking behavior",
  title: "Artifact Tracking",
});
```

**Interface update needed** - `WorkItemInputs` at lines 42-62 needs new field:
```typescript
/** Whether to track workflow artifacts in git (true) or exclude them (false) */
trackArtifacts: boolean;
```

### 2. Prompt Template Construction

The initialization prompt is constructed in [src/prompts/workflowInitPrompt.ts](src/prompts/workflowInitPrompt.ts).

**Template variable system** - `PromptVariables` interface at lines 17-51 defines all substitution variables. Add:
```typescript
/** Whether workflow artifacts should be committed to git */
TRACK_ARTIFACTS: string;
/** Conditional section for artifact commit instructions when tracking is disabled */
ARTIFACT_TRACKING_SECTION: string;
```

**Variable substitution** happens in `substituteVariables()` at lines 99-107. The function iterates over all variable entries and replaces `{{VAR_NAME}}` placeholders.

**Prompt construction** in `constructAgentPrompt()` at lines 149-258:
- Parameters already received include workflow mode, review strategy, handoff mode (line 149-155)
- Add `trackArtifacts: boolean` parameter
- Build conditional section:
```typescript
const artifactTrackingSection = trackArtifacts
  ? ''
  : `**IMPORTANT**: Artifact tracking is DISABLED. Do NOT commit workflow artifacts to git.
- Create the workflow directory structure locally
- Create WorkflowContext.md locally but do NOT git add or commit it
- Create .paw/work/<feature-slug>/.gitignore containing '*' to exclude all artifacts
`;
```

### 3. Initialization Prompt Template

The agent instructions are in [src/prompts/workItemInitPrompt.template.md](src/prompts/workItemInitPrompt.template.md).

**Parameters section** at lines 8-15 displays current inputs. Add:
```markdown
- **Track Artifacts**: {{TRACK_ARTIFACTS}}
```

**WorkflowContext.md generation** at lines 52-71 - this is unaffected as WorkflowContext.md is always written locally; the change is whether it gets committed.

**Artifact commit instruction** at lines 94-98:
```markdown
### 7. Commit WorkflowContext.md

After creating the workflow structure and checking out the target branch, commit the WorkflowContext.md file:

1. Stage the WorkflowContext.md file: `git add .paw/work/<feature-slug>/WorkflowContext.md`
2. Create an initial commit with message: `Initialize PAW workflow for <Work Title>`
```

**Required modification**: Add conditional section before step 7 based on `{{TRACK_ARTIFACTS}}`:
```markdown
{{ARTIFACT_TRACKING_SECTION}}
### 7. Commit WorkflowContext.md (Skip if artifacts not tracked)

If artifact tracking is enabled (default):
1. Stage the WorkflowContext.md file: `git add .paw/work/<feature-slug>/WorkflowContext.md`
2. Create an initial commit with message: `Initialize PAW workflow for <Work Title>`

If artifact tracking is disabled:
1. Skip committing WorkflowContext.md—it remains local only
2. Verify `.gitignore` exists in workflow directory with content `*`
```

### 4. Command Registration Pattern

The extension registers commands in [src/extension.ts](src/extension.ts).

**Existing command registration patterns**:

Pattern 1 - Direct registration (line 65-69):
```typescript
const initCommand = vscode.commands.registerCommand(
  'paw.initializeWorkItem',
  () => initializeWorkItemCommand(outputChannel)
);
context.subscriptions.push(initCommand);
```

Pattern 2 - Factory function (line 71):
```typescript
registerGetWorkStatusCommand(context, outputChannel);
```

**Factory function pattern** from [src/commands/getWorkStatus.ts](src/commands/getWorkStatus.ts#L247-L260):
```typescript
export function registerStopTrackingCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): void {
  const command = vscode.commands.registerCommand(
    'paw.stopTrackingArtifacts',
    () => stopTrackingArtifactsCommand(outputChannel)
  );
  context.subscriptions.push(command);
}
```

**Command implementation** should follow [src/commands/getWorkStatus.ts](src/commands/getWorkStatus.ts) pattern:

1. **Scan for work items** using `scanWorkItems()` pattern (lines 62-109) that:
   - Iterates workspace folders
   - Constructs path: `path.join(folder.uri.fsPath, '.paw', 'work')`
   - Reads directories containing `WorkflowContext.md`

2. **Present Quick Pick** with work items (lines 185-215)

3. **Execute git operations** for selected work item:
   - `git rm --cached -r .paw/work/<slug>/` (untrack without deleting)
   - Create `.gitignore` with content `*`

**Package.json contribution** - commands must be declared in `contributes.commands` array.

### 5. Agent Artifact Commit Locations

Three agents plus the initialization prompt contain instructions to commit artifacts:

#### PAW-02B Impl Planner

File: [agents/PAW-02B Impl Planner.agent.md](agents/PAW-02B%20Impl%20Planner.agent.md)

**Location 1** - PR review response mode (lines 49-53):
```markdown
     - Stage ONLY the changed files: `git add .paw/work/<feature-slug>/<file>`
```

**Location 2** - prs strategy completion (lines 279-283):
```markdown
   - Stage artifacts: `git add .paw/work/<feature-slug>/{Spec.md,SpecResearch.md,CodeResearch.md,ImplementationPlan.md}` and prompt files
```

**Location 3** - local strategy completion (lines 296-300):
```markdown
   - Stage ALL planning artifacts (including those from prior agents): `git add .paw/work/<feature-slug>/`
```

**Required change**: Add conditional check before each staging instruction:
```markdown
**Before staging artifacts, check for `.gitignore`**:
- If `.paw/work/<feature-slug>/.gitignore` exists: Skip artifact staging (artifacts not tracked)
- If no `.gitignore`: Proceed with normal artifact staging
```

#### PAW-03B Impl Reviewer

File: [agents/PAW-03B Impl Reviewer.agent.md](agents/PAW-03B%20Impl%20Reviewer.agent.md)

**Location** - Commit improvements section (lines 191-200):
```markdown
6. **Commit improvements**:
   - Commit documentation, polish changes, AND small refactors
   ...
   - **Selective staging**: Use `git add <file>` for each file
```

**Analysis**: This agent commits code changes (documentation, polish), not workflow artifacts. The `git add <file>` instructions refer to code files, not `.paw/` artifacts. However, during review it may touch files in the workflow directory.

**Required change**: Add clarification that code commits continue normally; only `.paw/` artifact commits should be skipped when `.gitignore` exists.

#### PAW-04 Documenter

File: [agents/PAW-04 Documenter.agent.md](agents/PAW-04%20Documenter.agent.md)

**Location 1** - prs strategy staging (lines 155-157):
```markdown
   - Stage ONLY documentation files modified: `git add <file1> <file2>` (Docs.md, README.md, CHANGELOG.md, etc.)
```

**Location 2** - local strategy staging (lines 172-174):
```markdown
   - Stage ONLY documentation files modified: `git add <file1> <file2>`
```

**Analysis**: The Documenter explicitly stages `Docs.md` (in `.paw/work/`) AND project docs (README.md, CHANGELOG.md). The artifact exclusion should skip `Docs.md` while still staging project documentation.

**Required change**: Split staging instruction:
```markdown
**Check for `.gitignore` before staging Docs.md**:
- If `.paw/work/<feature-slug>/.gitignore` exists:
  - Stage only project documentation: `git add README.md CHANGELOG.md` etc.
  - Skip staging Docs.md (artifact not tracked)
- If no `.gitignore`:
  - Stage all documentation including Docs.md
```

### 6. Workflow Directory Path Pattern

The path to workflow directories is computed consistently throughout the codebase:

```typescript
path.join(workspacePath, '.paw', 'work', featureSlug)
```

Locations:
- [src/commands/getWorkStatus.ts](src/commands/getWorkStatus.ts#L77): `path.join(folder.uri.fsPath, '.paw', 'work')`
- [src/tools/contextTool.ts](src/tools/contextTool.ts): `path.join(folderPath, '.paw', 'work', featureSlug)`
- [src/tools/promptGenerationTool.ts](src/tools/promptGenerationTool.ts): `path.join(workspacePath, '.paw', 'work', workId)`

The "Stop Tracking Artifacts" command can reuse this pattern.

## Code References

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| User input collection | [src/ui/userInput.ts](src/ui/userInput.ts) | 247-362 | `collectUserInputs()` - add artifact tracking prompt after handoff mode |
| Quick Pick pattern | [src/ui/userInput.ts](src/ui/userInput.ts) | 198-238 | `collectHandoffMode()` - pattern for artifact tracking prompt |
| WorkItemInputs interface | [src/ui/userInput.ts](src/ui/userInput.ts) | 42-62 | Add `trackArtifacts` field |
| PromptVariables interface | [src/prompts/workflowInitPrompt.ts](src/prompts/workflowInitPrompt.ts) | 17-51 | Add `TRACK_ARTIFACTS`, `ARTIFACT_TRACKING_SECTION` |
| Prompt construction | [src/prompts/workflowInitPrompt.ts](src/prompts/workflowInitPrompt.ts) | 149-258 | Add trackArtifacts parameter and conditional section |
| Init template params | [src/prompts/workItemInitPrompt.template.md](src/prompts/workItemInitPrompt.template.md) | 8-15 | Add Track Artifacts parameter display |
| Init template commit | [src/prompts/workItemInitPrompt.template.md](src/prompts/workItemInitPrompt.template.md) | 94-98 | Conditionalize WorkflowContext.md commit |
| Command registration | [src/extension.ts](src/extension.ts) | 65-71 | Pattern for new command registration |
| Work item scanning | [src/commands/getWorkStatus.ts](src/commands/getWorkStatus.ts) | 62-109 | Pattern for scanning work items |
| Planner artifact commits | [agents/PAW-02B Impl Planner.agent.md](agents/PAW-02B%20Impl%20Planner.agent.md) | 51, 281, 298 | Add `.gitignore` check before staging |
| Reviewer commits | [agents/PAW-03B Impl Reviewer.agent.md](agents/PAW-03B%20Impl%20Reviewer.agent.md) | 191-200 | Clarify artifact vs code commits |
| Documenter staging | [agents/PAW-04 Documenter.agent.md](agents/PAW-04%20Documenter.agent.md) | 155-157, 172-174 | Split Docs.md from project docs staging |

## Architecture Documentation

### Current Patterns

1. **User Input Pattern**: Sequential Quick Pick menus in `collectUserInputs()`, each returning undefined on cancel
2. **Template Substitution Pattern**: `{{VAR_NAME}}` placeholders replaced by `substituteVariables()`
3. **Command Pattern**: Factory functions that register commands and add to `context.subscriptions`
4. **Agent Instruction Pattern**: Markdown files with conditional logic sections

### New Pattern Required

**Filesystem marker pattern**: Agents check for `.paw/work/<feature-slug>/.gitignore` existence to determine artifact tracking behavior. This is a new pattern—existing agents check WorkflowContext.md fields but not arbitrary marker files.

Recommended implementation in agent instructions:
```markdown
**Check artifact tracking before committing**:
```bash
if [ -f ".paw/work/<feature-slug>/.gitignore" ]; then
  echo "Artifact tracking disabled - skipping artifact commits"
else
  git add .paw/work/<feature-slug>/...
fi
```
```

### Implementation Order

1. **Extension changes** (TypeScript):
   - Add `trackArtifacts` to `WorkItemInputs` interface
   - Add `collectArtifactTracking()` function
   - Update `collectUserInputs()` to call new function
   - Add template variables to `PromptVariables`
   - Update `constructAgentPrompt()` with conditional section
   - Create `stopTrackingArtifacts.ts` command
   - Register new command in `extension.ts`
   - Add command to `package.json`

2. **Prompt template changes**:
   - Update `workItemInitPrompt.template.md` with artifact tracking parameter and conditional commit section

3. **Agent instruction changes**:
   - Update PAW-02B with `.gitignore` check before artifact staging
   - Update PAW-03B with clarification on code vs artifact commits
   - Update PAW-04 with split staging logic for Docs.md vs project docs

## Open Questions

None. All implementation details are documented with specific file:line references.
