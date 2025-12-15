# Custom Instructions

PAW agents can be customized at both the workspace and user level without modifying the globally-installed agent files. This allows teams to enforce project-specific conventions while respecting individual developer preferences.

## How Custom Instructions Work

When a PAW agent starts, it calls the `paw_get_context` tool to retrieve:

1. **Workspace instructions**: From `.paw/instructions/<agent-name>-instructions.md`
2. **User instructions**: From `~/.paw/instructions/<agent-name>-instructions.md`
3. **Workflow context**: From `.paw/work/<feature-slug>/WorkflowContext.md`
4. **Git context**: Best-effort git workspace state (repo detection + dirty working tree)

Agents then apply these instructions alongside their default behavior.

### Git Context

`paw_get_context` also returns a `<git_context>` section that helps agents make safer, commit-aware decisions.

**Fields:**

- `is_git_repo`: Whether the current workspace is a valid git repository
- `has_uncommitted_changes`: Present only when `is_git_repo` is true
- `recommended_commands`: A short list of commands agents can run to gather commit/diff context

If git inspection fails, the tool will include a `<warning>` inside `<git_context>` and still return the rest of the context.

## Precedence Rules

When instructions conflict, PAW follows this precedence (highest to lowest):

1. **Workspace instructions** — Project-specific rules that all team members follow
2. **User instructions** — Personal preferences that apply across all projects
3. **Agent defaults** — Built-in behavior from the agent definition

!!! example
    If your user instructions say "use concise comments" but the workspace instructions say "use detailed JSDoc comments", the workspace instructions win.

## Creating Workspace Instructions

Workspace instructions apply to everyone working in a repository:

### 1. Create the Instructions Directory

```bash
mkdir -p .paw/instructions
```

### 2. Create an Agent-Specific File

Create a file named `<agent-name>-instructions.md`. For example, for the Implementer agent:

```bash
touch .paw/instructions/PAW-03A\ Implementer-instructions.md
```

### 3. Write Your Instructions

```markdown
# Custom Instructions for PAW-03A Implementer

## Code Style

- Use TypeScript strict mode for all new files
- Prefer named exports over default exports
- Add JSDoc comments to all public functions

## Testing Requirements

- Every new function must have at least one unit test
- Use Jest for testing, not Mocha
- Test files should be co-located with source files

## Error Handling

- Always use custom error classes defined in src/errors/
- Never catch and silence errors
```

### 4. Commit to Repository

Add the instructions to version control so all team members benefit:

```bash
git add .paw/instructions/
git commit -m "Add PAW custom instructions for team conventions"
```

## Creating User Instructions

User instructions apply to you across all projects:

### 1. Create the User Instructions Directory

```bash
mkdir -p ~/.paw/instructions
```

### 2. Create an Agent-Specific File

```bash
touch ~/.paw/instructions/PAW-03A\ Implementer-instructions.md
```

### 3. Write Your Preferences

```markdown
# Personal Instructions for PAW-03A Implementer

## Communication Style

- Explain reasoning before making changes
- Ask clarifying questions when requirements are ambiguous
- Provide brief summaries after completing work

## Development Preferences

- Prefer functional programming patterns when appropriate
- Add console.log statements for debugging (I'll remove them later)
```

## Agent Name Reference

Use these exact agent names when creating instruction files:

| Agent | File Name Pattern |
|-------|-------------------|
| Specification | `PAW-01A Specification-instructions.md` |
| Spec Researcher | `PAW-01B Spec Researcher-instructions.md` |
| Code Researcher | `PAW-02A Code Researcher-instructions.md` |
| Impl Planner | `PAW-02B Impl Planner-instructions.md` |
| Implementer | `PAW-03A Implementer-instructions.md` |
| Impl Reviewer | `PAW-03B Impl Reviewer-instructions.md` |
| Documenter | `PAW-04 Documenter-instructions.md` |
| PR Agent | `PAW-05 PR-instructions.md` |
| Status Agent | `PAW-X Status-instructions.md` |

## Example: Enforcing Project Standards

Here's a complete example for a team that wants to enforce specific conventions:

**`.paw/instructions/PAW-02B Impl Planner-instructions.md`**

```markdown
# Project-Specific Planning Instructions

## Phase Structure

This project requires implementation plans to follow our sprint structure:
- Phase 1 should always be preparatory work (types, interfaces, migrations)
- Phase 2 should be core implementation
- Phase 3 should be integration and testing

## Risk Assessment

Include a "Risk Assessment" section in each phase that identifies:
- Dependencies on external services
- Database migration requirements
- Breaking API changes

## Estimation

Add time estimates to each phase:
- Small (< 2 hours)
- Medium (2-4 hours)
- Large (4-8 hours)
```

**`.paw/instructions/PAW-04 Documenter-instructions.md`**

```markdown
# Documentation Standards

## Required Sections

All feature documentation must include:
1. Overview (with problem statement)
2. Architecture diagram (Mermaid format)
3. API Reference (if applicable)
4. Migration guide (if breaking changes)

## Style Guide

- Use second person ("you") not third person
- Include code examples for all public APIs
- Maximum 80 characters per line in code blocks
```

## Initialization-Specific Instructions

For the workflow initialization stage, create a special file:

**`.paw/instructions/init-instructions.md`**

```markdown
# Initialization Instructions for This Project

## Naming Conventions

Feature slugs must include the component prefix:
- api-*, ui-*, db-* for respective components

## Required Metadata

Always include these Additional Inputs:
- Component: [api|ui|db|infra]
- Priority: [P0|P1|P2|P3]

## Issue Requirements

This project requires an issue URL for all workflows.
If no issue exists, create one first.
```

## Verifying Instructions Are Loaded

To confirm your custom instructions are being used:

1. Start a PAW agent for the relevant stage
2. Check the output—agents typically mention when custom instructions are loaded
3. Verify the agent follows your custom rules

If instructions aren't being applied:

- Check the filename matches the exact agent name (including spaces)
- Verify the file is in the correct directory (`.paw/instructions/` or `~/.paw/instructions/`)
- Ensure the file has `.md` extension
