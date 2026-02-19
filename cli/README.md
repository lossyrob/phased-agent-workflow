# @paw-workflow/cli

CLI installer for [Phased Agent Workflow (PAW)](https://github.com/lossyrob/phased-agent-workflow) agents and skills.

## Installation

```bash
# Install to GitHub Copilot CLI
npx @paw-workflow/cli install copilot

# Install to Claude Code CLI
npx @paw-workflow/cli install claude
```

This installs PAW agents and skills to the target CLI's configuration directory (`~/.copilot/` or `~/.claude/`).

You can install to both targets:

```bash
npx @paw-workflow/cli install copilot
npx @paw-workflow/cli install claude
```

## Commands

### install

Install PAW agents and skills to a target environment.

```bash
paw install copilot          # GitHub Copilot CLI
paw install claude           # Claude Code CLI
paw install copilot --force  # Skip confirmation prompts
```

### list

Show installed version and components (checks all targets).

```bash
paw list
```

### upgrade

Check for updates and upgrade all installed targets.

```bash
paw upgrade
```

### uninstall

Remove all PAW agents and skills from all installed targets.

```bash
paw uninstall
paw uninstall --force  # Skip confirmation prompt
```

## Requirements

- Node.js 18.0.0 or later
- [GitHub Copilot CLI](https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-in-the-command-line) and/or [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)

## What Gets Installed

- **Agents**: PAW workflow orchestrators (`PAW.agent.md`, `PAW-Review.agent.md`)
- **Skills**: Activity and utility skills for specification, planning, implementation, and review workflows

Files are installed to:

| Target | Agents | Skills | Manifest |
|--------|--------|--------|----------|
| `copilot` | `~/.copilot/agents/` | `~/.copilot/skills/` | `~/.paw/copilot-cli/manifest.json` |
| `claude` | `~/.claude/agents/` | `~/.claude/skills/` | `~/.paw/claude-cli/manifest.json` |

## License

MIT

## Development

### Setup

```bash
cd cli
npm install
```

### Build

Build the distribution (processes conditionals, injects version metadata):

```bash
npm run build
```

This creates `dist/` with processed agents and skills.

### Test locally

Run the CLI directly without installing:

```bash
# Show help
node bin/paw.js --help

# Install to Copilot CLI (from local build)
node bin/paw.js install copilot

# Install to Claude Code CLI (from local build)
node bin/paw.js install claude

# List installed version
node bin/paw.js list
```

### Run tests

```bash
npm test
```

### Lint

```bash
npm run lint
```

### Publishing

Publishing is automated via GitHub Actions on tag push:

```bash
git tag cli-v0.0.1
git push origin cli-v0.0.1
```

Requires `NPM_TOKEN` secret configured in the repository.
