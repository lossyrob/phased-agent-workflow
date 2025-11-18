# Agent Installation Management

## Overview

The Agent Installation Management feature transforms PAW from a documentation framework into a fully integrated VS Code development companion by automatically managing PAW agent installation, upgrades, and cleanup. When developers install the PAW VS Code extension, all PAW agents (Specification, Planning, Implementation, Review, Documentation, etc.) become immediately available in GitHub Copilot Chat without manual configuration. The system handles version upgrades and downgrades bidirectionally, cleans up obsolete agent files during version transitions, and documents clear manual removal steps for scenarios where the extension is uninstalled—all while maintaining resilience against interruptions and providing clear error recovery guidance.

This implementation establishes PAW as an extension-first architecture where the repository itself serves as the extension project. All agent templates are bundled within the extension and installed to platform-appropriate VS Code configuration directories, ensuring consistent agent availability across all developer machines regardless of platform or VS Code variant.

## Architecture and Design

### High-Level Architecture

The agent installation system consists of three primary modules working in concert:

**Platform Detection** (`src/agents/platformDetection.ts`):
- Detects operating system (Windows, macOS, Linux, WSL)
- Identifies VS Code variant (stable, Insiders, Code-OSS, VSCodium)
- Resolves platform-specific prompts directory paths
- Supports user-configurable override via `paw.promptDirectory` setting

**Agent Template Loading** (`src/agents/agentTemplates.ts`):
- Loads agent templates from `agents/` directory bundled in extension
- Parses YAML frontmatter for agent metadata
- Extracts clean agent names from filenames
- Provides array of agent templates ready for installation

**Installation Management** (`src/agents/installer.ts`):
- Orchestrates agent installation during extension activation
- Tracks installation state in VS Code globalState
- Detects version changes (upgrades, downgrades, development builds)
- Cleans up previous installations during version changes
- Handles errors gracefully without blocking extension activation

### Extension Activation Flow

```
Extension Activation (onStartupFinished)
    ↓
Check needsInstallation()
    ↓
├─ Fresh install? → Install agents
├─ Version changed? → Clean up old agents → Install new agents
├─ Files missing? → Repair installation
└─ Up to date? → Skip (silent)
    ↓
Register commands and tools
    ↓
Extension active
```

### Version Change and Migration Flow

```
Version Change Detected (upgrade/downgrade/dev)
    ↓
Read previous installation state from globalState
    ↓
Delete all files listed in previous state
    ↓
Load current version's agent templates
    ↓
Write all current agent files
    ↓
Update globalState with new version and files
```

### Design Decisions

**Repository-as-Extension Architecture**: The codebase was refactored from a nested `vscode-extension/` subdirectory to a flat structure where the repository root serves as the VS Code extension project. This eliminates duplicate agents during PAW self-development, simplifies the build process, and establishes a single source of truth for agent templates in `agents/`.

**Simplification Through Delete-All-Then-Install**: Rather than maintaining complex version-specific migration mappings, the system uses a simpler strategy: on any version change, delete all previously tracked files and install a fresh set from the current version. This handles renames, removals, and additions automatically and works identically for both upgrades and downgrades.

**Development Version Auto-Reinstall**: Development builds use a `-dev` version suffix (e.g., `0.0.1-dev`) which triggers automatic agent reinstallation on every activation. This ensures agent content changes are immediately reflected during local development without requiring manual version bumps. The GitHub Actions release workflow overwrites the version with production versions during releases.

**Graceful Degradation**: Installation failures (due to permissions, disk space, etc.) are logged with detailed error information and shown to users via notifications, but never block extension activation. This ensures developers can use non-agent PAW features (like the `paw.initializeWorkItem` command) even when agent installation fails.

**Platform Path Hardcoding**: VS Code does not expose configuration directory paths through its API, so the system hardcodes platform-specific paths based on documented conventions. A `paw.promptDirectory` configuration override provides an escape hatch for unsupported platforms or custom setups.

**Idempotent Operations**: All installation operations are designed to be safe when run multiple times. Missing files trigger repair installations, existing files are overwritten with current content, and cleanup operations tolerate missing files without error.

### Integration Points

**VS Code Extension API**:
- `vscode.ExtensionContext`: Provides `globalState` for version tracking and `extension.extensionUri` for loading bundled agent templates
- `vscode.workspace.getConfiguration()`: Reads `paw.promptDirectory` configuration override
- `vscode.window.showErrorMessage()` / `showInformationMessage()`: User notifications
- `vscode.window.createOutputChannel()`: Detailed logging for troubleshooting
- Extension lifecycle: `activate()` triggers installation logic during startup

**File System**:
- Reads agent templates from `<extensionPath>/agents/*.agent.md`
- Writes agent files to `<configRoot>/User/prompts/*.agent.md`
- Uses synchronous Node.js `fs` module operations (VS Code activation context is synchronous)

**GitHub Copilot**:
- Copilot discovers agent files from `User/prompts/` directory
- Agent discovery happens at Copilot initialization (may require VS Code reload after installation)
- Agents appear in Copilot Chat agent selector after installation

**Git Workflow**:
- Extension uses git branches for feature development and PR reviews
- Installation state tracked in VS Code globalState (not in git)
- Agent files installed to user-global location (not in project workspace)

## User Guide

### Prerequisites

- VS Code 1.85.0 or later
- GitHub Copilot extension (agents remain non-functional without Copilot, but install successfully)

### Installation

PAW agents install automatically when you install the PAW Workflow VS Code extension:

1. Install the PAW Workflow extension through VS Code's extension marketplace (or via VSIX file)
2. The extension activates on VS Code startup
3. Within 2-3 seconds, all 15 PAW agents are written to your prompts directory
4. Check the Output panel (View → Output → PAW Workflow) for installation confirmation
5. Open GitHub Copilot Chat - all PAW agents appear in the agent selector

**First-time installation output**:
```
[2024-11-14 10:23:45] Installing PAW agents...
[2024-11-14 10:23:45] Platform: linux, VS Code variant: Code
[2024-11-14 10:23:45] Prompts directory: /home/user/.config/Code/User/prompts
[2024-11-14 10:23:45] Creating prompts directory...
[2024-11-14 10:23:46] Installed PAW-01A Specification.agent.md
[2024-11-14 10:23:46] Installed PAW-01B Spec Researcher.agent.md
... (13 more agents)
[2024-11-14 10:23:47] Successfully installed 15 PAW agents
```

### Configuration

**Custom Prompts Directory**:

If the extension cannot detect your prompts directory (unsupported platform) or you want to use a custom location, set the `paw.promptDirectory` configuration:

1. Open Settings (File → Preferences → Settings)
2. Search for "paw prompt"
3. Set **PAW Workflow: Prompt Directory** to your desired path
4. Reload VS Code
5. Check Output panel to verify agents installed to custom location

Example custom paths:
- Windows: `C:\Custom\Path\Prompts`
- macOS/Linux: `/home/user/custom-prompts`

### Upgrading

Agent upgrades happen automatically when you update the PAW extension:

1. Update the PAW Workflow extension through VS Code's extension manager
2. Reload VS Code
3. The extension detects the version change and automatically reinstalls agents
4. Check Output panel to verify upgrade completion

**Upgrade output example**:
```
[2024-12-01 14:15:20] Version change detected: 0.2.0 → 0.3.0
[2024-12-01 14:15:20] Cleaning up previous installation...
[2024-12-01 14:15:20] Deleted PAW-01A Specification.agent.md
... (14 more deletions)
[2024-12-01 14:15:21] Deleted 15 files from previous version
[2024-12-01 14:15:21] Installing PAW agents for version 0.3.0...
... (15 installations)
[2024-12-01 14:15:22] Successfully installed 15 PAW agents
```

### Uninstalling

VS Code does not provide an uninstall-specific lifecycle event—`deactivate()` fires for every shutdown, reload, disable, and uninstall. To avoid deleting agents on each restart, the extension leaves installed agents in place. If you no longer need them after uninstalling the extension, use the configure agents UI in GitHub Copilot Chat to delete the PAW agents.

Alternatively, you can manually delete files matching `paw-*.agent.md` from your prompts directory:
- **Windows**: `%APPDATA%\Code\User\prompts`
- **macOS**: `~/Library/Application Support/Code/User/prompts`
- **Linux**: `~/.config/Code/User/prompts`
- **Custom path**: the value configured via `paw.promptDirectory`

The installer module still exposes `removeInstalledAgents(context)` for tooling or scripts that want to perform automated cleanup, but the extension no longer invokes it automatically during shutdown.### Troubleshooting

**Agents not appearing in Copilot Chat after installation**:
- Reload VS Code (Command Palette → Developer: Reload Window)
- Verify agents installed: Check output panel for installation logs
- Verify file presence: Navigate to prompts directory and confirm `.agent.md` files exist
- Ensure GitHub Copilot extension is installed and active

**Permission errors during installation**:
- Error message includes specific file path and remediation steps
- Check file permissions for the prompts directory
- Set `paw.promptDirectory` to a custom location with write access
- Run VS Code with appropriate permissions

**Installation fails on unsupported platform**:
- Error message mentions "Unsupported platform" and suggests override
- Set `paw.promptDirectory` to your VS Code prompts directory manually
- Common paths are listed in error message and documentation

**Agents from old version remain after upgrade**:
- This should not happen with normal operation (cleanup is automatic)
- Manually delete old agent files from prompts directory
- Reload VS Code to trigger reinstallation
- Report issue with output channel logs

**Extension activation fails**:
- Agent installation errors never block extension activation
- Check output panel for specific error details
- Extension commands should still work even if installation failed
- Fix installation issue and reload VS Code to retry

## Technical Reference

### Key Components

**Platform Detection Module** (`src/agents/platformDetection.ts`):

Responsible for determining where to install agents based on the current operating system and VS Code variant. Handles platform-specific configuration directory path conventions.

Key functions:
- `getPlatformInfo()`: Returns platform type, home directory, and VS Code variant
- `detectVSCodeVariant()`: Identifies VS Code variant from application name
- `resolvePromptsDirectory()`: Returns absolute path to prompts directory with override support
- `isWSL()`: Detects Windows Subsystem for Linux environments
- `getWindowsUsernameFromWSL()`: Determines Windows username from WSL context

Platform-specific paths:
- **Windows**: `%APPDATA%\<variant>\User\prompts`
- **macOS**: `~/Library/Application Support/<variant>/User/prompts`
- **Linux**: `~/.config/<variant>/User/prompts`
- **WSL**: `/mnt/c/Users/<username>/AppData/Roaming/<variant>/User/prompts`

VS Code variants:
- `Code` (stable)
- `Code - Insiders`
- `Code - OSS`
- `VSCodium`

**Agent Template Loader** (`src/agents/agentTemplates.ts`):

Loads agent templates from extension resources and parses metadata.

Key function:
- `loadAgentTemplates(extensionUri)`: Returns array of agent templates with filename, name, description, and content

Agent template structure:
- Location: `agents/*.agent.md` within extension package
- Format: Markdown file with YAML frontmatter
- Frontmatter fields: `name` (agent display name), `description` (agent purpose)
- Filename pattern: `PAW-##X Agent Name.agent.md`

**Installation Manager** (`src/agents/installer.ts`):

Core installation orchestration with version tracking and error handling.

Key interfaces:
```typescript
interface InstallationResult {
  filesInstalled: string[];
  filesSkipped: string[];
  errors: string[];
}

interface InstallationState {
  version: string;
  filesInstalled: string[];
  installedAt: string;
  success: boolean;
  previousVersion?: string;
  filesDeleted?: number;
}

interface AgentCleanupResult {
  filesRemoved: string[];
  errors: string[];
}
```

Key functions:
- `needsInstallation(context, extensionUri, promptsDir)`: Returns true if installation needed
- `installAgents(context)`: Installs agents and returns result
- `removeInstalledAgents(context)`: Optional helper for scripted/manual uninstall cleanup
- `isDevelopmentVersion(version)`: Checks for `-dev` suffix

Installation state storage:
- Location: `globalState['paw.agentInstallation']`
- Persists across VS Code sessions
- Used for version change detection and cleanup tracking

### Behavior and Algorithms

**Version Change Detection**:

The system determines if installation is needed by comparing stored state against current context:

1. **Fresh install**: No `globalState['paw.agentInstallation']` exists → install needed
2. **Version change**: Stored version ≠ current version → install needed (upgrade or downgrade)
3. **Development build**: Either version contains `-dev` → install needed (force reinstall)
4. **Missing files**: Any expected agent file doesn't exist → repair needed
5. **Up to date**: All checks pass → skip installation (silent)

**Migration Algorithm** (upgrades and downgrades):

```
1. Read previous installation state from globalState
2. IF (current version ≠ stored version) OR (either version has -dev suffix):
   a. For each filename in state.filesInstalled:
      - Delete file from prompts directory
      - Log deletion (continue on errors)
   b. Track deletion count
3. Load current version's agent templates from agents/
4. For each template:
   - Write to prompts directory (overwrite if exists)
   - Track success/failure
5. Update globalState:
   - version: current version
   - filesInstalled: list of newly installed files
   - installedAt: current timestamp
   - previousVersion: version before this installation
   - filesDeleted: count of files removed
```

This symmetric algorithm handles both upgrades (0.2.0 → 0.3.0) and downgrades (0.3.0 → 0.2.0) identically, ensuring clean version transitions in both directions.

**Idempotent Installation**:

Installation operations are safe to run multiple times:
- Existing files are overwritten with current content (no corruption from reruns)
- Missing files are written (repair)
- globalState is updated with current state (no accumulation)
- Cleanup tolerates missing files (no errors from partial previous cleanup)

**Error Handling Strategy**:

Installation errors follow graceful degradation:
1. Catch all file system exceptions
2. Log detailed error (file path, error type, error message)
3. Add error to result but continue with remaining operations
4. Show user notification with actionable remediation steps
5. Extension activation completes successfully regardless of installation outcome
6. User can still invoke non-agent PAW commands

### Error Handling

**Permission Errors**:
- Logged to output channel with full file path
- User notification: "PAW agent installation encountered errors. Check output channel."
- Notification includes "View Output" action button
- Output channel suggests checking permissions and using `paw.promptDirectory` override

**Disk Space Errors**:
- Logged with error message explaining disk full condition
- User notification with error details
- Extension continues functioning
- User can free space and reload VS Code to retry

**Unsupported Platform Errors**:
- Thrown during path resolution
- Error message explains platform not supported
- Suggests setting `paw.promptDirectory` configuration
- Lists common paths for reference

**Manual Cleanup Guidance**:
- README documents platform-specific prompts directory paths
- Users delete `paw-*.agent.md` files after uninstalling the extension
- Global state is cleared when manual cleanup helpers run, but the default workflow now leaves state untouched so users can reinstall later without issue
- Tooling can call `removeInstalledAgents(context)` if scripted cleanup is needed (e.g., in automated tests)

## Edge Cases and Limitations

**Multiple VS Code Windows**:
- If multiple VS Code instances activate simultaneously, concurrent file writes may occur
- File system handles atomic writes per file
- Last writer wins (acceptable since agent content is deterministic per version)
- Eventual consistency achieved through idempotent installation

**User Modifications to Agent Files**:
- Agents are treated as managed assets (like node_modules)
- User edits to installed agent files are overwritten on next version upgrade
- No backup or preservation of user changes
- Developers should use custom instructions feature (separate from base agents) for customization

**Disk Full During Installation**:
- Partial files may be written before disk exhaustion
- Error caught and logged
- Installation state reflects partial installation
- Next activation completes missing files (idempotent repair)

**VS Code Crash Mid-Installation**:
- Partial installation state may exist
- globalState reflects previous version or no version
- Next activation detects missing files and repairs installation
- Idempotent design ensures clean recovery

**Copilot Extension Not Installed**:
- Agent files install successfully
- Agents remain non-functional until Copilot is installed
- No error or warning (agents available when user later installs Copilot)

**Profile Switching**:
- User prompts directory is global across all VS Code profiles
- Agents available in all profiles
- No per-profile installation needed

**WSL Environment**:
- System detects WSL by checking `/proc/version` and environment variables
- Attempts to determine Windows username from `/mnt/c/Users/` directory
- Falls back to `LOGNAME` environment variable
- If Windows username cannot be determined, throws error with manual override guidance

**Extension Development with PAW**:
- Developers working on PAW agents must build and install VSIX to test changes
- Local agent file modifications don't affect active VS Code (agents loaded from prompts directory)
- Development version (`0.0.1-dev`) forces reinstallation on every activation
- This prevents mid-workflow agent changes but ensures intentional testing

## Testing Guide

### How to Test This Work

**Basic Installation Verification**:
1. Install PAW Workflow extension (from marketplace or VSIX)
2. Open Output panel (View → Output)
3. Select "PAW Workflow" from dropdown
4. Verify installation logs show 15 agents installed
5. Open GitHub Copilot Chat
6. Click agent selector (@)
7. Verify all PAW agents appear (PAW-01A through PAW-05, plus review agents)
8. Invoke a PAW agent (e.g., `@paw-01a-specification help`) and verify response

**Version Upgrade Testing**:
1. Install older PAW version (e.g., `paw-workflow-0.2.0.vsix`)
2. Verify agents installed and appear in Copilot
3. Note installed version in output panel logs
4. Install newer PAW version (e.g., `paw-workflow-0.3.0.vsix`)
5. Reload VS Code
6. Check output panel for "Version change detected" message
7. Verify old agents deleted and new agents installed
8. Confirm only current version's agents present in prompts directory
9. Test agents in Copilot to verify functionality

**Version Downgrade Testing**:
1. Install newer PAW version
2. Verify agents installed
3. Install older PAW version
4. Reload VS Code
5. Verify version change detected and migration executed
6. Confirm older agents restored and newer agents removed

**Development Build Testing**:
1. Clone PAW repository
2. Build extension: `npm run package`
3. Note version in package.json: `0.0.1-dev`
4. Install built VSIX: `code --install-extension paw-workflow-0.0.1-dev.vsix`
5. Verify agents installed (check output panel)
6. Modify an agent file in `agents/`
7. Rebuild: `npm run package`
8. Reinstall same version: `code --install-extension paw-workflow-0.0.1-dev.vsix --force`
9. Reload VS Code
10. Check output panel for "Development version detected" message
11. Verify agents updated with modifications
12. Invoke modified agent to confirm changes reflected

**Permission Error Testing**:
1. Make prompts directory read-only (platform-specific commands)
2. Install PAW extension or reload VS Code
3. Check output panel for permission error details
4. Verify error notification appears with "View Output" button
5. Verify extension activates successfully despite installation failure
6. Test `PAW: New PAW Workflow` command (should work)
7. Restore permissions and reload to verify successful installation

**Custom Prompts Directory Testing**:
1. Open Settings (File → Preferences → Settings)
2. Search for "paw prompt"
3. Set custom path (e.g., `/tmp/paw-test-prompts`)
4. Reload VS Code
5. Check output panel for custom path usage
6. Navigate to custom directory and verify agents present
7. Clear setting and reload to verify auto-detection resumes

**Uninstall Testing**:
1. Install PAW extension
2. Verify agents present in prompts directory
3. Note prompts directory path from output panel
4. Uninstall extension through VS Code (agents remain so they persist across restart)
5. Follow manual cleanup instructions and delete `paw-*.agent.md`
6. Reload VS Code (optional)
7. Open Copilot Chat and verify PAW agents no longer appear

**Platform Compatibility Testing**:
- Test on Windows with VS Code stable and Insiders
- Test on macOS with VS Code stable
- Test on Linux (Ubuntu/Debian) with Code-OSS
- Test on Linux with VSCodium
- Test in WSL environment
- For each: verify correct prompts directory path detected and agents installed

**Idempotent Installation Testing**:
1. Install PAW extension and verify agents installed
2. Delete 2-3 agent files from prompts directory
3. Reload VS Code
4. Check output panel - should show repair (missing files reinstalled)
5. Verify only missing files written (no re-writes of existing files)
6. Reload VS Code again
7. Verify "up to date" message (no unnecessary operations)

**Error Recovery Testing**:
1. Simulate disk full condition (platform-specific)
2. Install PAW extension
3. Verify installation fails gracefully with error message
4. Verify extension activates and commands work
5. Free disk space and reload VS Code
6. Verify installation completes successfully

## Migration and Compatibility

### Upgrading from Pre-Extension PAW (< 0.4.0)

PAW versions prior to 0.4.0 used workspace-level chatmode files rather than extension-managed agents. Users who adopted PAW before extension-based agents were introduced manually migrated their workflows when upgrading to 0.4.0+. No automatic migration is provided or needed—users installing the extension for the first time will have agents automatically installed, and those who manually installed agents can leave them in place or remove them manually (the extension installs to the same location).

### Upgrading Between Extension Versions

Upgrading between any extension versions (0.4.0+) is fully automatic. The system detects version changes and handles migration bidirectionally:
- **Upgrades** (e.g., 0.2.0 → 0.3.0): Automatic cleanup of old agents and installation of new agents
- **Downgrades** (e.g., 0.3.0 → 0.2.0): Automatic cleanup of newer agents and restoration of older agents
- **Agent renames**: Handled automatically (old filename deleted, new filename installed)
- **Agent additions**: New agents appear automatically
- **Agent removals**: Removed agents cleaned up automatically

No manual intervention required for any version transition.

### Breaking Changes

**Version 0.4.0** (first extension release):
- Introduced automatic agent installation
- Agents now managed by extension rather than manual workspace setup
- No breaking changes for existing workflows (agents work identically)

**Development Build Changes** (0.0.1-dev):
- Development builds force reinstallation on every activation
- Developers must build and install VSIX to test local agent changes
- Not a breaking change for users (only affects PAW contributors)

### Compatibility Notes

**VS Code Version Compatibility**:
- Requires VS Code 1.85.0 or later (uses modern extension APIs)
- Tested on VS Code stable, Insiders, Code-OSS, and VSCodium

**Platform Compatibility**:
- Fully supported: Windows, macOS, Linux, WSL
- Graceful degradation on unsupported platforms with manual override option

**GitHub Copilot Compatibility**:
- Extension installs agents regardless of Copilot presence
- Agents functional only when Copilot extension is active
- No version-specific Copilot requirements

**Future PAW Versions**:
- Agent installation system designed for forward compatibility
- Version change detection handles all future versions automatically
- No migration manifest maintenance required for agent renames/additions/removals

## References

- **Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/36
- **Specification**: `.paw/work/agent-installation-management/Spec.md`
- **Implementation Plan**: `.paw/work/agent-installation-management/ImplementationPlan.md`
- **VS Code Extension API**: https://code.visualstudio.com/api/references/vscode-api
- **VS Code Chat Participants**: https://code.visualstudio.com/api/extension-guides/chat
- **VS Code Profiles**: https://code.visualstudio.com/docs/editor/profiles

## Appendix: Development Workflow

### Working on PAW Agent Installation

For developers contributing to the agent installation feature:

**Local Development Setup**:
1. Clone repository: `git clone https://github.com/lossyrob/phased-agent-workflow.git`
2. Install dependencies: `npm install`
3. Build extension: `npm run compile`
4. Run tests: `npm test`
5. Package extension: `npm run package`

**Testing Local Changes**:
1. Make changes to agent installation code
2. Build VSIX: `npm run package`
3. Install VSIX: `code --install-extension paw-workflow-0.0.1-dev.vsix --force`
4. Reload VS Code
5. Check output panel for installation logs
6. Verify behavior matches expectations

**Development Version Behavior**:
- `package.json` version is `0.0.1-dev` during development
- The `-dev` suffix triggers automatic reinstallation on every activation
- This ensures agent content changes are reflected after rebuilding and reinstalling
- Production releases override version during GitHub Actions workflow

**Testing Migration Scenarios**:

Use the `scripts/test-migration.sh` helper to test version changes:

```bash
# Test upgrade to version 0.2.0
./scripts/test-migration.sh 0.2.0

# Install and verify
code --install-extension paw-workflow-0.2.0.vsix --force
# Reload VS Code and check migration logs

# Test downgrade back to 0.0.1-dev
./scripts/test-migration.sh 0.0.1-dev
code --install-extension paw-workflow-0.0.1-dev.vsix --force
```

The script temporarily updates `package.json` version, builds VSIX, and restores original version.

**Running Unit Tests**:
```bash
npm test
```

All tests should pass before submitting changes. Test coverage includes:
- Platform detection (all OS and variant combinations)
- Agent template loading and parsing
- Installation state management
- Version change detection
- Migration and cleanup logic
- Error handling and edge cases

**Debugging Installation Issues**:
1. Enable verbose logging in output channel
2. Check globalState contents via Developer: Inspect Context Keys
3. Manually inspect prompts directory for agent files
4. Test with custom `paw.promptDirectory` setting
5. Reproduce on clean VS Code install

### Project Structure

```
phased-agent-workflow/
├── agents/                      # Agent templates (bundled in extension)
│   ├── PAW-01A Specification.agent.md
│   ├── PAW-01B Spec Researcher.agent.md
│   └── ... (13 more agents)
├── src/
│   ├── extension.ts            # Extension activation and deactivation
│   ├── agents/
│   │   ├── platformDetection.ts # OS and VS Code variant detection
│   │   ├── agentTemplates.ts   # Agent template loading
│   │   └── installer.ts        # Installation orchestration
│   ├── commands/               # Extension commands
│   ├── tools/                  # Language model tools
│   └── test/                   # Unit tests
├── scripts/
│   ├── build-vsix.sh           # VSIX packaging script
│   └── test-migration.sh       # Version migration testing helper
├── package.json                # Extension manifest (version: 0.0.1-dev)
└── README.md                   # Project documentation
```

### Contributing Guidelines

When contributing to agent installation:

1. **Maintain idempotent operations**: All file operations should be safe to run multiple times
2. **Never block activation**: Errors should be logged and reported but never prevent extension activation
3. **Test on multiple platforms**: Verify changes work on Windows, macOS, and Linux
4. **Update tests**: Add test coverage for new behavior
5. **Document error conditions**: Provide clear, actionable error messages
6. **Preserve backward compatibility**: Version changes should handle both upgrades and downgrades

See `DEVELOPING.md` for full contributor guidelines.
