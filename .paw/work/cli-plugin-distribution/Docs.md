# CLI Plugin Distribution

## Overview

PAW is now distributable as a Copilot CLI plugin, giving users a single-command install with native lifecycle management (`install`, `update`, `uninstall`). The existing build system was extended to produce plugin manifests alongside the npm package, and CI publishes both formats on each release.

## Architecture and Design

### High-Level Architecture

```
cli-v* tag push
    │
    ├─► publish-npm job ──► npm registry (@paw-workflow/cli)
    │
    └─► publish-plugin job ──► plugin orphan branch (lossyrob/phased-agent-workflow)
```

The build script (`cli/scripts/build-dist.js`) produces a single `cli/dist/` directory that serves both distribution channels:

- **npm**: Published as `@paw-workflow/cli` with `install.js` post-install hook
- **Plugin**: The `dist/` contents are pushed to a `plugin` orphan branch — `plugin.json` at root tells Copilot CLI where agents and skills live

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| Single build output, dual distribution | `cli/dist/` is already a complete agent/skill tree; adding `plugin.json` makes it plugin-ready with zero structural changes |
| Orphan `plugin` branch (force-pushed) | Keeps plugin branch clean (single commit, no history accumulation), avoids polluting `main` with build artifacts |
| Two fully independent CI jobs | npm failure doesn't block plugin publish and vice versa; ~30s duplicate build is acceptable |
| `marketplace.json` with `"source": "."` | Source is relative to plugin branch root; validated locally with `copilot plugin marketplace add` |
| Plugin name `paw-workflow` | Matches npm package name for consistency |

### Integration Points

- **Build system**: `buildPluginManifest()` and `buildMarketplaceManifest()` run after `buildAgents()` and `buildSkills()` in the existing build pipeline
- **CI**: `publish-plugin` job mirrors the setup of `publish-npm` (checkout → setup-node → extract version → build) but pushes to branch instead of npm
- **Version sync**: Both manifests read version from `cli/package.json`, which CI sets from the git tag via `npm version`

## User Guide

### Install as Plugin (Copilot CLI)

```bash
copilot plugin install lossyrob/phased-agent-workflow
```

Update and uninstall:
```bash
copilot plugin update paw-workflow
copilot plugin uninstall paw-workflow
```

### Install via npm (Claude Code or alternative)

```bash
npx @paw-workflow/cli install
```

### Switching from npm CLI to Plugin

Uninstall the npm version first — user-level agents at `~/.copilot/agents/` take precedence over plugin agents (first-found-wins):

```bash
npx @paw-workflow/cli uninstall
copilot plugin install lossyrob/phased-agent-workflow
```

## API Reference

### Plugin Manifest (`plugin.json`)

Generated at `cli/dist/plugin.json` by `buildPluginManifest()`:

```json
{
  "name": "paw-workflow",
  "version": "<from cli/package.json>",
  "description": "Phased Agent Workflow...",
  "agents": "agents/",
  "skills": "skills/"
}
```

### Marketplace Manifest (`.github/plugin/marketplace.json`)

Generated at `cli/dist/.github/plugin/marketplace.json` by `buildMarketplaceManifest()`:

```json
{
  "plugins": [{
    "name": "paw-workflow",
    "source": ".",
    "description": "..."
  }]
}
```

Self-hosted marketplace — can be registered with `copilot plugin marketplace add OWNER/REPO`.

### Build Functions

| Function | Location | Output |
|----------|----------|--------|
| `buildPluginManifest()` | `cli/scripts/build-dist.js` | `cli/dist/plugin.json` |
| `buildMarketplaceManifest()` | `cli/scripts/build-dist.js` | `cli/dist/.github/plugin/marketplace.json` |

## Testing

### Automated Tests

4 test cases in `cli/test/build.test.js`:
- `plugin.json` exists with correct structure
- Plugin version matches `cli/package.json`
- `marketplace.json` exists at correct path
- Marketplace entry references `paw-workflow`
- Dist layout includes both manifests plus agents/skills

Run: `cd cli && npm test`

### Manual Verification

Test plugin install from local build:
```bash
cd cli && npm run build
copilot plugin install ./dist
copilot plugin list                    # should show paw-workflow
copilot plugin uninstall paw-workflow
```

Test marketplace:
```bash
copilot plugin marketplace add ./dist
copilot plugin marketplace browse      # should list paw-workflow
```

## Limitations and Future Work

- **Default branch resolution**: `copilot plugin install OWNER/REPO` uses the repo's default branch. If the default branch is `main` (not `plugin`), the Copilot CLI resolves the plugin branch automatically via plugin discovery. If this changes, a minimal `plugin.json` on `main` pointing to the `plugin` branch may be needed.
- **awesome-copilot submission**: Not included — submit a PR to `github/awesome-copilot` to list PAW in the pre-registered marketplace visible to all Copilot CLI users.
- **Claude Code plugin**: Not a Copilot CLI plugin format. Claude Code installs via `npx @paw-workflow/cli install claude`.
- **Hooks/MCP**: `plugin.json` only declares agents and skills. Hook and MCP server support can be added when the plugin spec supports them.
