# CLI Installation

Install PAW agents and skills to your GitHub Copilot CLI configuration.

## Prerequisites

- [GitHub Copilot CLI](https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-in-the-command-line) installed and configured

## Plugin Installation (Recommended)

Install PAW as a native Copilot CLI plugin:

```bash
copilot plugin install lossyrob/phased-agent-workflow
```

This installs PAW agents and skills as a managed plugin, with native update and uninstall support.

### Plugin Commands

| Command | Description |
|---------|-------------|
| `copilot plugin install lossyrob/phased-agent-workflow` | Install PAW plugin |
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

### Agents

Two agent files are installed to `~/.copilot/agents/`:

- **PAW.agent.md** - The main PAW workflow orchestrator for implementation workflows
- **PAW-Review.agent.md** - The PAW Review workflow orchestrator for code review

### Skills

Activity and utility skills are installed to `~/.copilot/skills/`, including:

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

Check for updates and upgrade:

```bash
npx @paw-workflow/cli upgrade
```

Or reinstall to get the latest version:

```bash
npx @paw-workflow/cli install copilot --force
```

## Uninstalling

Remove all PAW files:

```bash
npx @paw-workflow/cli uninstall
```

This removes installed agents, skills, and the manifest file.

## Switching from NPM CLI to Plugin

If you previously installed PAW via the NPM CLI and want to switch to the plugin:

1. Uninstall the NPM version first:
   ```bash
   npx @paw-workflow/cli uninstall
   ```
2. Install as a plugin:
   ```bash
   copilot plugin install lossyrob/phased-agent-workflow
   ```

!!! warning
    If both installations are active, the NPM-installed files at `~/.copilot/agents/` take precedence over plugin-provided agents (Copilot CLI uses first-found-wins for agents and skills).

## Troubleshooting

### "Distribution files not found"

The package may be corrupted. Try reinstalling:

```bash
npm cache clean --force
npx @paw-workflow/cli install copilot
```

### Files not showing in Copilot CLI

Verify the files were installed:

```bash
ls ~/.copilot/agents/
ls ~/.copilot/skills/
```

Restart your Copilot CLI session after installation.

### Permission errors

Ensure you have write access to:
- `~/.copilot/` — where agents and skills are installed
- `~/.paw/copilot-cli/` — where the manifest file is stored
