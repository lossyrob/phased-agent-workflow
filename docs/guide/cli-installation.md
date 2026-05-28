# CLI Installation

Install PAW agents and skills to your GitHub Copilot CLI configuration.

## Prerequisites

- [GitHub Copilot CLI](https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-in-the-command-line) installed and configured

## Plugin Installation (Recommended)

Install PAW as a native Copilot CLI plugin from the PAW marketplace:

```bash
copilot plugin marketplace add lossyrob/phased-agent-workflow
copilot plugin marketplace browse paw-workflow
copilot plugin install paw-workflow@paw-workflow
```

This installs PAW agents and skills as a managed plugin, with native update and uninstall support. If you previously installed PAW directly from the repository, uninstall that copy first with `copilot plugin uninstall paw-workflow`.

### Plugin Commands

| Command | Description |
|---------|-------------|
| `copilot plugin marketplace add lossyrob/phased-agent-workflow` | Register the PAW marketplace |
| `copilot plugin marketplace browse paw-workflow` | Confirm the marketplace exposes the PAW plugin |
| `copilot plugin install paw-workflow@paw-workflow` | Install PAW plugin from the marketplace |
| `copilot plugin marketplace update paw-workflow` | Refresh the PAW marketplace catalog |
| `copilot plugin list` | Show installed plugins |
| `copilot plugin update paw-workflow` | Update to latest version |
| `copilot plugin uninstall paw-workflow` | Remove PAW plugin |

## NPM CLI Installation (Alternative)

If you prefer the npm-based installer, or need to install to Claude Code:

### Prerequisites

- Node.js 18.0.0 or later
- [GitHub Copilot CLI](https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-in-the-command-line) and/or [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)

### Quick Start

```bash
npx @paw-workflow/cli install copilot   # Copilot CLI
npx @paw-workflow/cli install claude    # Claude Code
```

This installs PAW agents and skills to `~/.copilot/` or `~/.claude/`, making them available in your CLI sessions.

### NPM CLI Commands

| Command | Description |
|---------|-------------|
| `paw install copilot` | Install PAW to GitHub Copilot CLI |
| `paw list` | Show installed version and components |
| `paw upgrade` | Check for and apply updates |
| `paw uninstall` | Remove all PAW files |

Use `--force` or `-f` to skip confirmation prompts.

## What Gets Installed

The marketplace plugin is managed by Copilot CLI and exposes PAW agents and skills from the plugin. The NPM CLI alternative writes the same agents and skills into `~/.copilot/` or `~/.claude/`.

### Agents

Two agent files are provided:

- **PAW.agent.md** - The main PAW workflow orchestrator for implementation workflows
- **PAW-Review.agent.md** - The PAW Review workflow orchestrator for code review

### Skills

Activity and utility skills are provided, including:

- Specification skills: `paw-spec`, `paw-spec-research`, `paw-spec-review`
- Planning skills: `paw-planning`, `paw-plan-review`, `paw-code-research`
- Implementation skills: `paw-implement`, `paw-impl-review`, `paw-git-operations`
- Review skills: `paw-review-*` (9 skills for the review workflow)
- Utility skills: `paw-status`, `paw-workflow`, `paw-docs-guidance`, `paw-rewind`, `paw-work-shaping`, `paw-transition`

## Using PAW After Installation

After installation, start a Copilot CLI session and invoke PAW:

```bash
# Start implementation workflow
copilot --agent PAW

# Start review workflow  
copilot --agent PAW-Review
```

Or use `/agent` inside an existing session to select a PAW agent.

See [Two Workflows](two-workflows.md) for detailed usage instructions.

## Updating

For marketplace plugin installs:

```bash
copilot plugin marketplace update paw-workflow
copilot plugin update paw-workflow
```

For NPM CLI installs:

```bash
npx @paw-workflow/cli upgrade
```

Or reinstall the NPM CLI copy to get the latest version:

```bash
npx @paw-workflow/cli install copilot --force
```

## Uninstalling

For marketplace plugin installs:

```bash
copilot plugin uninstall paw-workflow
```

For NPM CLI installs:

```bash
npx @paw-workflow/cli uninstall
```

The NPM uninstall removes installed agents, skills, and the manifest file.

## Switching from NPM CLI or Direct Repository Install to Plugin

If you previously installed PAW via the NPM CLI and want to switch to the plugin:

1. Uninstall the NPM version first:
   ```bash
   npx @paw-workflow/cli uninstall
   ```
2. Install as a plugin:
   ```bash
   copilot plugin marketplace add lossyrob/phased-agent-workflow
   copilot plugin install paw-workflow@paw-workflow
   ```

If you previously installed PAW directly with `copilot plugin install lossyrob/phased-agent-workflow`, uninstall it first with `copilot plugin uninstall paw-workflow`, then reinstall from the marketplace.

!!! warning
    If both installations are active, the NPM-installed files at `~/.copilot/agents/` take precedence over plugin-provided agents (Copilot CLI uses first-found-wins for agents and skills).

## Troubleshooting

### NPM CLI: "Distribution files not found"

The package may be corrupted. Try reinstalling:

```bash
npm cache clean --force
npx @paw-workflow/cli install copilot
```

### Files not showing in Copilot CLI

For marketplace plugin installs, verify the marketplace and plugin are registered:

```bash
copilot plugin marketplace browse paw-workflow
copilot plugin list
```

For NPM CLI installs, verify the files were installed:

```bash
ls ~/.copilot/agents/
ls ~/.copilot/skills/
```

Restart your Copilot CLI session after installation.

### Permission errors

For NPM CLI installs, ensure you have write access to:
- `~/.copilot/` — where agents and skills are installed
- `~/.paw/copilot-cli/` — where the manifest file is stored
