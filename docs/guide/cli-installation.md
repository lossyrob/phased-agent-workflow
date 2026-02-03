# CLI Installation

Install PAW agents and skills to your GitHub Copilot CLI configuration.

## Prerequisites

- Node.js 18.0.0 or later
- [GitHub Copilot CLI](https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-in-the-command-line) installed and configured

## Quick Start

```bash
npx @paw/cli install copilot
```

This installs PAW agents and skills to `~/.copilot/`, making them available in your Copilot CLI sessions.

## Commands

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

26 activity skills are installed to `~/.copilot/skills/`, including:

- Specification skills: `paw-spec`, `paw-spec-research`, `paw-spec-review`
- Planning skills: `paw-planning`, `paw-plan-review`, `paw-code-research`
- Implementation skills: `paw-implement`, `paw-impl-review`, `paw-git-operations`
- Review skills: `paw-review-*` (9 skills for the review workflow)
- Utility skills: `paw-status`, `paw-workflow`, `paw-docs-guidance`

## Using PAW After Installation

After installation, start a Copilot CLI session and invoke PAW:

```bash
# Start implementation workflow
gh copilot chat
> @PAW start work on issue #123

# Start review workflow  
> @PAW-Review review PR #456
```

See [Two Workflows](two-workflows.md) for detailed usage instructions.

## Updating

Check for updates and upgrade:

```bash
npx @paw/cli upgrade
```

Or reinstall to get the latest version:

```bash
npx @paw/cli install copilot --force
```

## Uninstalling

Remove all PAW files:

```bash
npx @paw/cli uninstall
```

This removes installed agents, skills, and the manifest file.

## Troubleshooting

### "Distribution files not found"

The package may be corrupted. Try reinstalling:

```bash
npm cache clean --force
npx @paw/cli install copilot
```

### Files not showing in Copilot CLI

Verify the files were installed:

```bash
ls ~/.copilot/agents/
ls ~/.copilot/skills/
```

Restart your Copilot CLI session after installation.

### Permission errors

Ensure you have write access to `~/.copilot/` and `~/.paw/` directories.
