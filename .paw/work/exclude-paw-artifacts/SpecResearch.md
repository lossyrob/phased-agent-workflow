# Spec Research: Exclude PAW Artifacts

## Summary

Research confirms four PAW agents contain explicit instructions to commit workflow artifacts to git: PAW-02B Impl Planner, PAW-03B Impl Reviewer, PAW-04 Documenter, and the initialization prompt (which the Spec Agent invokes). The PAW-01A Specification, PAW-01B Spec Researcher, PAW-02A Code Researcher, PAW-03A Implementer, and PAW-05 PR agents do not commit artifacts directly. VS Code commands detect the active work ID by scanning `.paw/work/` directories for `WorkflowContext.md` files. The workflow directory path is computed inline via `path.join(folder.uri.fsPath, '.paw', 'work', featureSlug)` without a dedicated utility function. The workflow initialization template supports conditional sections via `{{VARIABLE}}` substitution. No existing patterns exist for agents checking filesystem markers like `.gitignore` to modify behavior.

## Agent Notes

The feature introduces artifact tracking control at two points:
1. During workflow initialization (new Quick Pick prompt)
2. Mid-workflow via a new command ("PAW: Stop Tracking Artifacts")

The Issue provides clear design direction:
- Use `.paw/work/<work-id>/.gitignore` with content `*` as the mechanism
- Prompt placement: after handoff mode selection in the initialization sequence
- Command implementation: `git rm --cached -r` followed by `.gitignore` creation

Key implementation files identified:
- `src/ui/userInput.ts` - User input collection including workflow initialization prompts
- `src/prompts/workflowInitPrompt.ts` - Constructs the agent prompt from collected inputs
- `src/commands/` - Contains existing VS Code command implementations

The specification needs to understand which agents commit artifacts so we can determine the scope of agent instruction updates needed.

## Research Findings

### Question 1: Which PAW agents contain instructions to commit, stage, or push workflow artifacts?

**Answer**: Four agents plus the initialization prompt contain explicit instructions to commit workflow artifacts:

1. **PAW-02B Impl Planner** - Contains the most extensive artifact commit instructions:
   - `git add .paw/work/<feature-slug>/<file>` for staging individual files during development
   - `git add .paw/work/<feature-slug>/{Spec.md,SpecResearch.md,CodeResearch.md,ImplementationPlan.md}` for prs strategy
   - `git add .paw/work/<feature-slug>/` for staging all planning artifacts in local strategy

2. **PAW-03B Impl Reviewer** - Commits documentation and polish changes:
   - `git add <file>` for selective staging including workflow artifacts
   - Pushes both implementation and artifact commits

3. **PAW-04 Documenter** - Commits documentation artifacts:
   - `git add <file1> <file2>` for Docs.md and other documentation files
   - Creates commits on docs branch (prs) or target branch (local)

4. **Workflow Initialization Prompt** (`workItemInitPrompt.template.md`) - Commits WorkflowContext.md:
   - `git add .paw/work/<feature-slug>/WorkflowContext.md` 
   - Creates initial commit with message: `Initialize PAW workflow for <Work Title>`

The following agents explicitly do NOT commit artifacts:
- **PAW-01A Specification**: States "Git add/commit/push operations" as explicit non-responsibility
- **PAW-01B Spec Researcher**: States "Do not commit changes" in guardrails
- **PAW-02A Code Researcher**: No commit instructions (outputs CodeResearch.md locally only)
- **PAW-03A Implementer**: Commits code changes but does NOT push; reviewer handles artifacts
- **PAW-05 PR**: Creates PRs but does not directly commit artifacts

**Evidence**: Agent files in `agents/` directory; grep search for git commit/stage/push patterns

**Implications**: Agent instruction updates needed for PAW-02B Impl Planner, PAW-03B Impl Reviewer, PAW-04 Documenter, and the initialization prompt template. These agents must check for `.gitignore` presence before committing artifacts.

### Question 2: How do existing VS Code commands detect and validate the current workflow context?

**Answer**: Two patterns are used:

1. **Directory Scanning** (`getWorkStatus.ts`):
   - Iterates through `vscode.workspace.workspaceFolders`
   - Constructs path via `path.join(folder.uri.fsPath, '.paw', 'work')`
   - Scans for subdirectories containing `WorkflowContext.md`
   - Returns work items sorted by modification time
   - Uses QuickPick to let user select or auto-detect

2. **Work ID Resolution** (`contextTool.ts` and `promptGenerationTool.ts`):
   - Accepts Work ID (feature slug) as input parameter
   - Searches workspace folders for matching `.paw/work/<featureSlug>/` directory
   - Validates directory existence before proceeding
   - Throws descriptive error if Work ID not found

The `initializeWorkItem.ts` command does NOT validate existing context—it creates new workflows and delegates context creation to the agent via the initialization prompt.

**Evidence**: `src/commands/getWorkStatus.ts`, `src/tools/contextTool.ts`, `src/tools/promptGenerationTool.ts`

**Implications**: The "Stop Tracking Artifacts" command should follow the directory scanning pattern from `getWorkStatus.ts` to detect active workflows and present a QuickPick for work item selection.

### Question 3: Does the workflow initialization prompt template accommodate new template variables?

**Answer**: Yes. The template uses `{{VARIABLE}}` substitution with a well-defined `PromptVariables` interface in `workflowInitPrompt.ts`.

Existing template variables include:
- `{{TARGET_BRANCH}}`, `{{BRANCH_MODE}}`, `{{WORKFLOW_MODE}}`
- `{{REVIEW_STRATEGY}}`, `{{HANDOFF_MODE}}`
- `{{CUSTOM_INSTRUCTIONS_SECTION}}`, `{{CUSTOM_INSTRUCTIONS_FIELD}}`
- `{{ISSUE_URL}}`, `{{ISSUE_URL_FIELD}}`
- `{{WORKSPACE_PATH}}`, `{{WORK_TITLE_STRATEGY}}`
- `{{CUSTOM_INSTRUCTIONS}}`, `{{BRANCH_AUTO_DERIVE_SECTION}}`
- `{{WORK_DESCRIPTION_SECTION}}`, `{{INITIAL_PROMPT_FIELD}}`

Conditional sections exist for:
- Custom instructions (when mode is 'custom')
- Branch auto-derivation (when branch is 'auto')
- Work description collection (when no issue URL)
- Initial prompt field (conditional based on description presence)

Pattern for new variables: Add to `PromptVariables` interface, compute value in `constructAgentPrompt()`, insert placeholder in template.

**Evidence**: `src/prompts/workflowInitPrompt.ts`, `src/prompts/workItemInitPrompt.template.md`

**Implications**: Adding `{{ARTIFACT_TRACKING_PREFERENCE}}` or similar follows established patterns. A new conditional section for agent instructions about checking `.gitignore` can be added.

### Question 4: Are there existing patterns for agents checking filesystem markers to modify behavior?

**Answer**: No. Agents do not currently check for filesystem markers (like `.gitignore` or indicator files) to modify behavior.

Existing conditional behavior patterns in agents:
- Reading `WorkflowContext.md` fields (Workflow Mode, Review Strategy, Handoff Mode)
- Checking for presence/absence of artifact files (e.g., SpecResearch.md exists → integration mode)
- CLI-based checks (e.g., `git branch --show-current` for branch state)

The `.gitignore` check would be a new pattern. Implementation could follow the `WorkflowContext.md` field-reading approach—agents already parse that file at startup.

**Evidence**: Review of all agent files in `agents/` directory for conditional logic patterns

**Implications**: The specification should define a consistent pattern for agents to check `.gitignore` presence. Options include:
- Direct filesystem check in agent instructions
- Adding a field to WorkflowContext.md (requires initialization prompt update)
- The Issue's proposed approach (check for `.gitignore` presence) is simpler and self-documenting

### Question 5: How is the workflow directory path computed in the extension code?

**Answer**: The path is computed inline using `path.join()` with a consistent pattern. There is no dedicated utility function that abstracts the path construction.

Pattern used consistently:
```typescript
const featureDir = path.join(workspacePath, '.paw', 'work', featureSlug);
```

Locations where this pattern appears:
- `getWorkStatus.ts`: `path.join(folder.uri.fsPath, '.paw', 'work')` for scanning
- `contextTool.ts`: `path.join(folderPath, '.paw', 'work', featureSlug)` in `resolveWorkspacePath()`
- `promptGenerationTool.ts`: `path.join(workspacePath, '.paw', 'work', workId)` in `resolvePromptsDirectory()`
- `workItemInitPrompt.template.md`: Uses string interpolation in agent instructions

**Evidence**: `src/commands/getWorkStatus.ts`, `src/tools/contextTool.ts`, `src/tools/promptGenerationTool.ts`

**Implications**: The "Stop Tracking Artifacts" command can reuse the existing pattern. Consider extracting a shared utility function if more commands need this path, but it's not required for the current feature.

## Open Unknowns

None. All internal questions answered through codebase research.

## User-Provided External Knowledge (Manual Fill)

- [ ] Are there any best practices or conventions for using `.gitignore` within subdirectories to exclude only that subdirectory's contents?

Note: The Spec Agent will review these with you. You may provide answers here if possible.
