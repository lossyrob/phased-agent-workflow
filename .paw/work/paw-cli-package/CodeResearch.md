---
date: 2026-02-03T12:30:00-05:00
git_commit: 691df76d4b9a80c96690960c4fad1967216cefc4
branch: feature/paw-cli-package
repository: phased-agent-workflow
topic: "PAW CLI Package Structure Research"
tags: [research, codebase, npm, cli, agents, skills]
status: complete
last_updated: 2026-02-03
---

# Research: PAW CLI Package Structure

## Research Question

What source files need to be bundled in the `@paw/cli` npm package, and what existing patterns exist for CLI installation and distribution?

## Summary

The PAW project has 2 agents and 26 skills that need to be bundled for Copilot CLI installation. Existing export scripts (`scripts/export-for-cli.sh`, `scripts/export-for-cli.ps1`) already handle the core logic: conditional block processing for CLI vs VS Code, target directory structure, and file copying. The npm package can leverage this logic. The project has a root `package.json` configured for the VS Code extension; a new separate package configuration will be needed for `@paw/cli`. Skills are simple single-file directories (SKILL.md only, no subdirectories with resources).

## Documentation System

- **Framework**: mkdocs (Material theme)
- **Docs Directory**: `docs/`
- **Navigation Config**: `mkdocs.yml:1-50`
- **Style Conventions**: Material theme, tabbed navigation
- **Build Command**: `mkdocs build --strict` (with `.venv` activated)
- **Standard Files**: `README.md`, `LICENSE`, `DEVELOPING.md` at root

## Verification Commands

- **Test Command**: `npm test` (`package.json:128`)
- **Lint Command**: `npm run lint` (`package.json:130`)
- **Build Command**: `npm run compile` (`package.json:125`)
- **Type Check**: TypeScript via `tsc -p ./` (part of compile)

## Detailed Findings

### Source Files to Bundle

#### Agents (2 files)

Location: `agents/` directory

| File | Purpose |
|------|---------|
| `agents/PAW.agent.md` | Main PAW implementation workflow agent |
| `agents/PAW Review.agent.md` | PR review workflow agent |

Agent files follow the pattern `{Name}.agent.md` with YAML frontmatter containing `description` field (`agents/PAW.agent.md:1-3`).

Note: Agent filenames contain spaces. The export script transforms spaces to hyphens for CLI compatibility (`scripts/export-for-cli.sh:92-93`):
```bash
output_filename=$(echo "$agent_name" | tr ' ' '-')
```

#### Skills (26 directories)

Location: `skills/` directory

Each skill is a directory containing only `SKILL.md`:

| Skill Directory | Description |
|-----------------|-------------|
| `paw-workflow` | Reference documentation for multi-phase workflows |
| `paw-init` | Bootstrap/initialization skill |
| `paw-spec` | Specification writing |
| `paw-spec-research` | Research for spec writing |
| `paw-spec-review` | Specification review |
| `paw-planning` | Implementation planning |
| `paw-plan-review` | Plan review |
| `paw-code-research` | Codebase research |
| `paw-implement` | Implementation execution |
| `paw-impl-review` | Implementation review |
| `paw-pr` | Final PR creation |
| `paw-git-operations` | Git/branch operations |
| `paw-docs-guidance` | Documentation conventions |
| `paw-transition` | Workflow stage transitions |
| `paw-status` | Workflow status diagnostics |
| `paw-work-shaping` | Pre-spec ideation |
| `paw-review-workflow` | PR review orchestration |
| `paw-review-understanding` | PR context analysis |
| `paw-review-baseline` | Pre-change baseline analysis |
| `paw-review-impact` | Change impact evaluation |
| `paw-review-gap` | Gap analysis |
| `paw-review-feedback` | Review comment generation |
| `paw-review-critic` | Comment quality assessment |
| `paw-review-correlation` | Cross-PR correlation |
| `paw-review-github` | GitHub API posting |
| `paw-review-response` | PR comment response handling |

All skills contain exactly one file: `SKILL.md`. No skills have `scripts/`, `references/`, or `assets/` subdirectories—the project README states this explicitly (`COPILOT_INSTRUCTIONS.md`):

> **When creating skills in `skills/`**: Only create the SKILL.md file. The `paw_get_skill` tool returns SKILL.md content as text—it cannot access bundled resources.

### Skill/Agent File Structure

#### Agent Structure (`agents/PAW.agent.md:1-10`)

```markdown
---
description: 'PAW - Executes the PAW implementation workflow'
---
# PAW Agent

You are a workflow orchestrator using a **hybrid execution model**...
```

- YAML frontmatter with `description` field
- Markdown content with conditional blocks (`{{#vscode}}...{{/vscode}}`, `{{#cli}}...{{/cli}}`)

#### Skill Structure (`skills/paw-status/SKILL.md:1-10`)

```markdown
---
name: paw-status
description: Workflow status activity skill...
---

# Workflow Status

> **Execution Context**: This skill runs **directly**...
```

- YAML frontmatter with `name` and `description` fields
- Markdown content with conditional blocks

### Conditional Block Processing

Both agents and skills use template conditionals (`scripts/export-for-cli.sh:34-47`):

- `{{#cli}}...{{/cli}}` - Content kept for CLI export
- `{{#vscode}}...{{/vscode}}` - Content removed for CLI export

Processing uses perl for multi-line regex:
```bash
# Remove vscode blocks
content=$(echo "$content" | perl -0777 -pe 's/\{\{#vscode\}\}.*?\{\{\/vscode\}\}//gs')

# Keep cli content, remove tags
content=$(echo "$content" | perl -0777 -pe 's/\{\{#cli\}\}(.*?)\{\{\/cli\}\}/$1/gs')
```

### Existing Export Scripts

#### Bash Script (`scripts/export-for-cli.sh`)

Full implementation exists with:
- Default target directories: `~/.copilot/skills/`, `~/.copilot/agents/` (`scripts/export-for-cli.sh:24-31`)
- Windows detection via `$OSTYPE` (`scripts/export-for-cli.sh:25`)
- Single/batch export modes (`scripts/export-for-cli.sh:133-172`)
- Conditional block processing (`scripts/export-for-cli.sh:36-47`)

#### PowerShell Script (`scripts/export-for-cli.ps1`)

Parallel implementation for Windows with identical functionality.

### Existing Package Configuration

#### Root package.json (`package.json:1-152`)

Configured for VS Code extension:
- Name: `paw-workflow` (not scoped)
- Publisher: `paw-workflow`
- Entry: `./out/extension.js`
- Contains `vsce` for VS Code packaging

Key scripts:
- `package`: `vsce package` (`package.json:129`)
- `build-vsix`: `./scripts/build-vsix.sh` (`package.json:133`)

**No existing npm package configuration for CLI distribution.** A separate `cli/package.json` or similar will be needed for `@paw/cli`.

### Target Directory Structure

Per Copilot CLI conventions and spec:
- Agents: `~/.copilot/agents/{name}.agent.md`
- Skills: `~/.copilot/skills/{skill-name}/SKILL.md`

The manifest file should track installed files at `~/.paw/copilot-cli/manifest.json` (per Spec.md FR-003).

### Build/Distribution Patterns

The VS Code extension uses:
- TypeScript compilation: `tsc -p ./`
- VSIX packaging: `vsce package`
- Build script: `scripts/build-vsix.sh`

For npm package, the pattern would be:
1. Bundle agent/skill files into package (e.g., `dist/agents/`, `dist/skills/`)
2. Include CLI entry point (e.g., `bin/paw`)
3. Export script logic can be embedded in Node.js

## Code References

- `package.json:1-152` - Root package configuration (VS Code extension)
- `scripts/export-for-cli.sh:1-173` - Bash export script with all logic
- `scripts/export-for-cli.ps1:1-197` - PowerShell export script
- `agents/PAW.agent.md:1-177` - Main PAW agent with conditional blocks
- `agents/PAW Review.agent.md:1-72` - Review agent with conditional blocks
- `skills/*/SKILL.md` - 26 skill files (each is sole file in directory)
- `mkdocs.yml:1-50` - Documentation configuration
- `.gitignore:1-78` - Patterns for ignoring build artifacts

## Architecture Documentation

### Key Patterns for CLI Package

1. **Conditional processing**: Must process `{{#cli}}/{{#vscode}}` blocks before bundling
2. **Filename normalization**: Agent names with spaces become hyphenated (e.g., "PAW Review" → "PAW-Review")
3. **Directory structure**: Skills use `{skill-name}/SKILL.md`, agents use `{name}.agent.md`
4. **No bundled resources in skills**: Only SKILL.md files—npm package doesn't need to handle asset directories

### Recommended Package Structure

```
cli/
├── package.json          # @paw/cli configuration
├── bin/
│   └── paw.js           # CLI entry point
├── src/
│   ├── commands/        # install, upgrade, list, uninstall
│   ├── lib/
│   │   └── conditionals.js  # Port of export script logic
│   └── index.js
└── dist/                # Bundled assets (at build time)
    ├── agents/
    │   ├── PAW.agent.md
    │   └── PAW-Review.agent.md
    └── skills/
        └── paw-*/SKILL.md (26 directories)
```

## Open Questions

1. **Monorepo vs separate package**: Should `@paw/cli` live in this repo (monorepo style) or a separate repository? The existing `package.json` is for the VS Code extension—adding CLI as a workspace or separate directory would work.

2. **Pre-processing vs runtime processing**: Should conditional blocks be processed at npm publish time (static dist files) or at install time (runtime processing)? Static is simpler but means two copies of each file in source control.
