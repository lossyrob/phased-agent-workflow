# GitHub Copilot Instructions

This file contains instructions for GitHub Copilot when working with the Phased Agent Workflow (PAW) project.

## Agent Development

When creating or modifying agent files in `agents/`, ALWAYS run the agent linter script:

```bash
./scripts/lint-agent.sh agents/<filename>.agent.md
```

## Docs development

When working with documentation, ensure the virtual environment is activated to run mkdocs commands.

### Documentation Updates

When implementing features or making changes that affect user-facing behavior, consider updating:

- **User Guide** (`docs/guide/`) - For user-facing features, commands, or workflows
- **Specification** (`docs/specification/`) - For changes to workflow stages or agent behavior
- **Reference** (`docs/reference/`) - For new agents, artifacts, or configuration options

### Validation

Before committing documentation changes:
```bash
source .venv/bin/activate
mkdocs build --strict
```

This validates all internal links and catches configuration errors.

## Pull Request Labels

All pull requests to `main` must be labeled with one of the following labels:
- `enhancement` - For new features
- `bug` - For bug fixes
- `documentation` - For documentation changes
- `maintenance` - For maintenance, refactoring, or chores

IMPORTANT: **PAW Architecture Philosophy** - tools provide procedural operations, agents provide decision-making logic and reasoning. Rely on agents to use reasoning and logic over hardcoding procedural steps into tools.

DO NOT pipe output to /dev/null, as it forces the command to require approval.