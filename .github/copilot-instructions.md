# GitHub Copilot Instructions

This file contains instructions for GitHub Copilot when working with the Phased Agent Workflow (PAW) project.

## Code Quality

All code changes must pass the linter before being committed:

```bash
npm run lint
```

## Agent Development

When creating or modifying agent files in `agents/`, ALWAYS run the prompting linter script:

```bash
./scripts/lint-prompting.sh agents/<filename>.agent.md
```

When creating or modifying skill files in `skills/`, ALWAYS run the prompting linter script:

```bash
./scripts/lint-prompting.sh skills/<skillname>/SKILL.md
```

To lint all agents and skills at once:

```bash
npm run lint:agent:all
```

To lint only skills:

```bash
npm run lint:skills
```


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

All pull requests to `main` must be labeled with one of the following category labels:
- `enhancement` - For new features
- `bug` - For bug fixes
- `documentation` - For documentation changes
- `maintenance` - For maintenance, refactoring, or chores

### CLI Label

PRs that affect CLI code (`cli/` directory, `publish-cli.yml`, etc.) should also have the `cli` label. This label is **applied at release-prep time** using the `prepare-cli-release.prompt.md` prompt—you don't need to remember to add it during development. The prompt assesses each PR and applies the label if it affects CLI code.

VS Code extension PRs don't need a special label (the extension changelog includes all PRs to main).

IMPORTANT: **PAW Architecture Philosophy** - tools provide procedural operations, agents provide decision-making logic and reasoning. Rely on agents to use reasoning and logic over hardcoding procedural steps into tools.

## Skill Development

This project has two skill locations with different capabilities:

| Location | Loaded Via | Bundled Resources |
|----------|------------|-------------------|
| `.github/skills/` | VS Code skills system | ✅ Supported (`scripts/`, `references/`, `assets/`) |
| `skills/` | `paw_get_skill` tool | ❌ **Not supported** - SKILL.md only |

**When creating skills in `skills/`**: Only create the SKILL.md file. The `paw_get_skill` tool returns SKILL.md content as text—it cannot access bundled resources. Do not create `scripts/`, `references/`, or `assets/` subdirectories.

**When creating skills in `.github/skills/`**: Full Agent Skills spec is supported, including bundled resources that Claude can read or execute.

**For skill creation guidance**: Load the `skill-creator` skill at `.github/skills/skill-creator/SKILL.md` for comprehensive guidance on skill design principles, anatomy, and creation process.

## Shell Commands

When writing shell commands in agent prompts or documentation, follow these guidelines:

- DO NOT pipe output to /dev/null (e.g. `2>/dev/null`), as it forces the command to require approval.
- DO NOT activate virtual environments on every command (e.g. `source .venv/bin/activate && ...`); activate it once per session instead.

## Agent Prompt Edit Token Discipline (for `*.agent.md`, system prompts, instruction prompts)**

* Treat system prompt tokens as **expensive** (paid every run).
* Compute net token addition percentage for new prompt content, ensure the percentage matches the value delivered.
* Prefer **replacing/condensing** existing text over appending.
* Use **bullets over prose**; avoid rationale paragraphs and long examples.
* Always report **before/after token counts** (via lint) and the delta; if over budget or token additions outpace value, do a **compression pass**.

## Prompt Writing Best Practices

When writing agent prompts, skills, or instructions, follow these guidelines to maximize agent effectiveness while minimizing token usage.

### Describe End States, Not Procedures

For autonomous agent tasks, describe desired outcomes rather than prescriptive steps—let the agent reason about how to achieve them. However, keep explicit steps for interactive protocols (user-facing flows where order and presentation matter).

**Anti-pattern**: Prescriptive step-by-step commands for autonomous work
```markdown
## Execution Steps
1. Run `git fetch origin <base-branch>`
2. Run `git checkout <base-commit-sha>`
3. Run `git log --oneline -1` to verify
```

**Pattern**: Describe desired end states, let the agent reason about how to achieve them
```markdown
## Desired End States
- The base commit SHA is locally available
- The working directory reflects the pre-change state
```

**Exception**: Interactive user protocols where the sequence *is* the spec (e.g., "present options → get user decision → apply") should retain explicit steps.

### Avoid Over-Instruction

**Anti-pattern**: Verbose error handling and conditional logic
```markdown
If the stage fails due to missing artifacts, check if the artifact was supposed to be created by a previous stage. If so, report the missing artifact and suggest re-running the previous stage. If the artifact is optional, continue with a warning...
```

**Pattern**: Trust agent reasoning
```markdown
If any stage fails or artifacts are missing, report to the user and seek guidance.
```

### Don't Specify Static Response Templates

**Anti-pattern**: Hardcoded output format with "if applicable" qualifiers
```markdown
## Output Format
- **Summary**: [required]
- **Breaking Changes**: [if applicable]
- **Migration Notes**: [if applicable]
```

**Pattern**: Describe what information to include, let the model determine format
```markdown
Include a summary and note any breaking changes or migration requirements.
```

### Reference Skills by Name, Don't Enumerate Contents

**Anti-pattern**: Duplicating skill contents in the referencing prompt
```markdown
Load the paw-review-workflow skill. The available skills are:
- paw-review-understanding: Analyzes PR context...
- paw-review-baseline: Establishes pre-change baseline...
- paw-review-impact: Evaluates change impact...
```

**Pattern**: Reference the catalog; if descriptions update, they update in one place
```markdown
Use the skills catalog to discover available review skills.
```

### Abstract Tool References

**Anti-pattern**: Brittle explicit tool names and parameters
```markdown
Call the `runSubagent` tool with parameters:
- `agentName`: "paw-review-understanding"
- `prompt`: "Load skill and execute..."
```

**Pattern**: Describe the action semantically
```markdown
Delegate to a separate agent session, providing the skill name, context, and artifact path.
```

### Avoid Unnecessary Metadata

**Anti-pattern**: Metadata that doesn't serve a specific runtime purpose
```yaml
---
name: my-skill
type: activity
stage: evaluation
artifacts: ["ImpactAnalysis.md"]
version: 1.0.0
---
```

**Pattern**: Keep only metadata that is actively used by tooling
```yaml
---
name: my-skill
description: Brief description for catalog display
---
```

### Don't Reference Removed Components

When prompts reference other agents, skills, or components, verify they still exist. Remove references to deleted agents or deprecated components.

### Avoid Cross-File References Agents Can't Resolve

Prompt content (agents, skills) is delivered to the target agent as text—the agent has no access to other source files in the repository. References like "see PAW.agent.md" or "refer to paw-transition/SKILL.md" are meaningless at runtime because the agent only sees the content loaded into its context. Instead, inline the essential information or describe the behavior directly. When reviewing prompts, ask: "Can the agent act on this without reading another file?"

### Don't Waste Context on Error Handling

Let agents determine how to handle errors and report to users. Explicit error handling instructions consume tokens without adding value—agents can reason about appropriate error responses contextually.

## Implementation Review Guidelines

When reviewing implementation changes, verify cross-artifact consistency:

- Changes to `paw-specification.md` → verify `paw-status` skill reflects updated stages, modes, or strategies
- Changes to `paw-status` skill → verify it aligns with specification definitions
- Changes to workflow skills → verify artifact locations, branch patterns, and agent responsibilities match specification

**Source of truth**: `paw-specification.md` → skills reflect the spec for user guidance.
