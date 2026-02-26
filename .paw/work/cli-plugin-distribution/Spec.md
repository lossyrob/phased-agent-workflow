# Feature Specification: CLI Plugin Distribution

**Branch**: feature/cli-plugin-distribution  |  **Created**: 2026-02-26  |  **Status**: Draft
**Input Brief**: Distribute PAW as a Copilot CLI plugin with single-command install and marketplace discovery

## Overview

Today, installing PAW for Copilot CLI works via `npx @paw-workflow/cli install copilot` — a single command, but one that sits outside the Copilot CLI ecosystem. Users must have Node.js available, don't get native update/uninstall support through `copilot plugin` commands, and can't browse for PAW alongside other Copilot CLI plugins.

Copilot CLI now has a native plugin system with install, update, uninstall, and marketplace discovery. By packaging PAW as a Copilot CLI plugin, users get a single-command install experience (`copilot plugin install lossyrob/phased-agent-workflow`), native lifecycle management, and discoverability through plugin marketplaces. This makes PAW a first-class citizen of the Copilot CLI ecosystem.

The existing npm CLI (`@paw-workflow/cli`) remains as the distribution path for Claude Code users (via `npx @paw-workflow/cli install claude`) and as a fallback for environments without the plugin system. A future Claude Code plugin may follow a similar pattern. The Copilot CLI plugin becomes the primary recommended install method for Copilot CLI users. A dedicated plugin distribution ensures users always get the latest release version with a single install command.

## Objectives

- Enable PAW installation via `copilot plugin install lossyrob/phased-agent-workflow` (Rationale: native ecosystem integration — eliminates npm/Node.js dependency, uses Copilot CLI's built-in install/update/uninstall lifecycle)
- Provide native update/uninstall through `copilot plugin update`/`uninstall` commands (Rationale: users manage PAW like any other plugin, no separate toolchain)
- Enable marketplace listing so PAW can appear in curated plugin registries (Rationale: self-hosted marketplace.json prepares for submission to default marketplaces like `awesome-copilot`, where real discoverability happens)
- Automate plugin branch publishing on each CLI release (Rationale: plugin always stays current with releases)
- Maintain the existing npm CLI as a parallel distribution path (Rationale: serves Claude Code users today and environments without the plugin system)

## User Scenarios & Testing

### User Story P1 – Install PAW via Plugin System
Narrative: A developer who uses Copilot CLI wants to add PAW workflow capabilities. They run a single command and immediately have access to PAW and PAW Review agents plus all workflow skills.
Independent Test: Run `copilot plugin install lossyrob/phased-agent-workflow` and verify PAW agents appear in `/agent` list.
Acceptance Scenarios:
1. Given Copilot CLI is installed, When user runs `copilot plugin install lossyrob/phased-agent-workflow`, Then the plugin installs successfully and `copilot plugin list` shows `paw-workflow`
2. Given the plugin is installed, When user starts a new Copilot session, Then both PAW and PAW Review agents are available via `/agent`
3. Given the plugin is installed, When user runs `/skills list`, Then all PAW workflow skills are available

### User Story P2 – Update and Uninstall Plugin
Narrative: A developer with PAW installed as a plugin wants to update to the latest version or remove it cleanly.
Independent Test: Run `copilot plugin update paw-workflow` and verify the version changes.
Acceptance Scenarios:
1. Given the plugin is installed at version X, When a new version is published to the plugin branch, Then `copilot plugin update paw-workflow` installs the new version
2. Given the plugin is installed, When user runs `copilot plugin uninstall paw-workflow`, Then all PAW agents and skills are removed and `copilot plugin list` no longer shows `paw-workflow`

### User Story P3 – Marketplace Listing
Narrative: The PAW plugin includes marketplace metadata so it can be listed in curated plugin registries. Users who have registered a marketplace containing PAW can browse and install it. This also prepares for future submission to default marketplaces (e.g., `awesome-copilot`) where broader discoverability happens.
Independent Test: Register the PAW marketplace, browse it, and find `paw-workflow` listed.
Acceptance Scenarios:
1. Given the PAW marketplace is registered via `copilot plugin marketplace add`, When user runs `copilot plugin marketplace browse`, Then `paw-workflow` appears with description and metadata
2. Given the user finds `paw-workflow` in the marketplace, When they install it, Then the plugin delivers the same agents, skills, and prompt content as a direct install

### User Story P4 – Automated Plugin Publishing
Narrative: A maintainer tags a CLI release and the plugin branch is automatically updated with the latest built artifacts, keeping the plugin distribution current without manual intervention.
Independent Test: Push a `cli-v*` tag and verify the `plugin` branch updates with new version.
Acceptance Scenarios:
1. Given a new `cli-v*` tag is pushed, When the publish workflow completes, Then the `plugin` branch contains updated `plugin.json` with the matching version
2. Given the publish workflow runs, When the build completes, Then the `plugin` branch contains the built agents and skills matching the CLI distribution
3. Given the publish workflow runs, When it completes, Then both npm publish and plugin branch update succeed independently (one failing doesn't block the other)

### Edge Cases
- User has PAW installed via npm CLI AND as a plugin: Copilot CLI deduplicates by agent/skill name using first-found-wins; user-level agents take precedence over plugin agents, so both can coexist but the npm-installed version wins. Documentation should recommend uninstalling the npm version when switching to plugin.
- Plugin branch doesn't exist yet on first install: CI workflow creates the orphan branch on first run.
- Network failure during install: Handled by Copilot CLI's built-in error handling (not PAW's responsibility).
- User installs from main branch instead of plugin branch: Gets source files without conditional processing; no plugin manifest is present at main branch root so install fails with an error indicating the manifest is missing.

## Requirements

### Functional Requirements
- FR-001: Generate `plugin.json` manifest with name `paw-workflow`, version synced from CLI package, and paths pointing to `agents/` and `skills/` directories (Stories: P1, P2, P4)
- FR-002: A complete, installable plugin distribution is produced containing processed agent files and all workflow skill files ready for plugin installation (Stories: P1, P4)
- FR-003: Each CLI release automatically updates the plugin distribution on a dedicated branch without manual intervention (Stories: P2, P4)
- FR-004: The plugin distribution branch is structured so `copilot plugin install lossyrob/phased-agent-workflow` resolves the plugin correctly — with the manifest discoverable at the branch root or in the standard plugin directory (Stories: P1)
- FR-005: Create marketplace manifest on the plugin distribution branch for marketplace discovery (Stories: P3)
- FR-006: Plugin manifest includes metadata fields: description, author, license, keywords, category, repository, and homepage (Stories: P1, P3)
- FR-007: The plugin bundles both PAW and PAW Review agents and all workflow skills in a single plugin (Stories: P1)
- FR-008: Plugin version in the manifest matches the CLI package version at release time (Stories: P2, P4)

### Key Entities
- **Plugin manifest** (`plugin.json`): Required manifest declaring plugin name, version, and component paths
- **Plugin branch** (`plugin`): Orphan git branch containing only the built plugin distribution
- **Marketplace manifest** (`marketplace.json`): Registry file enabling marketplace discovery of the plugin

### Cross-Cutting / Non-Functional
- Plugin branch contains only distribution files (no source, no node_modules, no development artifacts)
- Build process is idempotent: same input version produces identical plugin output
- CI workflow completes plugin branch update within 5 minutes

## Success Criteria
- SC-001: A user can install PAW with a single command `copilot plugin install lossyrob/phased-agent-workflow` and have both agents and all skills available (FR-001, FR-002, FR-004, FR-007)
- SC-002: Running `copilot plugin list` shows `paw-workflow` with correct version after installation (FR-001, FR-006)
- SC-003: Plugin updates are available via `copilot plugin update paw-workflow` after a new release (FR-003, FR-008)
- SC-004: The plugin appears in marketplace browsing after a user registers the PAW marketplace (FR-005, FR-006)
- SC-005: The plugin branch is automatically updated when a `cli-v*` tag is pushed, without manual intervention (FR-003, FR-008)
- SC-006: Agents and skills delivered via the plugin have the same agent names, skill names, and prompt content as those installed via `paw install copilot` (FR-002, FR-007)

## Assumptions
- The Copilot CLI plugin system resolves `copilot plugin install owner/repo` using the default branch unless overridden — if this assumption is wrong, users may need `copilot plugin install lossyrob/phased-agent-workflow:plugin` or similar syntax (will be validated during implementation)
- The `plugin` branch approach is compatible with GitHub's plugin resolution — the CLI looks for `plugin.json` at repo root or `.github/plugin/plugin.json` on the resolved branch
- The existing CLI build output is sufficient as plugin content without additional transformation
- GitHub Actions has permission to force-push to the `plugin` orphan branch
- The `awesome-copilot` marketplace submission is a separate follow-up PR to that repo (out of scope for this implementation)

## Scope

In Scope:
- `plugin.json` manifest generation as part of the build process
- CI workflow to publish built plugin to a `plugin` orphan branch
- `marketplace.json` generation for the plugin branch
- Documentation updates (README, install guides) for plugin-based installation
- Build script modifications to produce plugin-ready output

Out of Scope:
- Actual PR submission to `github/awesome-copilot` marketplace (manual follow-up)
- Claude Code plugin via `.claude-plugin/` convention (future work, parallel to this Copilot CLI plugin)
- Hook bundling in the plugin (deferred)
- MCP server configuration in the plugin
- Removing or deprecating the npm CLI distribution path
- Changes to the VS Code extension distribution

## Dependencies
- Copilot CLI plugin system (stable, documented)
- Existing CLI build tooling for conditional processing
- GitHub Actions for CI publishing
- `cli-v*` tag convention from existing `publish-cli.yml` workflow

## Risks & Mitigations
- **Plugin branch resolution uncertainty**: Copilot CLI may not resolve `owner/repo` to the `plugin` branch by default. Mitigation: Test plugin resolution during implementation; if branch targeting isn't automatic, add `plugin.json` to `.github/plugin/` on main that redirects or document branch-specific install syntax.
- **Precedence conflict with npm-installed PAW**: Users who have both plugin and npm CLI installed may get unexpected version from `~/.copilot/` taking precedence. Mitigation: Document migration path; consider adding a check in npm CLI `install` command that warns if plugin is detected.
- **Plugin branch drift**: If CI fails silently, plugin branch falls behind releases. Mitigation: CI workflow reports failures; add version check to plugin metadata.
- **Breaking plugin schema changes**: Copilot CLI plugin system is new and may change schema requirements. Mitigation: Pin to documented schema; keep plugin.json minimal.

## References
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/263
- Research: .paw/work/cli-plugin-distribution/SpecResearch.md
- [About CLI plugins](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-cli-plugins)
- [Creating a plugin](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-creating)
- [Plugin reference](https://docs.github.com/en/copilot/reference/cli-plugin-reference)
- [Plugin marketplace](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-marketplace)
