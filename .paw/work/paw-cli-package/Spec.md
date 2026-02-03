# Feature Specification: PAW CLI Installer

**Branch**: feature/paw-cli-package  |  **Created**: 2026-02-03  |  **Status**: Draft
**Input Brief**: Create npm package for installing PAW into GitHub Copilot CLI

## Overview

PAW (Phased Agent Workflow) currently requires manual file copying to install agents and skills into the GitHub Copilot CLI. Users must locate the correct files, understand the directory structure (`~/.copilot/agents/` and `~/.copilot/skills/`), and manually copy each component. This friction discourages adoption and makes updates tedious.

The @paw/cli package provides a simple command-line tool that handles installation, upgrades, and removal of PAW components. Users can install with a single command (`npx @paw/cli install copilot`) without understanding the underlying file structure. The CLI tracks installed versions to enable seamless upgrades when new releases are published.

This tool serves as the first step toward a broader PAW CLI ecosystem. By starting with installation management, we establish the @paw/cli package namespace and CLI patterns that future capabilities (autonomous execution, workflow orchestration) will build upon.

## Objectives

- Enable one-command PAW installation for Copilot CLI users
- Provide clear upgrade path when new PAW versions are released
- Track installation state to prevent conflicts and enable clean uninstallation
- Establish @paw/cli as the canonical package for PAW tooling

## User Scenarios & Testing

### User Story P1 – First-Time Installation
Narrative: A developer wants to use PAW with Copilot CLI. They run a single npx command and PAW is ready to use in their next Copilot CLI session.

Independent Test: Run `npx @paw/cli install copilot` on a clean system; verify PAW agent responds in Copilot CLI.

Acceptance Scenarios:
1. Given no prior PAW installation, When user runs `npx @paw/cli install copilot`, Then agents are copied to `~/.copilot/agents/` and skills to `~/.copilot/skills/`
2. Given installation completes, When user opens Copilot CLI, Then PAW agent is available and functional
3. Given installation succeeds, Then manifest file is written to `~/.paw/copilot-cli/manifest.json` with version info

### User Story P2 – Upgrade to New Version
Narrative: PAW releases a new version with bug fixes. The user checks for updates and upgrades with one command.

Independent Test: With older version installed, run `paw upgrade`; verify new version is active.

Acceptance Scenarios:
1. Given PAW 1.0.0 installed, When PAW 1.1.0 is available and user runs `paw upgrade`, Then files are updated and manifest reflects new version
2. Given current version installed, When user runs `paw upgrade`, Then message indicates already up-to-date
3. Given upgrade completes, When user opens Copilot CLI, Then new version features are available

### User Story P3 – View Installation Status
Narrative: User wants to confirm PAW is installed and check which version they have.

Independent Test: Run `paw list` after installation; verify version and component list displayed.

Acceptance Scenarios:
1. Given PAW is installed, When user runs `paw list`, Then installed version and component names are displayed
2. Given PAW is not installed, When user runs `paw list`, Then message indicates no installation found

### User Story P4 – Clean Uninstallation
Narrative: User no longer wants PAW or wants to start fresh. They remove all PAW components cleanly.

Independent Test: Run `paw uninstall`; verify PAW files removed and Copilot CLI works without them.

Acceptance Scenarios:
1. Given PAW is installed, When user runs `paw uninstall`, Then all PAW agents and skills are removed from `~/.copilot/`
2. Given uninstall completes, Then manifest file is removed from `~/.paw/copilot-cli/`
3. Given uninstall completes, When user opens Copilot CLI, Then PAW agent is no longer available (but CLI works normally)

### User Story P5 – Reinstall Over Existing Files
Narrative: User has manually modified files or has a corrupted installation. They want to force a clean reinstall.

Independent Test: Modify an installed file, run `paw install copilot --force`, verify original content restored.

Acceptance Scenarios:
1. Given PAW files exist (possibly modified), When user runs `paw install copilot --force`, Then files are overwritten with fresh copies
2. Given existing files without --force, When user runs `paw install copilot`, Then user is prompted to confirm overwrite

### Edge Cases
- `~/.copilot/` directory doesn't exist: Create it during installation
- `~/.copilot/agents/` or `~/.copilot/skills/` have non-PAW files: Leave untouched, only manage PAW-specific files
- Network unavailable during upgrade check: Show error, suggest retry or `--offline` usage
- Manifest file corrupted or missing but files exist: Detect orphaned installation, offer repair
- Insufficient permissions to write to home directory: Clear error message with suggested fix

## Requirements

### Functional Requirements
- FR-001: Install PAW agents to `~/.copilot/agents/` (Stories: P1, P5)
- FR-002: Install PAW skills to `~/.copilot/skills/` (Stories: P1, P5)
- FR-003: Write manifest to `~/.paw/copilot-cli/manifest.json` tracking installed version and file list (Stories: P1, P2, P3, P4)
- FR-004: Check npm registry for newer versions (Stories: P2)
- FR-005: Update installed files to match new version (Stories: P2)
- FR-006: List installed version and components (Stories: P3)
- FR-007: Remove all PAW-managed files on uninstall (Stories: P4)
- FR-008: Support `--force` flag to overwrite without confirmation (Stories: P5)
- FR-009: Prompt for confirmation when overwriting existing files (Stories: P5)
- FR-010: Bundle agent/skill files within npm package for offline installation (Stories: P1, P2)

### Key Entities
- **Manifest**: JSON file tracking installation state (version, installed files, install date)
- **Agent**: Markdown file in `~/.copilot/agents/` defining PAW agent behavior
- **Skill**: Directory in `~/.copilot/skills/` containing SKILL.md and related files

### Cross-Cutting / Non-Functional
- CLI should complete installation in under 5 seconds on typical systems
- All output should be human-readable with clear success/error indication
- Exit codes: 0 for success, non-zero for errors
- No runtime dependencies beyond Node.js (works with npx)

## Success Criteria
- SC-001: User can install PAW with single command and use it immediately (FR-001, FR-002)
- SC-002: User can upgrade to new version without manual file management (FR-004, FR-005)
- SC-003: User can view current installation state at any time (FR-003, FR-006)
- SC-004: User can completely remove PAW installation (FR-007)
- SC-005: Installation works offline after initial package download (FR-010)

## Assumptions
- Users have Node.js 18+ installed (required for npx and Copilot CLI)
- The `~/.copilot/` directory structure (`agents/`, `skills/`) is stable in Copilot CLI
- npm registry is accessible for upgrade version checks (graceful degradation if not)
- PAW files are the only files matching `PAW*.agent.md` and `paw-*` skill directories

## Scope

In Scope:
- `install copilot` command for Copilot CLI target
- `upgrade` command to update to latest version
- `list` command to show installation status
- `uninstall` command to remove installation
- Manifest file for version tracking
- `--force` flag for install/upgrade
- npx and global install support

Out of Scope:
- VS Code extension installation (handled by extension marketplace)
- Other CLI targets (Claude Code, etc.) - future work
- Autonomous workflow execution features
- Configuration management beyond version tracking
- Rollback to previous versions

## Dependencies
- npm registry for package distribution and version checks
- GitHub Copilot CLI directory structure conventions

## Risks & Mitigations
- **Copilot CLI directory structure changes**: Low risk currently; mitigate by documenting minimum tested CLI version
- **File conflicts with user modifications**: Prompt before overwrite; `--force` for explicit override
- **npm registry unavailable**: Graceful error handling; offline install works after initial download

## References
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/183
- Context: zignore-notes/paw-cli-architecture-sketch.md (broader vision, not in scope for this issue)
