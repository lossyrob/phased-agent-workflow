# Exclude PAW Artifacts Implementation Plan

## Overview

This feature enables PAW users to exclude workflow artifacts from git tracking while preserving local access. Users can choose upfront during initialization or switch mid-workflow via a command. The implementation uses a `.gitignore` file in the workflow directory as both the mechanism and indicator for artifact exclusion.

## Current State Analysis

### Existing Components

**User Input Collection** ([src/ui/userInput.ts](src/ui/userInput.ts)):
- Sequential Quick Pick prompts: issue URL → branch → workflow mode → review strategy → handoff mode
- `WorkItemInputs` interface defines collected inputs
- Quick Pick pattern established with `collectHandoffMode()` function

**Prompt Construction** ([src/prompts/workflowInitPrompt.ts](src/prompts/workflowInitPrompt.ts)):
- `PromptVariables` interface defines template variables
- `constructAgentPrompt()` builds initialization prompt with conditional sections
- Template uses `{{VAR_NAME}}` substitution

**Initialization Template** ([src/prompts/workItemInitPrompt.template.md](src/prompts/workItemInitPrompt.template.md)):
- Step 7 commits WorkflowContext.md unconditionally
- No conditional artifact commit logic exists

**Command Registration** ([src/extension.ts](src/extension.ts)):
- Commands registered via factory functions (e.g., `registerGetWorkStatusCommand`)
- Commands declared in `package.json` contributes.commands

**Artifact-Committing Agents**:
- PAW-02B Impl Planner: Stages `.paw/work/` artifacts at lines 51, 281, 298
- PAW-03B Impl Reviewer: Commits documentation/polish but no direct artifact staging
- PAW-04 Documenter: Stages Docs.md alongside project docs at lines 156, 173

### Key Discoveries

1. No filesystem marker pattern exists—agents currently only check WorkflowContext.md fields
2. Work item scanning uses `path.join(folder.uri.fsPath, '.paw', 'work')` pattern
3. PAW-03B commits code changes, not workflow artifacts—no modification needed
4. Template variable substitution is straightforward string replacement

## Desired End State

After implementation:
1. Workflow initialization includes artifact tracking prompt after handoff mode
2. Selecting "Don't Track" creates `.paw/work/<feature-slug>/.gitignore` with `*`
3. New command "PAW: Stop Tracking Artifacts" untracks committed artifacts mid-workflow
4. PAW-02B and PAW-04 agents check for `.gitignore` before staging artifacts
5. Initialization prompt conditionally skips WorkflowContext.md commit
6. All code changes continue committing normally regardless of tracking preference

**Verification**:
- `npm run lint` passes
- `npm run compile` succeeds
- Manual test: initialize with "Don't Track" → `.gitignore` exists → no artifacts in commits
- Manual test: run "Stop Tracking Artifacts" on tracked workflow → artifacts untracked → `.gitignore` created

## What We're NOT Doing

- "Re-enable Tracking" command (future iteration if requested)
- Squashing commits to remove artifact history
- Global/workspace-level default for artifact tracking
- Selective artifact tracking (track some, exclude others)
- Modifying PAW-03B Impl Reviewer (commits code, not workflow artifacts)

## Implementation Approach

The implementation follows a bottom-up approach:
1. First add the data model and UI collection (extension TypeScript)
2. Then update prompt construction and template
3. Finally update agent instructions to respect the preference

This order ensures each layer can be tested before building the next.

## Phase Summary

1. **Phase 1: Extension Data Model & UI** - Add artifact tracking input collection and interface updates
2. **Phase 2: Prompt Construction & Template** - Pass tracking preference to agent via prompt variables
3. **Phase 3: Stop Tracking Command** - Create command to untrack artifacts mid-workflow
4. **Phase 4: Agent Instruction Updates** - Update PAW-02B and PAW-04 to check for `.gitignore`

---

## Phase 1: Extension Data Model & UI

### Overview

Add artifact tracking to the user input collection flow. The prompt appears after handoff mode selection and follows established Quick Pick patterns.

### Changes Required

#### 1. WorkItemInputs Interface

**File**: [src/ui/userInput.ts](src/ui/userInput.ts)

**Changes**:
- Add `trackArtifacts: boolean` field to `WorkItemInputs` interface (after `handoffMode`)
- Field indicates whether workflow artifacts should be committed to git (true) or excluded (false)

**Tests**:
- Type checking validates interface changes: `npm run compile`

#### 2. collectArtifactTracking Function

**File**: [src/ui/userInput.ts](src/ui/userInput.ts)

**Changes**:
- Implement `collectArtifactTracking()` async function following `collectHandoffMode()` pattern
- Present Quick Pick with two options:
  - "Track" (default): description "Workflow artifacts committed to git", detail "Standard PAW behavior—artifacts visible in PRs and version history", value `true`
  - "Don't Track": description "Exclude workflow artifacts from git", detail "For external contributions or lightweight changes—artifacts stay local only", value `false`
- Return `boolean | undefined` (undefined on cancel)

**Tests**:
- Unit test for function behavior in [src/test/](src/test/) following existing patterns
- Test cases: selection returns boolean, cancel returns undefined

#### 3. collectUserInputs Integration

**File**: [src/ui/userInput.ts](src/ui/userInput.ts)

**Changes**:
- Call `collectArtifactTracking()` after `collectHandoffMode()` in the collection sequence
- Return early if undefined (user cancelled)
- Include `trackArtifacts` in returned `WorkItemInputs` object

**Tests**:
- Unit test confirming prompt sequence order
- Integration test: full collection flow with artifact tracking included

### Success Criteria

#### Automated Verification:
- [ ] TypeScript compiles: `npm run compile`
- [ ] Linting passes: `npm run lint`
- [ ] Unit tests pass (if added): `npm test`

#### Manual Verification:
- [ ] Running "PAW: New PAW Workflow" shows artifact tracking prompt after handoff mode
- [ ] Selecting "Track" returns true in collected inputs
- [ ] Selecting "Don't Track" returns false in collected inputs
- [ ] Pressing Escape cancels the workflow initialization

---

## Phase 2: Prompt Construction & Template

### Overview

Pass the artifact tracking preference to the initialization agent through template variables. The agent uses this to conditionally skip artifact commits and create `.gitignore`.

### Changes Required

#### 1. PromptVariables Interface

**File**: [src/prompts/workflowInitPrompt.ts](src/prompts/workflowInitPrompt.ts)

**Changes**:
- Add `TRACK_ARTIFACTS: string` to `PromptVariables` interface (display value: "Track" or "Don't Track")
- Add `ARTIFACT_TRACKING_SECTION: string` for conditional commit skip instructions

#### 2. constructAgentPrompt Function

**File**: [src/prompts/workflowInitPrompt.ts](src/prompts/workflowInitPrompt.ts)

**Changes**:
- Add `trackArtifacts: boolean` parameter to function signature
- Build conditional section when `trackArtifacts` is false:
  ```
  **IMPORTANT - Artifact Tracking DISABLED**:
  1. Create `.paw/work/<feature-slug>/.gitignore` containing `*`
  2. Do NOT stage or commit WorkflowContext.md or any `.paw/` files
  3. Continue with all other initialization steps normally
  ```
- Populate `TRACK_ARTIFACTS` variable with "Track" or "Don't Track"
- Populate `ARTIFACT_TRACKING_SECTION` with conditional instructions or empty string

**Tests**:
- Unit test: `constructAgentPrompt()` with `trackArtifacts=false` includes gitignore instructions
- Unit test: `constructAgentPrompt()` with `trackArtifacts=true` excludes special instructions

#### 3. Initialization Command Integration

**File**: [src/commands/initializeWorkItem.ts](src/commands/initializeWorkItem.ts)

**Changes**:
- Pass `inputs.trackArtifacts` to `constructAgentPrompt()` call
- No other changes needed—prompt construction handles the rest

#### 4. Initialization Prompt Template

**File**: [src/prompts/workItemInitPrompt.template.md](src/prompts/workItemInitPrompt.template.md)

**Changes**:
- Add `- **Track Artifacts**: {{TRACK_ARTIFACTS}}` to Parameters Provided section
- Add `{{ARTIFACT_TRACKING_SECTION}}` placeholder before Step 7
- Modify Step 7 title to "Commit WorkflowContext.md (Skip if artifacts not tracked)"
- Add conditional logic: "If Track Artifacts is 'Track': [commit instructions]. If Track Artifacts is 'Don't Track': Skip this step—artifacts remain local only."

**Tests**:
- Verify template parses correctly after modification
- Unit test: generated prompt includes artifact tracking parameter

### Success Criteria

#### Automated Verification:
- [ ] TypeScript compiles: `npm run compile`
- [ ] Linting passes: `npm run lint`
- [ ] Unit tests pass: `npm test`

#### Manual Verification:
- [ ] Initialize workflow with "Don't Track" → agent prompt shows "Track Artifacts: Don't Track"
- [ ] Initialize workflow with "Don't Track" → agent creates `.gitignore` in workflow directory
- [ ] Initialize workflow with "Don't Track" → agent does NOT commit WorkflowContext.md
- [ ] Initialize workflow with "Track" → normal behavior (no `.gitignore`, artifacts committed)

---

## Phase 3: Stop Tracking Command

### Overview

Create a new VS Code command that allows users to stop tracking artifacts mid-workflow. The command untracks committed artifacts without deleting them and creates the `.gitignore` marker.

### Changes Required

#### 1. Command Implementation

**File**: `src/commands/stopTrackingArtifacts.ts` (new file)

**Changes**:
- Create new file implementing the "Stop Tracking Artifacts" command
- Follow pattern from [src/commands/getWorkStatus.ts](src/commands/getWorkStatus.ts)
- Implement `scanWorkItems()` reuse or import from getWorkStatus.ts
- Present Quick Pick for work item selection if multiple exist
- Execute operations:
  1. Check if `.gitignore` already exists (idempotent handling)
  2. Run `git rm --cached -r .paw/work/<slug>/` to untrack without deleting
  3. Create `.paw/work/<slug>/.gitignore` with content `*`
  4. Stage the `.gitignore` file (so it's tracked and prevents future artifact tracking)
  5. Inform user of success
- Export `registerStopTrackingCommand()` factory function
- Handle errors: no workspace, no work items found, git command failures

**Tests**:
- Unit test for command registration
- Integration test: command appears in palette
- Test cases: single work item auto-selects, multiple work items shows picker

#### 2. Command Registration

**File**: [src/extension.ts](src/extension.ts)

**Changes**:
- Import `registerStopTrackingCommand` from new command file
- Call `registerStopTrackingCommand(context, outputChannel)` in `activate()`
- Add logging line: `'[INFO] Registered command: paw.stopTrackingArtifacts'`

#### 3. Package.json Command Declaration

**File**: [package.json](package.json)

**Changes**:
- Add command to `contributes.commands` array:
  ```json
  {
    "command": "paw.stopTrackingArtifacts",
    "title": "Stop Tracking Artifacts",
    "category": "PAW"
  }
  ```

**Tests**:
- Verify JSON is valid: extension loads without errors

### Success Criteria

#### Automated Verification:
- [ ] TypeScript compiles: `npm run compile`
- [ ] Linting passes: `npm run lint`
- [ ] Unit tests pass: `npm test`
- [ ] Extension activates without errors

#### Manual Verification:
- [ ] Command appears in palette: "PAW: Stop Tracking Artifacts"
- [ ] Running command on workflow with committed artifacts → `git rm --cached` executes
- [ ] After command: artifacts remain on filesystem but not in git index
- [ ] After command: `.gitignore` exists in workflow directory with `*`
- [ ] Running command twice is idempotent (no errors)
- [ ] Running command with no workflows shows informative message

---

## Phase 4: Agent Instruction Updates

### Overview

Update agent instructions so they check for `.gitignore` presence before staging workflow artifacts. This ensures the artifact exclusion preference is respected throughout the workflow lifecycle.

### Changes Required

#### 1. PAW-02B Impl Planner Agent

**File**: [agents/PAW-02B Impl Planner.agent.md](agents/PAW-02B%20Impl%20Planner.agent.md)

**Changes**:
- Add artifact tracking check section before PR review response artifact staging (near line 49-53)
- Add artifact tracking check before prs strategy completion staging (near line 279-283)
- Add artifact tracking check before local strategy completion staging (near line 296-300)
- Check pattern:
  ```
  **Before staging artifacts**: Check if `.paw/work/<feature-slug>/.gitignore` exists.
  - If `.gitignore` exists: Skip staging `.paw/` artifacts (tracking disabled)
  - If no `.gitignore`: Proceed with artifact staging as normal
  ```

**Tests**:
- Run agent linter: `./scripts/lint-agent.sh agents/PAW-02B\ Impl\ Planner.agent.md`

#### 2. PAW-04 Documenter Agent

**File**: [agents/PAW-04 Documenter.agent.md](agents/PAW-04%20Documenter.agent.md)

**Changes**:
- Modify prs strategy staging instructions (near line 155-157) to split Docs.md from project docs
- Modify local strategy staging instructions (near line 172-174) similarly
- Check pattern:
  ```
  **Before staging Docs.md**: Check if `.paw/work/<feature-slug>/.gitignore` exists.
  - If `.gitignore` exists: Stage only project documentation (README.md, CHANGELOG.md, etc.)
  - If no `.gitignore`: Stage all documentation including Docs.md
  ```

**Tests**:
- Run agent linter: `./scripts/lint-agent.sh agents/PAW-04\ Documenter.agent.md`

### Success Criteria

#### Automated Verification:
- [ ] Agent linter passes for PAW-02B: `./scripts/lint-agent.sh agents/PAW-02B\ Impl\ Planner.agent.md`
- [ ] Agent linter passes for PAW-04: `./scripts/lint-agent.sh agents/PAW-04\ Documenter.agent.md`

#### Manual Verification:
- [ ] Complete a workflow with "Don't Track" selected → no `.paw/` files appear in any commits
- [ ] Complete a workflow with "Track" selected → artifacts committed normally
- [ ] PAW-02B creates Planning PR without artifacts when `.gitignore` present
- [ ] PAW-04 creates Docs PR with README.md but without Docs.md when `.gitignore` present

---

## Cross-Phase Testing Strategy

### Integration Tests

After all phases complete:

1. **Full workflow with artifact exclusion**:
   - Initialize workflow with "Don't Track"
   - Verify `.gitignore` created
   - Complete through implementation phase
   - Verify no `.paw/` files in any PR diff

2. **Mid-workflow switch**:
   - Initialize workflow normally (Track)
   - Run "Stop Tracking Artifacts" command
   - Complete remaining phases
   - Verify artifacts untracked from that point forward

3. **Backward compatibility**:
   - Existing workflows without `.gitignore` function normally
   - Artifacts continue to be committed

### Manual Testing Steps

1. Initialize new workflow, select "Don't Track" at artifact prompt
2. Run `git status` → verify no staged `.paw/` files
3. Check `.paw/work/<slug>/.gitignore` exists with content `*`
4. Say `spec` to continue workflow
5. Complete through planning phase
6. Verify Planning PR (if prs strategy) contains no `.paw/` artifact changes
7. For mid-workflow test: Initialize with "Track", commit some artifacts, run Stop Tracking command, verify artifacts untracked

## Performance Considerations

No significant performance impact expected:
- `.gitignore` existence check is a single filesystem stat operation
- Git operations (`git rm --cached`) are fast for small directory trees

## Migration Notes

No migration needed. Feature is additive:
- Existing workflows continue unchanged
- No database or state migrations required
- `.gitignore` presence is the sole indicator

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/130
- Spec: `.paw/work/exclude-paw-artifacts/Spec.md`
- Research: `.paw/work/exclude-paw-artifacts/SpecResearch.md`, `.paw/work/exclude-paw-artifacts/CodeResearch.md`
- Similar pattern: [src/commands/getWorkStatus.ts](src/commands/getWorkStatus.ts) for command and work item scanning patterns
