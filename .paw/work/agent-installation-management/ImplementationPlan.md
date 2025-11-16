# Agent Installation Management Implementation Plan

## Overview

This plan implements automatic agent installation and upgrade management for the PAW VS Code extension. When users install or upgrade the extension, PAW agents will automatically become available in GitHub Copilot Chat without manual configuration. The system will install base agent templates, track installed versions, and handle migrations cleanly.

**Note**: Custom instructions for agents will be handled separately through a PAW Context tool (see issue #86). This implementation focuses solely on installing base agent templates.

**Codebase Refactoring**: This implementation begins with a significant codebase refactoring (Phase 1) to establish PAW as VS Code extension-centric. The refactoring flattens the directory structure and consolidates agent files, enabling cleaner development workflows and eliminating duplicate agents when developing PAW with PAW.

## Current State Analysis

The VS Code extension currently:
- Lives in `vscode-extension/` subdirectory with its own package.json
- Uses lazy activation (empty `activationEvents` array) - activates only when commands are invoked
- Registers one command (`paw.initializeWorkItem`) and one language model tool (`paw_create_prompt_templates`)
- Stores agent templates in `.github/agents/` as `.agent.md` files with YAML frontmatter
- Supports loading custom instructions from `.paw/instructions/` for workspace-level customization
- Uses synchronous file operations with Node.js `fs` module
- Logs operations to "PAW Workflow" output channel
- Has no version tracking or global state usage
- Has no platform detection or VS Code configuration path resolution

### Key Discoveries:
- VS Code does not expose profile path through API - must hardcode platform-specific paths (SpecResearch.md)
- User prompts directory is global across all profiles: `<config>/User/prompts/` (SpecResearch.md)
- Current extension uses `path.join()` for all path operations (extension.ts, customInstructions.ts)
- Agent files follow naming pattern `PAW-##X Agent Name.agent.md` in `.github/agents/`
- Extension uses structured result objects with `{ success, data, errors }` pattern (createPromptTemplates.ts:228-268)
- Duplicate directory structure causes confusion: project-level agents conflict with extension-managed agents during PAW development

## Desired End State

After implementation:
- Codebase uses flattened directory structure (no `vscode-extension/` subdirectory)
- Agent templates stored in `resources/agents/` (not `.github/agents/`)
- Single package.json at repository root
- Extension activates on VS Code startup via `onStartupFinished` activation event
- Agents automatically install to platform-appropriate prompts directory on first activation
- Agents update automatically when extension version changes (upgrades and downgrades)
- Version tracking in `globalState` enables version change detection
- Obsolete agent files cleaned up during version migrations (bidirectional)
- Uninstalled agents removed when extension is uninstalled
- File system errors handled gracefully with detailed logging and user notifications
- All file operations are idempotent and resilient to interruption
- PAW developers must install built VSIX to use local agent changes during development

### Verification:
- All 15+ PAW agents appear in GitHub Copilot Chat agent selector after first activation
- Upgrading extension version triggers automatic agent file refresh
- Downgrading extension version reverses migrations and restores appropriate agent files
- Installation completes successfully on Windows, macOS, and Linux with standard VS Code and variants
- Extension remains functional even when agent installation fails due to permissions
- Uninstalling extension removes all installed agent files

## What We're NOT Doing

- Custom instructions composition (handled separately through PAW Context tool - see issue #86)
- Migration from pre-0.4.0 chatmode files to extension-managed agents (users manually migrated when adopting extension-based workflow)
- Manual agent installation UI or commands (agents install automatically only)
- User configuration settings for installation location or behavior (except `paw.promptDirectory` override)
- Backup or preservation of user modifications to installed agent files
- Per-profile agent installation (prompts directory is global)
- Automatic Copilot refresh or reload after installation
- Dynamic agent discovery from external registries
- Manual rollback UI or commands (downgrade via VS Code's extension version picker provides rollback)
- Telemetry or analytics about installation success rates
- GUI for managing or viewing installed agents
- Hot-reload of agent changes without VS Code restart

## Implementation Approach

The implementation follows a five-phase approach:

1. **Codebase Refactoring**: Flatten directory structure, consolidate agent files, merge package.json - establish extension-centric architecture
2. **Core Infrastructure**: Platform detection, path resolution, agent bundling - foundation for installation
3. **Installation Logic**: File writing, version tracking, activation integration - core installation functionality
4. **Version Changes and Migration**: Upgrade/downgrade detection, migration manifest, bidirectional cleanup - production-ready version management
5. **Uninstall Cleanup**: Deactivation hook to remove agents - clean uninstall experience

Each phase builds incrementally with automated and manual verification criteria. The approach prioritizes reliability through idempotent operations, graceful error handling, and detailed logging.

---

## Phase 1: Codebase Refactoring

### Overview
Refactor PAW codebase to use extension-centric architecture with flattened directory structure. This eliminates duplicate agents during PAW development, simplifies the build process, and establishes a single source of truth for agent templates.

### Changes Required:

#### 1. Move Agent Files
**Action**: Relocate agent templates from `.github/agents/` to `resources/agents/`

**Rationale**: 
- Eliminates duplicate agents when developing PAW with VS Code extension installed
- Single source of truth for agent templates (bundled in extension)
- Simplifies build process (no copying needed across directories)
- Prevents mid-development agent changes from affecting active PAW workflows

**Steps**:
1. Create `resources/agents/` directory at repository root
2. Move all `.agent.md` files from `.github/agents/` to `resources/agents/`
3. Delete `.github/agents/` directory
4. Update `.gitignore` if needed

**Files Affected**:
- All 15 agent templates: `PAW-*.agent.md`
- New location: `resources/agents/PAW-*.agent.md`

#### 2. Flatten Directory Structure
**Action**: Move all `vscode-extension/` contents to repository root

**Rationale**:
- Repository IS the VS Code extension (no separate subdirectory needed)
- Simpler navigation and development workflow
- Consistent with most VS Code extension repositories
- Eliminates confusion about project vs extension boundaries

**Steps**:
1. Move all files/folders from `vscode-extension/` to root:
   - `src/` → `src/`
   - `scripts/` → `scripts/` (merge with existing root scripts/)
   - `resources/` → `resources/` (already created in step 1)
   - `test/` → `test/`
   - `tsconfig.json` → `tsconfig.json`
   - `vscode-extension/package.json` → merge with root `package.json`
   - `vscode-extension/README.md` → merge with root `README.md`
   - `vscode-extension/LICENSE` → verify matches root LICENSE
2. Delete empty `vscode-extension/` directory

**Conflict Resolution**:
- `scripts/`: Merge directories, keep both root scripts (count-tokens.js, lint-agent.sh, build-vsix.sh) and extension scripts (copyAgents.js - to be removed since agents no longer need copying)
- `package.json`: Merge carefully (see next section)
- `README.md`: Consolidate extension README into root README
- `LICENSE`: Verify both are identical, keep root version

#### 3. Merge package.json Files
**Action**: Consolidate root and extension package.json into single file at root

**Merge Strategy**:
- **Name**: Use extension name (`paw-workflow`)
- **Version**: Use extension version (0.0.1 or current)
- **Description**: Use extension description
- **Main/Activation**: Use extension fields (`main`, `activationEvents`, `contributes`)
- **Scripts**: 
  - Remove `copy-agents` script (no longer needed)
  - Keep extension build scripts: `compile`, `watch`, `vscode:prepublish`, `package`
  - Keep root utility scripts if useful: `count-tokens`, `lint-agent`, `build-vsix`
- **Dependencies**: Merge both dependency lists, deduplicate
- **DevDependencies**: Merge both devDependency lists, deduplicate
- **VS Code Fields**: Use extension fields (`engines`, `categories`, `publisher`, `repository`, `contributes`)
- **Root-only fields**: Drop if not relevant to extension (e.g., workspace scripts)

**Key Changes to Scripts**:
- Remove `copy-agents` script entirely
- Update `vscode:prepublish` to remove `npm run copy-agents` step
- Update `watch` to remove `npm run copy-agents` step
- Keep `build-vsix` script from root if useful

#### 4. Update All File Paths
**Action**: Update imports, references, and scripts to reflect new flat structure

**Files Requiring Path Updates**:

**TypeScript Source Files**:
- `src/extension.ts`: No path changes needed (already relative to src/)
- `src/agents/agentTemplates.ts`: Update `resources/agents` path (no longer ../resources)
- `src/agents/platformDetection.ts`: No path changes needed
- `src/commands/initializeWorkItem.ts`: No path changes needed
- `src/prompts/customInstructions.ts`: No path changes needed
- `src/tools/createPromptTemplates.ts`: No path changes needed
- `src/test/**/*.ts`: Update test imports if any referred to vscode-extension/

**Scripts**:
- Delete `scripts/copyAgents.js` (no longer needed)
- Keep `scripts/build-vsix.sh`, update if it references vscode-extension/
- Keep `scripts/count-tokens.js` (no changes needed)
- Keep `scripts/lint-agent.sh` (no changes needed)

**Configuration Files**:
- `tsconfig.json`: Update `include`/`exclude` paths if they referenced vscode-extension/
- `.vscodeignore`: Update to exclude test files, scripts, etc. from VSIX (use paths relative to root)
- `.gitignore`: Update if it had vscode-extension-specific entries

**Documentation**:
- `README.md`: Update all references to directory structure, installation paths
- `DEVELOPING.md`: Update development instructions for new structure
- Any other docs mentioning file paths or directory structure

#### 5. Update Build and Test Scripts
**Action**: Ensure build and test scripts work with new structure

**Script Updates**:
- `npm run compile`: Should work as-is (tsconfig handles source locations)
- `npm run watch`: Should work as-is
- `npm run test`: Update test paths if needed
- `npm run vscode:prepublish`: Remove copy-agents step
- `npm run package`: Should work as-is (vsce uses package.json)

**Test Updates**:
- Verify test runner configuration (`src/test/runTest.ts`) uses correct paths
- Update any test fixtures or data files that reference old structure
- Ensure test output directories are correct

#### 6. Update Documentation
**Files**: `README.md`, `DEVELOPING.md`

**README.md Updates**:
- Merge extension README content into root README
- Update directory structure diagrams
- Update installation/development instructions
- Update file path examples throughout
- Clarify that repository IS the extension
- Add note about developers needing to install built VSIX for local PAW development

**DEVELOPING.md Updates**:
- Update all file path references
- Update build instructions (no more copy-agents)
- Add section: "Developing PAW with PAW"
  - Explain that local agent changes require building and installing VSIX
  - Provide workflow: make changes → `npm run package` → Install VSIX → reload VS Code
  - Mention this prevents mid-workflow agent changes

#### 7. Clean Up Obsolete Files
**Action**: Remove files no longer needed after refactoring

**Files to Delete**:
- `scripts/copyAgents.js` (agents no longer copied)
- `vscode-extension/` directory (should be empty after move)
- Old `vscode-extension/package.json` (merged into root)
- Old `vscode-extension/README.md` (merged into root)
- Old `vscode-extension/LICENSE` (if identical to root)

**Files to Verify**:
- Check for any broken symbolic links
- Check for any orphaned configuration files

### Success Criteria:

#### Automated Verification:
- [ ] All agent files present in `resources/agents/`
- [ ] `.github/agents/` directory removed
- [ ] `vscode-extension/` directory removed
- [ ] Single `package.json` at root with merged content
- [ ] TypeScript compilation succeeds: `npm run compile`
- [ ] All unit tests pass: `npm test`
- [ ] VSIX builds successfully: `npm run package`
- [ ] No references to `vscode-extension/` in any source files
- [ ] No references to `.github/agents/` in any source files
- [ ] No references to `copy-agents` script in package.json

#### Manual Verification:
- [ ] Extension loads in VS Code without errors
- [ ] All commands still work (`paw.initializeWorkItem`)
- [ ] Language model tool still works (`paw_create_prompt_templates`)
- [ ] README accurately describes new structure
- [ ] DEVELOPING.md provides clear local development workflow
- [ ] Built VSIX installs successfully
- [ ] Agents appear correctly when extension is used

---

## Phase 2: Core Infrastructure

### Overview
Establish foundational capabilities for agent installation: platform/variant detection, prompts directory path resolution, agent template loading from refactored `resources/agents/` directory.

### Changes Required:

#### 1. Platform Detection Module
**File**: `src/agents/platformDetection.ts` (new)

**Purpose**: Detect operating system, VS Code variant, and resolve User/prompts directory paths.

**Key Capabilities**:
- Detect OS (Windows, macOS, Linux) via Node.js APIs
- Identify VS Code variant (Code, Insiders, Code-OSS, VSCodium) from environment variables
- Resolve platform-specific prompts directory paths
- Support user-configurable override via `paw.promptDirectory` setting
- Return structured platform information (platform, homeDir, variant)

**Path Resolution Logic**:
- Check `paw.promptDirectory` configuration setting first
- If set, use custom path without modification
- Otherwise use hardcoded platform paths:
  - Windows: `%APPDATA%\<variant>\User\prompts`
  - macOS: `~/Library/Application Support/<variant>/User/prompts`
  - Linux: `~/.config/<variant>/User/prompts`
- Throw descriptive error for unsupported platforms mentioning override option

**Key Interfaces**:
- VSCodeVariant enum (Code, Insiders, CodeOSS, VSCodium)
- PlatformInfo interface (platform, homeDir, variant)
- Functions: getPlatformInfo(), detectVSCodeVariant(), resolvePromptsDirectory()

#### 2. Agent Template Loader
**File**: `src/agents/agentTemplates.ts` (new)

**Purpose**: Load agent templates directly from extension resources (no build-time copying needed).

**Key Responsibilities**:
- Locate `<extensionPath>/resources/agents/` directory
- Enumerate all `.agent.md` files
- Read file content
- Parse YAML frontmatter for metadata (description)
- Extract clean agent name from filename (strip `PAW-##X` prefix and extension)
- Return array of agent templates with filename, name, description, content

**Error Handling**:
- Throw error if resources/agents directory missing
- Skip non-`.agent.md` files
- Handle missing/malformed frontmatter gracefully

#### 3. Extension Package Manifest
**File**: `package.json`

**Activation Events**:
- Add `onStartupFinished` to trigger extension after VS Code startup
- Provides timing for agent installation without blocking editor load

**Configuration**:
- Add `paw.promptDirectory` setting (type: string, default: "")
- Purpose: Override auto-detected prompts path
- Used for unsupported platforms or custom configurations
- Takes precedence over platform detection

### Success Criteria:

#### Automated Verification:
- [ ] `getPlatformInfo()` returns correct values on Windows, macOS, Linux
- [ ] `detectVSCodeVariant()` identifies all variants from environment
- [ ] `resolvePromptsDirectory()` returns correct paths for all platform/variant combinations
- [ ] `resolvePromptsDirectory()` returns custom path when `paw.promptDirectory` configured
- [ ] `npm run copy-agents` copies all `.agent.md` files to resources/agents/
- [ ] `loadAgentTemplates()` loads all agent templates with correct metadata
- [ ] Extension compiles without TypeScript errors
- [ ] Agent templates present in VSIX after `npm run vscode:prepublish`

#### Manual Verification:
- [ ] Verify agent templates bundled in VSIX package
- [ ] Test `resolvePromptsDirectory()` matches actual VS Code prompts directory
- [ ] Extension activates on VS Code startup (output channel appears)
- [ ] `paw.promptDirectory` setting visible in VS Code Settings UI

---

## Phase 3: Installation Logic

### Overview
Implement core installation: write agents to prompts directory, track versions, handle errors gracefully.

### Changes Required:

#### 1. Agent Installer Module
**File**: `src/agents/installer.ts` (new)

**Purpose**: Handle agent installation operations with error tracking and version management.

**Key Functions**:

**installAgents()**: Main installation orchestrator
- Determine prompts directory path (platform detection + override)
- Create prompts directory if needed (recursive)
- Load agent templates from extension resources
- Write each agent file to prompts directory
- Track success/failure per file
- Update installation state in globalState
- Return structured result (filesInstalled, filesSkipped, errors)

**needsInstallation()**: Determine if installation required
- Check globalState for previous installation record
- If no record, return true (fresh install)
- If version changed from stored version, return true (upgrade/downgrade)
- If any expected files missing, return true (repair)
- Otherwise return false (up to date)

**updateInstallationState()**: Persist installation metadata
- Store current extension version
- Store list of installed filenames
- Store installation timestamp
- Store success status
- Write to `globalState['paw.agentInstallation']`

**Error Handling**:
- Catch and log all file system errors
- Continue installing other agents after individual failures
- Return partial success with error details
- Never throw unhandled exceptions

**Idempotent Behavior**:
- Overwrite existing files (always write current version)
- Skip files already installed with current version when unnecessary
- Safe to re-run after partial installation

#### 2. Extension Activation Integration
**File**: `src/extension.ts`

**Changes**: Add agent installation to activation flow.

**Activation Sequence**:
1. Create output channel for logging
2. Check if installation needed via `needsInstallation()`
3. If needed:
   - Log installation start
   - Show output channel
   - Call `installAgents()` 
   - Log results
   - Show success notification with agent count
   - On errors: show error notification with "View Output" action
4. If not needed:
   - Log "Agents up to date"
5. On exceptions:
   - Log error to output channel
   - Show error notification
   - Continue extension activation (don't block)
6. Register commands and tools as normal
7. Return extension context

**Error Handling Philosophy**:
- Installation failures don't block extension activation
- Users can still use non-agent PAW features
- Detailed logging for troubleshooting
- Actionable error messages with remediation steps

#### 3. User Notifications
**Purpose**: Provide clear feedback about installation status.

**Success Notification**:
- Message: "PAW agents installed successfully. N agents available in Copilot Chat."
- Type: Information
- No action buttons (fire and forget)

**Error Notification**:
- Message: "PAW agent installation encountered errors. Check output channel."
- Type: Error
- Action button: "View Output" (opens PAW Workflow output channel)
- Include specific error details in output channel
- Mention `paw.promptDirectory` setting for permission issues

**Up-to-date Case**:
- No user notification (silent)
- Log to output channel only

### Success Criteria:

#### Automated Verification:
- [ ] `needsInstallation()` returns true on fresh install
- [ ] `needsInstallation()` returns true when version changes
- [ ] `needsInstallation()` returns true when files missing
- [ ] `needsInstallation()` returns false when up to date
- [ ] `installAgents()` writes all agent files to prompts directory
- [ ] globalState updated with version, filenames, timestamp
- [ ] Installation succeeds even without Copilot extension
- [ ] Extension activates successfully even when installation fails
- [ ] Partial installation tracked correctly (some files written, some failed)

#### Manual Verification:
- [ ] First activation shows "installing" message
- [ ] Success notification appears with agent count
- [ ] Agents appear in Copilot Chat after installation
- [ ] Reactivation shows "up to date" (no reinstall)
- [ ] Permission error shows actionable notification
- [ ] Output channel contains detailed installation logs

---

## Phase 4: Version Changes and Migration

### Overview
Add version change detection (upgrades and downgrades) and cleanup of previously installed agent files.

**Simplified Approach**: Instead of maintaining complex version-specific migration mappings, use a simpler strategy:
- Track which files were installed (already stored in globalState)
- On version change: delete all previously tracked files, then install fresh set
- This handles renames, removals, and additions automatically
- Works identically for upgrades and downgrades
- No version-specific mapping needed

### Changes Required:

#### 1. Version Change Detection
**File**: `src/agents/installer.ts` (enhance)

**Changes**: Enhance `needsInstallation()` and `installAgents()` to detect downgrades.

**Version Change Detection**:
- Compare stored version to current version
- If versions differ (upgrade OR downgrade), reinstallation needed
- Treat all version changes identically (no upgrade vs downgrade distinction)

**Version Change Handling**:
- Log old and new versions
- Delete all previously installed files (from globalState tracking)
- Install fresh set of agents from current version
- Update version marker and file list in globalState
- Works for any version transition

#### 2. Cleanup of Previous Installation
**File**: `src/agents/installer.ts` (enhance)

**Purpose**: Remove all agent files from previous version before installing new version.

**Cleanup Logic**:
- Read `globalState['paw.agentInstallation'].filesInstalled`
- For each previously installed file:
  - Attempt to delete from prompts directory
  - Log success/failure per file
  - Continue on errors (don't block installation)
- Clear old file list from globalState
- Run before installing new version's files

**Benefits of This Approach**:
- No version-specific mapping required
- Handles renames, removals, additions automatically
- Works identically for upgrades and downgrades
- Simpler to maintain (no hardcoded version rules)
- Robust against partial installations

**Error Handling**:
- Log deletion failures but continue with installation
- Track deleted files count in result
- Report cleanup errors in output channel
- Installation proceeds even if cleanup partially fails

#### 3. Enhanced Installation State
**File**: `src/agents/installer.ts` (enhance)

**State Fields**:
- version: Current extension version (for change detection)
- filesInstalled: List of installed filenames (for cleanup on next version change)
- installedAt: Timestamp (for troubleshooting)
- previousVersion: Version before this installation (for logging)
- filesDeleted: Count of files removed during cleanup (for verification)

**Purpose**: Track installation state for version change detection and cleanup.

### Success Criteria:

#### Automated Verification:
- [ ] `needsInstallation()` returns true when stored version differs from current (any direction)
- [ ] Version change deletes all previously installed files
- [ ] Version change installs complete fresh set of agents
- [ ] Upgrade 0.5 → 0.6 removes 0.5 agents, installs 0.6 agents
- [ ] Downgrade 0.6 → 0.5 removes 0.6 agents, installs 0.5 agents
- [ ] Cleanup happens before installation
- [ ] Cleanup errors logged but don't block installation
- [ ] globalState updated with new version and file list

#### Manual Verification:
- [ ] Simulate version upgrade, verify old agents removed and new agents installed
- [ ] Simulate version downgrade, verify newer agents removed and older agents installed
- [ ] After version change, only current version's agents present (no orphaned files)
- [ ] Output channel shows cleanup and installation details
- [ ] Multiple version changes don't accumulate orphaned files

---

## Phase 5: Uninstall Cleanup

### Overview
Implement deactivation hook to remove all PAW agents when extension is uninstalled.

### Changes Required:

#### 1. Deactivation Function
**File**: `src/extension.ts`

**Purpose**: Clean up installed agents when extension deactivates (uninstall or disable).

**Implementation**:
- Export `deactivate()` function (called by VS Code on uninstall/disable)
- Determine prompts directory path
- Enumerate all PAW agent files (paw-*.agent.md pattern)
- Delete each file
- Log deletions to output channel
- Clear globalState installation record
- Catch and log errors without throwing

**Pattern Matching**:
- Use glob pattern `paw-*.agent.md` to find PAW agents
- Avoid deleting non-PAW agent files
- Safe even if other extensions use `.agent.md` format

**Error Handling**:
- Continue deleting remaining files after individual failures
- Log detailed errors (file path, error message)
- If permission errors, log manual cleanup instructions
- Never throw exceptions (deactivation should complete)

#### 2. Output Channel Cleanup
**File**: `src/extension.ts`

**Changes**: Ensure output channel remains available during deactivation.

**Approach**:
- Don't dispose output channel until after agent cleanup
- Log cleanup operations to channel
- Dispose output channel as final step

#### 3. User Guidance
**File**: Extension README.md

**Changes**: Add uninstall cleanup documentation.

**Content**:
- Explain that agents are automatically removed on uninstall
- If permission errors prevent cleanup, provide manual removal instructions
- List typical prompts directory paths per platform
- Mention that orphaned agents are harmless (no longer managed)

### Success Criteria:

#### Automated Verification:
- [ ] `deactivate()` function exported from extension.ts
- [ ] Deactivation deletes all paw-*.agent.md files
- [ ] Deactivation clears globalState installation record
- [ ] Deactivation completes successfully even with permission errors
- [ ] Only PAW agent files deleted (not other extensions' agents)

#### Manual Verification:
- [ ] Uninstall extension, verify agents removed from prompts directory
- [ ] After uninstall, PAW agents absent from Copilot Chat
- [ ] Output channel shows cleanup confirmation
- [ ] Permission error during cleanup shows manual instructions
- [ ] README documents uninstall behavior

---

## Testing Strategy

### Unit Tests:
- Codebase structure validation (agents in resources/agents/, no vscode-extension/ references)
- Platform detection logic (all OS/variant combinations)
- Path resolution with and without custom override
- Agent template loading and parsing from resources/agents/
- Installation state management (globalState read/write)
- Migration manifest lookups (upgrades and downgrades)
- needsInstallation() logic (all conditions)

### Integration Tests:
- Post-refactor build and package validation
- Full installation flow from activation
- Version upgrade scenario (install → upgrade → verify)
- Version downgrade scenario (install → upgrade → downgrade → verify)
- Idempotent installation (reinstall after partial failure)
- Error recovery (permission denied, disk full)
- Uninstall cleanup

### Manual Testing Scenarios:

**Post-Refactor Validation** (Phase 1):
1. Build extension: `npm run compile`
2. Package extension: `npm run package`
3. Install VSIX in VS Code
4. Verify extension loads without errors
5. Verify all commands work
6. Verify no duplicate agents when developing PAW
7. Test local development workflow (make change → build VSIX → install → verify)

**Fresh Installation**:
1. Install PAW extension on clean VS Code
2. Trigger activation
3. Verify agents install to correct directory
4. Verify agents appear in Copilot Chat
5. Check output channel logs

**Version Change**:
1. Install PAW 0.5.0
2. Verify agents installed
3. Update to 0.6.0 (simulated via version change)
4. Reload VS Code
5. Verify old files removed, new files installed
6. Downgrade back to 0.5.0
7. Verify reverse migration (new files removed, old files restored)

**Error Recovery**:
1. Make prompts directory read-only
2. Trigger installation
3. Verify error notification with actionable message
4. Verify extension continues functioning
5. Restore permissions, verify successful reinstall

**Platform Compatibility**:
1. Test on Windows (standard VS Code)
2. Test on macOS (VS Code Insiders)
3. Test on Linux (Code-OSS)
4. Test on Linux (VSCodium)
5. Verify correct paths for each platform/variant

**Uninstall Cleanup**:
1. Install PAW, verify agents present
2. Uninstall extension
3. Verify all PAW agents removed
4. Verify agents absent from Copilot Chat
5. Check output channel for cleanup confirmation

---

## Performance Considerations

- **Installation Time**: Should complete within 2-3 seconds for 15+ agents (acceptable during activation)
- **File I/O**: Use synchronous operations during activation (VS Code activation is synchronous context)
- **Memory**: Agent templates total <500KB (small footprint, no caching needed)
- **Activation Overhead**: When up-to-date, check is <100ms (single globalState read + file existence checks)
- **Migration**: File deletion typically <10ms per file (rare operation, only on version changes)

---

## Migration Notes

**Initial Release (1.0.0)**: Fresh installations only, no migration from older versions needed. No pre-0.4.0 chatmode migration (users manually migrated when adopting extension-based workflow).

**Version Changes**: All version changes (upgrades and downgrades) follow the same pattern:
1. Delete all files from previous version (tracked in globalState)
2. Install fresh set from current version
3. Update version marker

**Future Versions**: No migration manifest maintenance required. Renaming, adding, or removing agents automatically handled by delete-all-then-reinstall pattern.

**Downgrades**: Automatically supported. Users can safely test new versions and rollback without orphaned files.

**Uninstall**: Extension removes agents automatically during deactivation. If cleanup fails due to permissions, manual removal instructions provided in README.

---

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/36
- Spec: `.paw/work/agent-installation-management/Spec.md`
- SpecResearch: `.paw/work/agent-installation-management/SpecResearch.md`
- CodeResearch: `.paw/work/agent-installation-management/CodeResearch.md`
- VS Code Extension API: https://code.visualstudio.com/api/references/vscode-api
- Similar pattern: `src/tools/createPromptTemplates.ts:228-268`
- PR #91 Review Comment: Codebase refactoring requirement
