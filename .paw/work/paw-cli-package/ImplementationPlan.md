# PAW CLI Installer Implementation Plan

## Overview

Create the `@paw/cli` npm package that installs PAW agents and skills to the GitHub Copilot CLI configuration directory. The package will live in `cli/` as a monorepo workspace alongside the VS Code extension. Build-time conditional processing simplifies runtime—agents/skills are pre-processed during npm publish.

## Current State Analysis

- **Agents**: 2 files in `agents/` (`PAW.agent.md`, `PAW Review.agent.md`) with conditional blocks
- **Skills**: 26 directories in `skills/`, each containing only `SKILL.md` with conditional blocks
- **Export logic**: Fully implemented in `scripts/export-for-cli.sh` (conditional block processing, filename normalization)
- **Package config**: Root `package.json` is VS Code extension only; no CLI package exists
- **Target paths**: `~/.copilot/agents/`, `~/.copilot/skills/`, `~/.paw/copilot-cli/manifest.json`

## Desired End State

- `npx @paw/cli install copilot` copies pre-processed agents/skills to `~/.copilot/`
- `paw upgrade` checks npm registry and updates installation
- `paw list` shows version and installed components
- `paw uninstall` removes all PAW files cleanly
- Manifest tracks installation state at `~/.paw/copilot-cli/manifest.json`

## What We're NOT Doing

- VS Code installation (handled by extension marketplace)
- Other CLI targets (Claude Code, etc.)—future work
- Runtime conditional processing—build-time for now
- Rollback to previous versions
- Global config file for CLI preferences

## Phase Status

- [ ] **Phase 1: Package Foundation** - CLI entry point, install command, manifest management
- [ ] **Phase 2: Complete Commands** - upgrade, list, uninstall commands
- [ ] **Phase 3: Build Pipeline** - Pre-process assets, npm publish workflow
- [ ] **Phase 4: Documentation** - User guide, README, Docs.md

---

## Phase 1: Package Foundation

### Changes Required

- **`cli/package.json`**: npm package configuration
  - Name: `@paw/cli`
  - Bin: `paw` → `bin/paw.js`
  - No runtime dependencies (use Node.js built-ins: `fs`, `path`, `os`, `readline`)
  - Files: include `bin/`, `dist/`

- **`cli/bin/paw.js`**: CLI entry point (shebang, command router)
  - Parse args: `install`, `upgrade`, `list`, `uninstall`
  - Route to command handlers in `lib/commands/`

- **`cli/lib/commands/install.js`**: Install command
  - Accept target argument (`copilot` only for now)
  - Validate target, detect existing installation
  - Copy agents from `dist/agents/` → `~/.copilot/agents/`
  - Copy skills from `dist/skills/` → `~/.copilot/skills/`
  - Support `--force` flag to skip confirmation
  - Prompt for overwrite if files exist (FR-009)

- **`cli/lib/manifest.js`**: Manifest management
  - Read/write `~/.paw/copilot-cli/manifest.json`
  - Schema: `{ version, installedAt, target, files: { agents: [], skills: [] } }`
  - Create directory if missing

- **`cli/lib/paths.js`**: Path utilities
  - `getCopilotDir()` → `~/.copilot/`
  - `getManifestPath()` → `~/.paw/copilot-cli/manifest.json`
  - Cross-platform home directory handling

- **Tests**: `cli/test/install.test.js`
  - Fresh install creates files and manifest
  - Existing files without `--force` prompts
  - `--force` overwrites without prompting
  - Creates missing directories

### Success Criteria

#### Automated Verification
- [ ] Tests pass: `cd cli && npm test`
- [ ] Lint passes: `cd cli && npm run lint`

#### Manual Verification
- [ ] `node cli/bin/paw.js install copilot` installs to `~/.copilot/`
- [ ] Manifest written to `~/.paw/copilot-cli/manifest.json`
- [ ] Re-running without `--force` prompts for confirmation
- [ ] `--force` skips confirmation

---

## Phase 2: Complete Commands

### Changes Required

- **`cli/lib/commands/list.js`**: List command
  - Read manifest, display version and component counts
  - Show "not installed" message if no manifest

- **`cli/lib/commands/uninstall.js`**: Uninstall command
  - Read manifest to get file list
  - Remove agents and skills listed in manifest
  - Remove empty skill directories
  - Remove manifest file
  - Handle orphaned installation (files exist, no manifest)

- **`cli/lib/commands/upgrade.js`**: Upgrade command
  - Check npm registry for latest version (`npm view @paw/cli version`)
  - Compare with installed version from manifest
  - If newer: backup manifest, run install, update manifest
  - If current: display "already up-to-date"
  - Handle network errors gracefully

- **`cli/lib/registry.js`**: npm registry queries
  - `getLatestVersion()` → fetch from registry.npmjs.org
  - Use Node.js `https` module (no dependencies)
  - Timeout handling, error messages

- **Tests**: `cli/test/commands.test.js`
  - `list` shows version when installed
  - `list` shows message when not installed
  - `uninstall` removes files and manifest
  - `upgrade` detects newer version
  - `upgrade` handles network failure gracefully

### Success Criteria

#### Automated Verification
- [ ] Tests pass: `cd cli && npm test`
- [ ] All commands have test coverage

#### Manual Verification
- [ ] `paw list` shows version and component count
- [ ] `paw uninstall` removes all PAW files
- [ ] `paw upgrade` checks registry (mock or real)
- [ ] Network failure shows helpful error

---

## Phase 3: Build Pipeline

### Changes Required

- **`cli/scripts/build-dist.js`**: Asset pre-processing script
  - Read agents from `../agents/`, process conditionals, write to `dist/agents/`
  - Read skills from `../skills/`, process conditionals, write to `dist/skills/`
  - Port conditional logic from `scripts/export-for-cli.sh` to JavaScript
  - Normalize agent filenames (spaces → hyphens)

- **`cli/package.json`**: Add build scripts
  - `"build": "node scripts/build-dist.js"`
  - `"prepublishOnly": "npm run build"`
  - `"files": ["bin/", "lib/", "dist/"]`

- **`.github/workflows/publish-cli.yml`**: npm publish workflow
  - Trigger: tag push matching `cli-v*`
  - Steps: checkout, setup Node, build, publish to npm
  - Use `NPM_TOKEN` secret

- **`cli/.gitignore`**: Ignore `dist/` (generated at build time)

- **Tests**: `cli/test/build.test.js`
  - Conditionals processed correctly (CLI kept, VS Code removed)
  - Agent filenames normalized
  - All 2 agents and 26 skills present in dist

### Success Criteria

#### Automated Verification
- [ ] `npm run build` creates `dist/` with processed files
- [ ] Tests validate conditional processing
- [ ] `npm pack` creates tarball with expected contents

#### Manual Verification
- [ ] `dist/agents/PAW.agent.md` has no `{{#vscode}}` blocks
- [ ] `dist/agents/PAW-Review.agent.md` (hyphenated name)
- [ ] GitHub Actions workflow validates on PR

---

## Phase 4: Documentation

### Changes Required

- **`.paw/work/paw-cli-package/Docs.md`**: Technical reference (load `paw-docs-guidance`)
  - Implementation decisions, file structure, manifest schema
  - Build pipeline details, conditional processing logic
  - Testing approach

- **`cli/README.md`**: User-facing documentation
  - Installation: `npx @paw/cli install copilot`
  - Commands: install, upgrade, list, uninstall
  - Requirements: Node.js 18+, GitHub Copilot CLI

- **`docs/guide/cli-installation.md`**: Integration with mkdocs site
  - Getting started guide for CLI users
  - Link from main README

- **`CHANGELOG.md`**: Add entry for @paw/cli initial release

### Success Criteria

#### Automated Verification
- [ ] Docs build: `source .venv/bin/activate && mkdocs build --strict`

#### Manual Verification
- [ ] README clearly explains usage
- [ ] CLI help (`paw --help`) matches README
- [ ] Guide accessible in docs site navigation

---

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/183
- Spec: `.paw/work/paw-cli-package/Spec.md`
- Research: `.paw/work/paw-cli-package/CodeResearch.md`
- Export script reference: `scripts/export-for-cli.sh`
