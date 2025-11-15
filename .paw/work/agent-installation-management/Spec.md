# Feature Specification: Agent Installation Management

**Branch**: feature/agent-installation-management  |  **Created**: 2024-11-14  |  **Status**: Draft
**Input Brief**: Add agent management capabilities to the VS Code extension, enabling users to install and manage PAW agents.

## Overview

When developers install the PAW VS Code extension, they gain immediate access to specialized AI agents (Specification, Planning, Implementation, Review, and Documentation) that guide them through structured software development workflows. These agents appear as custom personalities in GitHub Copilot Chat, each trained for a specific phase of development. Rather than requiring manual setup, the extension automatically discovers the user's VS Code configuration directory and installs agent definition files there during activation, ensuring agents are available the moment a developer needs them.

As PAW evolves and releases new versions, developers benefit from agent improvements without manual intervention. When the extension activates after an update, it detects version changes and refreshes installed agent files with the latest instructions. The system handles common real-world complications gracefully. When file system permissions prevent installation, developers receive clear error messages with actionable remediation steps rather than silent failures. If VS Code crashes mid-installation, the next activation completes any partial work automatically. When PAW renames or removes agents between versions, obsolete files are cleaned up automatically. Developers working on different machines experience consistent agent availability because the extension installs to deterministic, platform-appropriate locations that VS Code recognizes across all instances.

This automatic agent management transforms PAW from a documentation framework into an integrated development companion, reducing setup friction while maintaining consistency across all installations.

**Note**: Custom instructions for agents will be handled as a separate feature through a PAW Context tool (see issue #86). This implementation focuses solely on installing base agent templates.

## Objectives

- Enable developers to access PAW agents immediately after installing the extension without manual configuration steps
- Keep installed agents synchronized with PAW version updates, ensuring developers always work with current instructions
- Provide transparent feedback when installation encounters problems, with enough detail for developers to resolve issues independently
- Ensure installation operations complete reliably even when interrupted by system events or VS Code crashes (Rationale: partial installations create confusing states where some agents work while others are missing)
- Remove obsolete agent files during version migrations

**Note**: Custom instructions capability will be implemented separately through a PAW Context tool (issue #86) to avoid workspace-specific content leaking into global agent files.

## User Scenarios & Testing

### User Story P1 – First-Time Agent Installation

Narrative: A developer installs the PAW VS Code extension for the first time. When they open VS Code and invoke any PAW command (triggering extension activation), the extension locates the user's VS Code configuration directory and writes agent definition files to the `User/prompts/` subdirectory. Within seconds, all PAW agents (Specification, Planning, Implementation, Review, Documentation) become available in GitHub Copilot Chat without requiring VS Code restart or additional setup steps.

Independent Test: Install PAW extension, invoke `PAW: Initialize Workflow Context` command, verify all PAW agents appear in Copilot Chat agent selector.

Acceptance Scenarios:
1. Given a fresh VS Code installation with PAW extension just installed, When the developer invokes any PAW command for the first time, Then the extension creates agent files in `<config>/User/prompts/` and logs success confirmation to the output channel.
2. Given agent files successfully written to the prompts directory, When the developer opens Copilot Chat, Then all PAW agents (PAW-01A Specification, PAW-02 Planning, PAW-03 Implementation, PAW-04 Review, PAW-05 Documentation) appear in the agent selector.
3. Given the extension has installed agents, When the developer opens a new VS Code window without PAW commands, Then previously installed agents remain available (agents persist across sessions).

### User Story P2 – Automatic Agent Updates and Rollback

Narrative: A developer using PAW 0.3.0 updates to PAW 0.4.0 through VS Code's extension manager. When VS Code restarts and the PAW extension activates, it detects the version change by comparing stored version metadata against the current extension version. The extension then refreshes all agent files by overwriting them with the new versions, ensuring behavioral improvements and instruction updates take effect immediately. If the developer later encounters issues with 0.4.0 and downgrades to 0.3.0, the extension detects the version regression during activation and replaces the 0.4.0 agent files with 0.3.0 versions. This bidirectional version management ensures developers can safely move between PAW versions without leaving orphaned or mismatched agents.

Independent Test: With PAW 0.3.0 agents installed, update extension to 0.4.0, restart VS Code, verify agent files contain 0.4.0 content. Then downgrade to 0.3.0, restart VS Code, verify agent files revert to 0.3.0 content.

Acceptance Scenarios:
1. Given PAW 0.3.0 agents installed with stored version marker, When the extension activates after upgrading to 0.4.0, Then the extension detects version mismatch and overwrites all agent files with 0.4.0 versions.
2. Given PAW 0.4.0 agents installed, When the developer downgrades to PAW 0.3.0 and restarts VS Code, Then the extension detects version regression and overwrites all agent files with 0.3.0 versions.
3. Given agent files have been refreshed (upgrade or downgrade), When the developer checks the output channel, Then installation logs show which files were updated and confirm the current version installation complete.
4. Given the version change completed successfully, When the developer invokes any PAW agent, Then the agent exhibits behavior matching the currently installed PAW extension version.

### User Story P3 – Installation Error Recovery

Narrative: A developer's VS Code configuration directory has restrictive permissions due to corporate security policies, preventing write access. When the PAW extension attempts to install agents during activation, file system operations fail. The extension catches these errors gracefully, logs detailed error information to the output channel (including file paths and permission details), and displays a user notification explaining the problem with actionable remediation steps (such as "Check file permissions for <path>" or "Set the 'paw.promptDirectory' setting to specify a custom location"). The extension completes activation successfully despite the installation failure, allowing the developer to use PAW's non-agent features and resolve the permission issue independently.

Independent Test: Simulate permission-denied error on prompts directory, activate extension, verify error notification appears and extension remains functional.

Acceptance Scenarios:
1. Given the prompts directory is not writable, When the extension attempts agent installation, Then the extension logs detailed error (path, error type) to output channel and displays user notification with remediation steps including the setting override option.
2. Given installation failed due to permissions, When the developer opens the output channel, Then they see specific file paths that failed and suggested remediation actions including the 'paw.promptDirectory' setting.
3. Given agent installation encountered errors, When the developer invokes non-agent PAW commands, Then those commands work normally (extension activation succeeded despite installation failure).
4. Given the auto-detected platform is unsupported, When the extension attempts agent installation, Then the error message indicates that the 'paw.promptDirectory' setting can be used to manually specify the location.

### User Story P5 – Idempotent Installation Recovery

Narrative: A developer's system crashes while the PAW extension is installing agents, leaving only 3 of 5 agent files written. When VS Code restarts and the extension activates again, it performs a completeness check by comparing installed files against the expected set. The extension detects missing agent files and writes them, completing the installation. Because the installation logic is idempotent (checking what exists before writing), subsequent activations perform quick validation passes without redundant rewrites, ensuring efficiency while guaranteeing installation integrity.

Independent Test: Delete 2 of 5 installed agent files, restart VS Code, verify extension re-installs missing files without re-writing existing ones.

Acceptance Scenarios:
1. Given 3 of 5 agent files exist in prompts directory, When extension activates, Then it writes the 2 missing files without modifying the 3 existing files.
2. Given all agent files are present and version markers match, When extension activates, Then no file writes occur (idempotent behavior).
3. Given agent file content was manually corrupted, When extension activates with version marker intact, Then the extension does not rewrite files (preserves user modifications until explicit version update).

### User Story P5 – Version Migration and Cleanup

Narrative: As PAW evolves, agent filenames may change (e.g., renaming "Planner" to "Planning" or changing file extensions). A developer running PAW 0.5.0 has agents installed from that version. When they upgrade to 0.6.0 which renames an agent file, the extension installs the new file and removes the old one based on its internal migration manifest. If they later downgrade back to 0.5.0 to avoid a regression, the extension reverses the migration by restoring the 0.5.0 filename and removing the 0.6.0 file. This ensures the developer's prompts directory always contains exactly the agents for their current PAW version, without orphaned files from other versions. Note that PAW versions prior to 0.4.0 used chatmodes stored in workspaces, not extension-managed agents, so no chatmode→agent migration is needed (users manually migrated when adopting 0.4.0+).

Independent Test: Install PAW 0.5.0 agents including `paw-planner.agent.md`, upgrade to 0.6.0 which uses `paw-planning.agent.md`, verify old file removed and new file installed. Then downgrade to 0.5.0, verify `paw-planning.agent.md` removed and `paw-planner.agent.md` restored.

Acceptance Scenarios:
1. Given PAW 0.5.0 installed `paw-planner.agent.md`, When upgrading to 0.6.0 with new `paw-planning.agent.md` filename, Then the extension installs new file and removes old file.
2. Given PAW 0.6.0 installed `paw-planning.agent.md`, When downgrading to 0.5.0 with old `paw-planner.agent.md` filename, Then the extension installs old file and removes new file.
3. Given multiple agent files exist from previous versions, When extension activates with current version, Then all agent files not belonging to the current version are removed.

### User Story P6 – Extension Uninstall Cleanup

Narrative: A developer decides to uninstall the PAW extension, either to switch to a different workflow tool or because they no longer need it. When the extension is uninstalled, VS Code triggers the extension's deactivation hook. The extension uses this opportunity to clean up all installed agent files from the `User/prompts/` directory, removing the PAW agents from Copilot Chat. This prevents orphaned agent files from cluttering the developer's VS Code configuration and ensures a clean uninstall experience. The developer's VS Code environment returns to its pre-PAW state without manual cleanup.

Independent Test: With PAW agents installed, uninstall PAW extension, verify all PAW agent files are removed from `User/prompts/` directory.

Acceptance Scenarios:
1. Given PAW extension is installed with agents in `User/prompts/`, When the developer uninstalls the PAW extension through VS Code's extension manager, Then all PAW-managed agent files are deleted from the prompts directory.
2. Given PAW agents have been removed, When the developer opens Copilot Chat after uninstall completes, Then PAW agents no longer appear in the agent selector.
3. Given the extension was uninstalled but file deletion failed due to permissions, When the developer checks the output channel, Then they see an error message explaining the cleanup failure with paths to manually remove.

### Edge Cases

- **Multiple VS Code instances**: If multiple VS Code windows activate simultaneously and attempt to write agents concurrently, file system race conditions may occur. Expected behavior: Last writer wins; idempotent installation ensures eventual consistency across all instances.
- **User manual modification of agent files**: If a user manually edits an installed agent file, the next version upgrade will overwrite their changes (because agents are treated as managed assets). Expected behavior: Changes lost on upgrade.
- **Non-standard VS Code distributions**: VSCodium and Code-OSS use different configuration paths than standard VS Code. Expected behavior: Extension detects distribution-specific paths and installs to appropriate location for each variant.
- **Disk full during installation**: If disk space is exhausted mid-write, partial files may be written. Expected behavior: File system error caught, error notification displayed, idempotent installation completes missing files on next activation.
- **Copilot extension not installed**: If GitHub Copilot extension is not installed, agent files are written but unusable. Expected behavior: Agents installed successfully; no error (agents become available when user later installs Copilot).
- **Profile switching**: VS Code supports multiple profiles, but user prompts directory is global (not per-profile). Expected behavior: Agents available across all profiles; no per-profile installation needed.

## Requirements

### Functional Requirements

- FR-001: System shall determine the platform-appropriate VS Code user configuration directory path on Windows, macOS, and Linux (Stories: P1, P2, P3, P4, P5, P6)
- FR-001A: System shall provide a user-configurable setting to override the auto-detected prompt directory path (Stories: P4)
- FR-002: System shall support standard VS Code, VS Code Insiders, Code-OSS, and VSCodium distribution variants with their respective configuration paths (Stories: P1)
- FR-003: System shall detect whether agent installation is needed by comparing installed agent files against expected set and version markers (Stories: P1, P2, P5)
- FR-004: System shall write agent definition files to the `User/prompts/` subdirectory within the VS Code configuration directory (Stories: P1, P2, P5)
- FR-005: System shall read agent template content from bundled extension resources using extension context absolute paths (Stories: P1, P2)
- FR-006: System shall perform agent installation during extension activation when triggered by activation events (Stories: P1, P2, P3)
- FR-007: System shall store installation version marker in extension global state for version comparison on subsequent activations (Stories: P2, P4)
- FR-008: System shall compare stored version marker against current extension version to detect version changes (upgrades and downgrades) (Stories: P2, P5)
- FR-009: System shall overwrite existing agent files when version change (upgrade or downgrade) is detected (Stories: P2)
- FR-010: System shall handle file system errors gracefully by catching exceptions, logging details, and displaying user notifications (Stories: P3)
- FR-011: System shall include specific error details in notifications (file paths, error types, suggested actions) when installation fails (Stories: P3)
- FR-012: System shall allow extension activation to complete successfully even when agent installation fails (Stories: P3)
- FR-013: System shall validate installation completeness by checking for expected agent files on each activation (Stories: P4)
- FR-014: System shall write only missing agent files when some files already exist (idempotent installation) (Stories: P4)
- FR-015: System shall maintain internal migration manifest mapping agent filenames across versions, supporting both forward (upgrade) and backward (downgrade) migrations (Stories: P5)
- FR-016: System shall remove obsolete agent files not belonging to the current version during version changes (upgrades and downgrades) (Stories: P5)
- FR-017: System shall log all installation operations (file writes, deletions, errors) to a dedicated output channel (Stories: P1, P2, P3, P4, P5)
- FR-018: System shall support agent naming pattern `paw-<agent-name>.agent.md` for installed files (Stories: P1, P2, P5)
- FR-019: System shall generate agent files with YAML frontmatter containing name and description fields (Stories: P1, P2)
- FR-020: System shall remove all PAW-managed agent files during extension deactivation when uninstall is detected (Stories: P6)

### Key Entities

- **Agent Template**: Bundled markdown file containing base PAW agent instructions, stored in extension resources, read-only
- **Installed Agent File**: Agent definition file with `.agent.md` extension, written to VS Code `User/prompts/` directory, managed by extension
- **Version Marker**: String value stored in extension global state, represents version of currently installed agents, used for upgrade detection
- **Migration Manifest**: Internal data structure mapping old agent filenames to new filenames, enables cleanup of renamed or removed agents

### Cross-Cutting / Non-Functional

- **Reliability**: Installation operations must be idempotent, completing successfully when retried after interruption without corrupting existing state
- **Observability**: All file operations, version checks, and errors must be logged to output channel with sufficient detail for troubleshooting
- **Error Tolerance**: Extension must activate successfully and provide core functionality even when agent installation fails due to file system issues
- **Platform Compatibility**: Installation logic must detect and handle platform-specific VS Code configuration directory paths correctly across Windows, macOS, Linux
- **Distribution Compatibility**: System must recognize and support VS Code Insiders, Code-OSS, and VSCodium variants with their distinct configuration paths

## Success Criteria

- SC-001: Fresh PAW installation writes all 5 agent files to the user's `User/prompts/` directory within 5 seconds of first activation (FR-001, FR-001A, FR-003, FR-004, FR-005)
- SC-001A: When 'paw.promptDirectory' setting is configured with a custom path, agents are installed to that path instead of the auto-detected location (FR-001A)
- SC-002: Installed agent files appear in GitHub Copilot Chat agent selector without requiring VS Code restart when Copilot extension is active (FR-004, FR-019)
- SC-003: Version upgrade from 0.3.0 to 0.4.0 overwrites all agent files with 0.4.0 content and updates stored version marker to 0.4.0; subsequent downgrade to 0.3.0 restores 0.3.0 agent files (FR-007, FR-008, FR-009)
- SC-004: File permission errors during installation produce error notifications containing the specific file path that failed and at least one remediation suggestion including the 'paw.promptDirectory' setting override (FR-001A, FR-010, FR-011)
- SC-005: Extension activation completes successfully (extension status shows "Active") even when all agent file writes fail due to file system errors (FR-012)
- SC-006: Deleting 2 of 5 installed agent files and reactivating the extension results in only the 2 missing files being rewritten (FR-013, FR-014)
- SC-007: When all expected agent files exist with correct version marker, reactivation performs no file writes (verified via output channel logs showing "Installation up to date") (FR-003, FR-014)
- SC-008: Upgrading from version 0.5.0 with `paw-planner.agent.md` to version 0.6.0 with `paw-planning.agent.md` results in old file deleted and new file created; downgrading back to 0.5.0 reverses the migration (FR-015, FR-016)
- SC-009: Installation on Windows writes agents to `%APPDATA%\Code\User\prompts\` directory (FR-001, FR-002)
- SC-010: Installation on macOS writes agents to `~/Library/Application Support/Code/User/prompts/` directory (FR-001, FR-002)
- SC-011: Installation on Linux writes agents to `~/.config/Code/User/prompts/` directory (FR-001, FR-002)
- SC-012: Installation on VSCodium writes agents to `~/.config/VSCodium/User/prompts/` directory (FR-002)
- SC-013: Output channel logs contain timestamps, operation type (install/update/delete), file path, and outcome (success/failure) for every file operation (FR-017)
- SC-014: Extension successfully installs agents even when GitHub Copilot extension is not installed (FR-004, FR-012)
- SC-015: When disk is full, installation failure produces error notification explaining disk space issue and extension continues functioning (FR-010, FR-011, FR-012)
- SC-016: Uninstalling the PAW extension removes all PAW-managed agent files from the `User/prompts/` directory, verified by checking that no `paw-*.agent.md` files remain (FR-020)

## Assumptions

- **VS Code configuration directory paths are deterministic and follow documented platform conventions**: Research confirms standard paths (`%APPDATA%\Code\User` on Windows, `~/Library/Application Support/Code/User` on macOS, `~/.config/Code/User` on Linux) have been stable across VS Code versions. Extension will hardcode these paths since no API exists to query them programmatically.

- **GitHub Copilot discovers agent files at Copilot extension initialization time**: Research indicates agent discovery happens during Copilot startup, not continuously. Users may need to reload Copilot or VS Code for newly installed agents to appear in the chat interface. Extension will not attempt to force Copilot refresh.

- **User prompts directory is global across all VS Code profiles**: Research confirms the `User/prompts/` directory is shared by all profiles rather than being profile-specific. Extension will install agents once to this global location rather than per-profile.

- **Agent file naming follows pattern `paw-<agent-name>.agent.md`**: Based on PAW's current agent naming conventions and VS Code's recognition of `.agent.md` extension. Extension will use this pattern consistently for all installed agents.

- **Activation event `onStartupFinished` provides appropriate timing for agent installation**: VS Code fires this event after initial workspace setup completes but before user interaction begins, providing suitable context for file system operations. Extension will use this activation event to trigger installation logic.

- **Version upgrades always overwrite agent files completely**: To maintain consistency and avoid drift, extension treats installed agent files as fully managed assets that are replaced entirely on each version update, never merged or partially updated.

- **Migration manifest is manually maintained within extension code**: Given the infrequent nature of agent renames/removals, extension will use hardcoded migration rules rather than external manifest files or dynamic discovery of renamed agents.

- **Output channel logging provides sufficient troubleshooting detail**: For users encountering installation issues, detailed logs in a dedicated output channel offer more practical debugging support than telemetry or separate log files.

- **File system race conditions during concurrent writes are acceptable**: If multiple VS Code instances write agent files simultaneously, the last writer wins. Since agent content is deterministic for a given version, eventual consistency is sufficient.

## Scope

### In Scope

- Automatic agent installation during extension activation
- Agent file updates during version changes (both upgrades and downgrades)
- Platform-specific configuration directory path detection (Windows, macOS, Linux)
- Support for VS Code distribution variants (standard, Insiders, Code-OSS, VSCodium)
- Error handling and user notifications for file system failures
- Idempotent installation that completes partial installations
- Migration and cleanup of agent files during version changes (forward and backward)
- Extension uninstall cleanup to remove all installed agent files
- Version tracking using extension global state
- Detailed operation logging to output channel

### Out of Scope

- Custom instructions for agents (handled separately through PAW Context tool - see issue #86)
- Composition of workspace or user-level instruction files with agent templates
- Migration from pre-0.4.0 chatmode files to extension-managed agents (users manually migrated when adopting extension-based workflow)
- Manual agent installation UI or commands (agents install automatically only)
- User configuration settings for installation location or behavior (except `paw.promptDirectory` override)
- Backup or preservation of user modifications to installed agent files (agents are managed assets)
- Per-profile agent installation (agents install globally, shared by all profiles)
- Automatic Copilot refresh or reload after agent installation (user must reload manually)
- Dynamic agent discovery from external sources or registries
- Agent file validation beyond version marker comparison
- Manual rollback UI or commands (downgrade via VS Code's extension version picker provides rollback)
- Telemetry or analytics about agent installation success/failure rates
- GUI for managing or viewing installed agents (VS Code's native Copilot UI provides this)
- Hot-reload of agent changes without VS Code restart

## Dependencies

- **VS Code Extension API**: Core APIs for extension activation, file system access (`workspace.fs`), user notifications (`window.showErrorMessage`), output channels, and extension context (global state, resource paths)
- **Node.js `os` module**: Required for `os.homedir()` to resolve user home directory path and `os.platform()` to detect operating system
- **GitHub Copilot extension** (optional): When installed, enables agent functionality. PAW extension installs agents regardless of Copilot presence, but agents remain non-functional until user installs Copilot
- **VS Code file system permissions**: Extension requires write access to VS Code user configuration directory; if unavailable, graceful degradation with error notifications occurs
- **Extension bundled agent templates**: Agent installation depends on base template files being correctly bundled in extension package at build time

## Risks & Mitigations

- **VS Code changes configuration directory paths in future releases**: Impact: Installation writes to wrong location, agents not discovered. Mitigation: Monitor VS Code release notes for configuration changes; maintain version matrix of paths; consider detecting VS Code version and using conditional paths.

- **Copilot changes agent discovery mechanism or file format**: Impact: Installed agents not recognized by Copilot despite correct installation. Mitigation: Track Copilot agent specification updates; maintain compatibility with documented `.agent.md` format; test against Copilot Insiders builds for early warning.

- **Extension activation occurs before file system is ready**: Impact: Installation fails due to I/O errors on slow systems or network drives. Mitigation: Use activation event `onStartupFinished` rather than immediate activation; implement retry logic with exponential backoff for file operations.

- **User manually modifies installed agent files expecting persistence**: Impact: User changes lost on next version upgrade, causing confusion. Mitigation: Document that agents are managed assets; include clear comments in agent file headers; consider warning notification on first upgrade.

- **Concurrent VS Code instances write agents simultaneously**: Impact: File corruption or incomplete writes due to race conditions. Mitigation: Rely on file system atomicity for individual file writes; accept last-writer-wins behavior as sufficient given idempotent installation; document behavior if users report issues.

- **Extension global state becomes corrupted or cleared**: Impact: Version tracking fails, causing unnecessary reinstallation or failed upgrade detection. Mitigation: Treat missing version marker as fresh install (safe default); use version marker as optimization rather than strict requirement; log state mismatches for diagnostics.

- **Extension deactivation hook fails or is not called during uninstall**: Impact: Agent files remain in prompts directory after PAW uninstall, appearing as orphaned agents in Copilot Chat. Mitigation: Log uninstall cleanup operations; document manual cleanup steps in extension README; accept that VS Code's uninstall semantics may not guarantee cleanup in all scenarios (e.g., forced termination).

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/36
- Research: .paw/work/agent-installation-management/SpecResearch.md
- External: VS Code Custom Chat Participants Documentation (https://code.visualstudio.com/api/extension-guides/chat)
- External: VS Code Profiles Documentation (https://code.visualstudio.com/docs/editor/profiles)

## Glossary

- **Agent**: Custom GitHub Copilot Chat personality defined by markdown instruction file, specialized for specific PAW workflow phase
- **Agent Template**: Base instruction content for an agent, bundled in extension resources
- **Installed Agent File**: `.agent.md` file written to VS Code `User/prompts/` directory, discovered and loaded by GitHub Copilot
- **Version Marker**: String stored in extension global state representing version of currently installed agents, used to detect when updates are needed
- **Migration Manifest**: Internal data structure listing agent filename changes between versions, enables cleanup of obsolete files
- **Idempotent Installation**: Installation logic that produces same result when run multiple times, safely completing partial installations without corruption
- **User Configuration Directory**: Platform-specific directory where VS Code stores user-level settings, extensions, and other configuration data
- **Global State**: Persistent key-value storage provided by VS Code extension API, survives across extension activations and VS Code restarts
- **Output Channel**: Named log destination in VS Code's Output panel where extension writes operational messages and diagnostic information

