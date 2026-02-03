# PAW CLI Package

## Overview

The `@paw/cli` npm package provides a command-line installer for Phased Agent Workflow (PAW) agents and skills. It enables GitHub Copilot CLI users to install, update, and manage PAW components in their user-level configuration directory (`~/.copilot/`).

The package uses a build-time conditional processing approach: agents and skills with environment-specific blocks (`{{#cli}}`, `{{#vscode}}`) are pre-processed during `npm publish`, resulting in a clean distribution that works without runtime processing.

## Architecture and Design

### High-Level Architecture

```
@paw/cli package
├── bin/paw.js           # CLI entry point, command router
├── lib/
│   ├── commands/        # Command implementations
│   │   ├── install.js   # Copy dist files to ~/.copilot/
│   │   ├── list.js      # Show installation status
│   │   ├── uninstall.js # Remove installed files
│   │   └── upgrade.js   # Check and apply updates
│   ├── manifest.js      # Read/write manifest.json
│   ├── paths.js         # Cross-platform path utilities
│   └── registry.js      # npm registry queries
├── scripts/
│   └── build-dist.js    # Pre-process agents/skills for distribution
└── dist/                # Generated at build time (not committed)
    ├── agents/          # Processed agent files
    └── skills/          # Processed skill directories
```

### Design Decisions

**Build-time conditional processing**: Conditionals (`{{#cli}}`, `{{#vscode}}`) are resolved during `npm run build` rather than at runtime. This simplifies the installed package and ensures consistent behavior.

**Zero runtime dependencies**: The CLI uses only Node.js built-in modules (`fs`, `path`, `os`, `https`, `readline`). This minimizes installation size and security surface.

**Manifest-based tracking**: Installation state is tracked in `~/.paw/copilot-cli/manifest.json`, enabling clean uninstallation and upgrade detection.

**Filename normalization**: Agent files with spaces (e.g., `PAW Review.agent.md`) are converted to hyphens (`PAW-Review.agent.md`) for better CLI compatibility.

### Integration Points

- **npm registry**: Version checking via HTTPS to `registry.npmjs.org`
- **GitHub Copilot CLI**: Targets `~/.copilot/agents/` and `~/.copilot/skills/` directories
- **PAW repository**: Sources agents from `agents/` and skills from `skills/`

## User Guide

### Prerequisites

- Node.js 18.0.0 or later
- GitHub Copilot CLI installed

### Basic Usage

**Install PAW to GitHub Copilot CLI:**
```bash
npx @paw/cli install copilot
```

**Check installation status:**
```bash
npx @paw/cli list
```

**Upgrade to latest version:**
```bash
npx @paw/cli upgrade
```

**Remove PAW installation:**
```bash
npx @paw/cli uninstall
```

### Flags

- `--force`, `-f`: Skip confirmation prompts
- `--help`, `-h`: Show help message
- `--version`, `-v`: Show version number

## API Reference

### Manifest Schema

```json
{
  "version": "0.0.1",
  "installedAt": "2024-01-15T10:30:00.000Z",
  "target": "copilot",
  "files": {
    "agents": ["/home/user/.copilot/agents/PAW.agent.md"],
    "skills": ["/home/user/.copilot/skills/paw-spec/SKILL.md"]
  }
}
```

### Path Constants

| Function | Returns |
|----------|---------|
| `getCopilotDir()` | `~/.copilot/` |
| `getCopilotAgentsDir()` | `~/.copilot/agents/` |
| `getCopilotSkillsDir()` | `~/.copilot/skills/` |
| `getManifestPath()` | `~/.paw/copilot-cli/manifest.json` |

### Conditional Block Syntax

Source files may contain conditional blocks:

```markdown
{{#cli}}
Content only included in CLI distribution
{{/cli}}

{{#vscode}}
Content only included in VS Code extension
{{/vscode}}
```

## Testing

### Running Tests

```bash
cd cli
npm test
```

### Test Coverage

- **install.test.js**: Manifest creation, path utilities, CLI help/version, error handling
- **build.test.js**: Dist directory creation, conditional processing, filename normalization

## Build and Publish

### Local Build

```bash
cd cli
npm run build
```

### Publishing

Publishing is automated via GitHub Actions on tag push:

```bash
git tag cli-v0.0.1
git push origin cli-v0.0.1
```

The workflow (`.github/workflows/publish-cli.yml`) runs tests and publishes to npm using the `NPM_TOKEN` secret.

## File Locations

| Item | Location |
|------|----------|
| Source agents | `agents/*.agent.md` |
| Source skills | `skills/*/SKILL.md` |
| Built agents | `cli/dist/agents/` |
| Built skills | `cli/dist/skills/` |
| Installed agents | `~/.copilot/agents/` |
| Installed skills | `~/.copilot/skills/` |
| Manifest | `~/.paw/copilot-cli/manifest.json` |
