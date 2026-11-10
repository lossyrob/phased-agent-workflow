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

- **User Guide** (`docs/guide/`) - For user-facing features, commands, configuration, or workflows
- **Specification** (`docs/specification/`, `docs/specification/v2/`) - For changes to activities, contracts, invariants, or agent behavior
- **Release notes** (`docs/release-notes.md`) - For breaking changes and known limits
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

## Platform Runtime Separation

- PAW has two runtimes: GitHub Copilot CLI and the VS Code extension.
- Copilot CLI executes installed `agents/`, `skills/`, and prompt content directly. It does **not** run `src/` TypeScript or access `vscode.ExtensionContext` state.
- `src/` is VS Code-only automation (commands, extension state, worktree handoff, prompt/template loading). Do not treat it as hidden runtime support for CLI behavior.
- If a behavior depends on VS Code-only automation or state, document it as VS Code-only or provide a CLI analogue in agent/skill text.
- `tests/integration/` exercises CLI runtime behavior through the Copilot SDK, not the VS Code extension implementation.

IMPORTANT: **PAW Architecture Philosophy** - tools provide procedural operations, agents provide decision-making logic and reasoning. Rely on agents to use reasoning and logic over hardcoding procedural steps into tools.

## Skill Development

This project has two skill locations:

| Location | Used by | Bundled Resources |
|----------|---------|-------------------|
| `.github/skills/` | Agents working in this repo | ✅ Supported (`scripts/`, `references/`, `assets/`) |
| `skills/` | Shipped PAW skills: Copilot CLI plugin and npm installer; VS Code `chatSkills` (rendered to `vscode-assets/skills/`) | `references/` only |

**When creating skills in `skills/`**: `references/` files are read from the installed skill directory on disk (e.g. `paw-workflow/references/activities/*.md`, read by subagents). A skill cannot rely on reading another skill's `references/`. Do not create `scripts/` or `assets/` subdirectories.

**Shared blocks**: text inside `<!-- shared:... -->` markers is duplicated between `paw-workflow` and `paw-review-workflow`; edit both copies (`tests/integration/tests/skills/review-shared-contracts.test.ts` fails if they differ).

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

### Write for the Executing Agent, Not a Human Reader

Prompt content (skills, agents, inline instructions) is consumed by an agent as operating instructions. Every line should direct the agent's behavior. Text that explains design rationale, motivates architectural choices, or compares approaches helps a human reader but wastes agent context tokens and dilutes actionable signal.

**Anti-pattern**: Narration and rationale embedded in instructions
```markdown
This workflow replaces the rigid spec→plan→implement pipeline with a lighter
approach that trusts frontier models to make implementation decisions. Unlike
full PAW, it skips the specification stage entirely.
```

**Pattern**: Direct the agent's behavior
```markdown
Execute stages in order: plan → implement → review → PR. Skip specification.
```

**Test**: For each sentence, ask: "Does this change what the agent does?" If it only explains *why* or provides background, move it to `docs/` or remove it.

**Common violations**:
- Design rationale ("this approach was chosen because...")
- Comparative framing ("unlike X, this does Y...")
- Philosophy or value statements ("trusts models to...", "designed for...")
- Background context the agent can't act on ("models have advanced since...")

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

Prompt content (agents, skills) is delivered to the target agent as text—the agent has no access to other source files in the repository. References like "see PAW.agent.md" or "refer to paw-status/SKILL.md" are meaningless at runtime because the agent only sees the content loaded into its context. Instead, inline the essential information or describe the behavior directly. When reviewing prompts, ask: "Can the agent act on this without reading another file?"

### Don't Waste Context on Error Handling

Let agents determine how to handle errors and report to users. Explicit error handling instructions consume tokens without adding value—agents can reason about appropriate error responses contextually.

## Implementation Review Guidelines

When reviewing implementation changes, verify cross-artifact consistency:

- Changes to `paw-workflow` configuration, presets or procedures → verify `paw-status`, `docs/guide/workflow-presets.md` and `docs/specification/v2/design.md` match
- Changes to `paw-status` skill → verify it aligns with `paw-workflow` configuration and presets
- Changes to workflow skills → verify artifact locations, branch patterns, and agent responsibilities match the specification

**Source of truth**: `docs/specification/v2/` (design, invariants) and `skills/paw-workflow/references/` → user docs reflect them. Root `paw-specification.md` and `paw-review-specification.md` are pointers.

### Agent Content vs Human Documentation

Files in `agents/`, `skills/`, and `prompts/` are **agent-facing content** — they are loaded into LLM context at runtime, not read by humans during normal use. When reviewing changes to these files:

- **Do NOT** suggest adding notes, guidance, or workarounds for human authors/users. Those belong in `docs/`.
- **Do NOT** treat skill files like documentation pages (e.g., "specialist authors need a reference table here").
- **DO** evaluate whether the content gives the agent clear, unambiguous instructions.
- **DO** flag missing behavioral rules or ambiguous agent logic — that's what these files are for.

Human-facing guidance (authoring guides, tutorials, field references) goes in `docs/guide/` or `docs/reference/`. Agent-facing content (behavioral rules, input contracts, execution logic) goes in skills and agents.

## Integration Testing

Integration tests validate that skills and agents produce correct behavior when driven through the Copilot SDK. They replace manual "try it and see" validation.

### Strategy

Not every change needs its own integration test. The goal is to **run the test that validates your change**:

1. **Identify the relevant existing test** that covers the behavior you changed
2. **Modify it** if the change alters expected behavior (e.g., renamed values, new assertions)
3. **Create a new test** only when no existing test covers the affected behavior
4. **Run the relevant test(s)** before finalizing PRs — this replaces manual workflow validation

### When to Add/Update Tests

- **New or changed `paw-workflow` or `paw-review-workflow` behavior** → Add or update a v2 test in `tests/integration/tests/v2/`
- **Other skill behavior** → Add or update a workflow test in `tests/integration/tests/workflows/`
- **New harness capability** (answerer, policy, assertion) → Add skill-level test in `tests/integration/tests/skills/`
- **Bug fix in workflow behavior** → Add regression test covering the fix
- **Behavioral rename or value change** → Add or update test validating both old (backward compat) and new values
- **Pure prompt wording changes** with no behavioral change → No test needed
- **Documentation-only changes** → No test needed

### Test Types

- **Skill-level tests** (`tests/integration/tests/skills/`): No LLM, fast. Test harness components and skill contracts (shared blocks, policy text).
- **v2 tests** (`tests/integration/tests/v2/`): Drive `paw-workflow` / `paw-review-workflow` runs; assert on tool calls, todo state, git state and artifacts per `docs/specification/v2/invariants.md`. Need an installed Copilot CLI (`PAW_TEST_CLI_PATH`).
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
cd tests/integration && npm run test:v2   # v2 suites, sequential; set PAW_TEST_CLI_PATH

# Run a specific test file
cd tests/integration && npx tsx --test tests/workflows/<test-file>.test.ts
```

### Existing Test Coverage

| Test | What it validates | Runtime |
|------|-------------------|---------|
| `v2/default-run` | v2 golden path: plan → implement → final review → one PR, with the invariant catalogue | ~3-5 min |
| `v2/paw-agent` | The `PAW` agent loads `paw-workflow` and completes a default run | ~3-5 min |
| `v2/resume`, `v2/v1-context-resume` | Resume from evidence; a v1 `WorkflowContext.md` is mapped once | ~3-5 min |
| `v2/paw-lite-alias`, `v2/preset-lite` | `paw-lite` resolves to the `lite` preset; a full lite run | ~1-5 min |
| `v2/*` (others) | Configured reviews, rewind, worktree, lifecycles, revisions | ~3-8 min |
| `v2/review-default-run`, `v2/review-sot` | PAW Review on a stub-`gh` PR: todo graph, stage subagents with the shared return block, host-only pending review; configured SoT runs through `paw-sot` | ~5-15 min |
| `work-shaping` | Work shaping Q&A flow | ~1-2 min |
| `sot-perspectives` | Society-of-thought perspectives | ~2-3 min |
| `tool-policy` | Tool policy enforcement | ~30s |
