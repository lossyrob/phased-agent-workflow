# @paw-workflow/cli

CLI installer for [Phased Agent Workflow (PAW)](https://github.com/lossyrob/phased-agent-workflow) agents and skills.

## Installation

```bash
npx @paw-workflow/cli install copilot
```

This installs PAW agents and skills to your GitHub Copilot CLI configuration directory (`~/.copilot/`).

## Commands

### install

Install PAW agents and skills to a target environment.

```bash
paw install copilot
paw install copilot --force  # Skip confirmation prompts
```

### list

Show installed version and components.

```bash
paw list
```

### upgrade

Check for updates and upgrade to the latest version.

```bash
paw upgrade
```

### uninstall

Remove all PAW agents and skills.

```bash
paw uninstall
paw uninstall --force  # Skip confirmation prompt
```

## Requirements

- Node.js 18.0.0 or later
- [GitHub Copilot CLI](https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-in-the-command-line)

## What Gets Installed

- **Agents**: PAW workflow orchestrators (`PAW.agent.md`, `PAW-Review.agent.md`)
- **Skills**: 26 activity skills for specification, planning, implementation, and review workflows

Files are installed to:
- `~/.copilot/agents/` - Agent files
- `~/.copilot/skills/` - Skill directories

A manifest is written to `~/.paw/copilot-cli/manifest.json` to track installed files.

## License

MIT
