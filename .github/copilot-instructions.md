# GitHub Copilot Instructions

This file contains instructions for GitHub Copilot when working with the Phased Agent Workflow (PAW) project.

## Agent Development

When creating or modifying agent files in `.github/agents/`, ALWAYS run the agent linter script:

```bash
./scripts/lint-agent.sh .github/agents/<filename>.agent.md
```

## Pull Request Labels

All pull requests to `main` must be labeled with one of the following labels:
- `enhancement` - For new features
- `bug` - For bug fixes
- `documentation` - For documentation changes
- `maintenance` - For maintenance, refactoring, or chores
