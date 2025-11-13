# GitHub Copilot Instructions

This file contains instructions for GitHub Copilot when working with the Phased Agent Workflow (PAW) project.

## Chatmode Development

When creating or modifying chatmode files in `.github/chatmodes/`, ALWAYS run the chatmode linter script:

```bash
./scripts/lint-chatmode.sh .github/chatmodes/<filename>.chatmode.md
```

## Pull Request Labels

All pull requests to `main` must be labeled with one of the following labels:
- `enhancement` - For new features
- `bug` - For bug fixes
- `documentation` - For documentation changes
- `maintenance` - For maintenance, refactoring, or chores
