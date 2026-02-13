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

PRs that **only** affect CLI-specific code (`cli/` directory, `publish-cli.yml`, etc.) should have the `cli` label. These won't appear in the VS Code extension changelog.

### VS Code Label

PRs that **only** affect VS Code extension code should have the `vscode` label. These are excluded from the CLI release changelog.

PRs that touch agents, skills, prompts, or shared code don't need a platform label—they're included in both changelogs by default. Platform labels are applied at release-prep time using `prepare-cli-release.prompt.md`.

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

## Integration Testing

Integration tests validate that skills and agents produce correct behavior when driven through the Copilot SDK. They replace manual "try it and see" validation.

### Strategy

Not every change needs its own integration test. The goal is to **run the test that validates your change**:

1. **Identify the relevant existing test** that covers the behavior you changed
2. **Modify it** if the change alters expected behavior (e.g., renamed values, new assertions)
3. **Create a new test** only when no existing test covers the affected behavior
4. **Run the relevant test(s)** before finalizing PRs — this replaces manual workflow validation

### When to Add/Update Tests

- **New or changed skill behavior** → Add or update a workflow test in `tests/integration/tests/workflows/`
- **New harness capability** (answerer, policy, assertion) → Add skill-level test in `tests/integration/tests/skills/`
- **Bug fix in workflow behavior** → Add regression test covering the fix
- **Behavioral rename or value change** → Add or update test validating both old (backward compat) and new values
- **Pure prompt wording changes** with no behavioral change → No test needed
- **Documentation-only changes** → No test needed

### Test Types

- **Skill-level tests** (`tests/integration/tests/skills/`): No LLM, fast. Test harness components (answerer rules, tool policy, assertions).
- **Workflow tests** (`tests/integration/tests/workflows/`): Drive SDK sessions against skills. Use `createTestContext()`, `RuleBasedAnswerer`, structural assertions, and optionally `Judge` for qualitative evaluation.

### Key Patterns

- Import with `.js` extensions (ESM package)
- Use `TestFixture.clone("minimal-ts")` for isolated temp repos
- Use `seedWorkflowState(workId, stage)` to start from a known point
- Seed custom artifacts (e.g., WorkflowContext.md) with `writeFile` + `mkdir` for targeted scenarios
- Use `assertSpecStructure`, `assertPlanStructure`, `assertToolCalls` for structural checks
- Use `response?.data?.content` to get agent response text for assertion
- Use `Judge` with rubrics for qualitative artifact evaluation
- `toolArgs` from SDK hooks are JSON strings — use `parseInput()` helpers

### Running Tests

```bash
cd tests/integration && npm install  # first time only
npm run test:integration:skills      # fast, no LLM
npm run test:integration:workflows   # slow, requires Copilot auth

# Run a specific test file
cd tests/integration && npx tsx --test tests/workflows/<test-file>.test.ts
```

### Existing Test Coverage

| Test | What it validates | Runtime |
|------|-------------------|---------|
| `full-local-workflow` | Golden path: spec → plan → implement (local strategy) | ~3-5 min |
| `minimal-workflow` | Minimal mode: plan → implement (no spec) | ~2-3 min |
| `transition-review-policy` | Review policy values (legacy + current) and pause behavior | ~1-2 min |
| `paw-spec` | Spec creation from brief | ~1-2 min |
| `paw-planning` | Plan creation from seeded spec | ~1-2 min |
| `paw-implement` | Implementation from seeded plan | ~2-3 min |
| `spec-review` | Spec review verdict | ~1-2 min |
| `code-research` | Code research artifact creation | ~1-2 min |
| `work-shaping` | Work shaping Q&A flow | ~1-2 min |
| `git-branching` | Branch operations | ~1-2 min |
| `tool-policy` | Tool policy enforcement | ~30s |
