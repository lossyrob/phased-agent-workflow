# Code Research: CLI Plugin Distribution

**Branch**: feature/cli-plugin-distribution | **Commit**: c868543a2a04d76fe05d5684e74213addb4d4608 | **Date**: 2026-02-26

**Research Question**: What existing build infrastructure, CI workflows, CLI distribution code, and documentation system exists that the plugin distribution feature will build upon?

**Permalink base**: https://github.com/lossyrob/phased-agent-workflow/blob/c868543a2a04d76fe05d5684e74213addb4d4608

---

## 1. Build System

### `cli/scripts/build-dist.js`

The build script ([cli/scripts/build-dist.js:1-174](https://github.com/lossyrob/phased-agent-workflow/blob/c868543a2a04d76fe05d5684e74213addb4d4608/cli/scripts/build-dist.js#L1-L174)) produces the CLI distribution. Key behaviors:

**Source and output directories** (lines 17-23):
- Reads agents from `agents/` (project root)
- Reads skills from `skills/` (project root)
- Outputs to `cli/dist/agents/` and `cli/dist/skills/`

**Version injection** (line 26-27): Reads version from `cli/package.json`. Two injection methods:
- `injectSkillVersion()` (lines 53-76): Adds `metadata.version` to YAML frontmatter in SKILL.md files
- `injectAgentVersion()` (lines 81-85): Appends `<!-- @paw-workflow/cli vX.X.X -->` HTML comment footer to agent files

**Conditional processing** — `processConditionals()` (lines 32-40):
- Removes `{{#vscode}}...{{/vscode}}` blocks entirely
- Keeps `{{#cli}}...{{/cli}}` block content, strips the tags
- Applied to both agents (line 100) and skills (line 134)

**Agent processing** — `buildAgents()` (lines 90-114):
- Reads all `*.agent.md` files from `agents/`
- Applies conditionals, injects version, normalizes filenames (spaces → hyphens, line 105)
- Example: `PAW Review.agent.md` → `PAW-Review.agent.md`

**Skill processing** — `buildSkills()` (lines 119-153):
- Iterates skill subdirectories, processes `SKILL.md` in each
- Applies conditionals, injects version
- Copies `references/` subdirectory if present (line 144-148), excluding dotfiles

**Clean build** (lines 161-163): Deletes entire `cli/dist/` before each build.

### Output Structure

After build, `cli/dist/` contains:
```
cli/dist/
├── agents/
│   ├── PAW.agent.md
│   └── PAW-Review.agent.md
└── skills/
    ├── paw-code-research/SKILL.md
    ├── paw-sot/SKILL.md
    ├── paw-sot/references/specialists
    └── ... (29 skill directories total)
```

The `cli/.gitignore` contains `dist/` — it is built on demand and not committed.

---

## 2. CLI Install Command

### `cli/lib/commands/install.js`

The install command ([cli/lib/commands/install.js:1-120](https://github.com/lossyrob/phased-agent-workflow/blob/c868543a2a04d76fe05d5684e74213addb4d4608/cli/lib/commands/install.js#L1-L120)) copies built dist files to target directories:

**File copying** (lines 13-31): Recursive `copyDirectory()` function copies all files from source to destination, collecting installed file paths into a `fileList` array.

**Target validation** (line 34): Checks target against `SUPPORTED_TARGETS` (`['copilot', 'claude']` from paths.js:32).

**Existing installation check** (lines 48-58): Checks for existing manifest OR PAW-named files in agents dir. Prompts for confirmation unless `--force` flag.

**Manifest tracking** (lines 76-77): After copying, calls `createManifest(VERSION, target, installedFiles)` and `writeManifest(manifest)` to record installed version, timestamp, target, and file paths.

**Post-install output** (lines 86-119): Shows quick-start instructions specific to target (`copilot` vs `claude`), with CLI-specific commands.

---

## 3. CLI Package Structure

### `cli/package.json`

[cli/package.json:1-40](https://github.com/lossyrob/phased-agent-workflow/blob/c868543a2a04d76fe05d5684e74213addb4d4608/cli/package.json#L1-L40):
- **name**: `@paw-workflow/cli`
- **version**: `0.0.1`
- **type**: `module` (ESM)
- **bin**: `{ "paw": "bin/paw.js" }`
- **files**: `["bin/", "lib/", "dist/"]` — these are included in the npm package
- **scripts**:
  - `build`: `node scripts/build-dist.js`
  - `test`: `node --test test/*.test.js`
  - `lint`: `eslint .`
  - `prepublishOnly`: `npm run build` — ensures dist/ is built before npm publish
- **engines**: `node >= 18.0.0`
- **devDependencies**: only `eslint ^9.0.0`
- **No runtime dependencies** — the CLI is dependency-free

### `cli/bin/paw.js`

[cli/bin/paw.js:1-92](https://github.com/lossyrob/phased-agent-workflow/blob/c868543a2a04d76fe05d5684e74213addb4d4608/cli/bin/paw.js#L1-L92): Entry point with four commands:
- `install <target>` → `installCommand(target, flags)`
- `upgrade` → `upgradeCommand(flags)`
- `list` → `listCommand()`
- `uninstall [target]` → `uninstallCommand(flags, target)`

Supports `--version`/`-v`, `--help`/`-h`, `--force`/`-f`, `--no-banner` flags.

### `cli/lib/paths.js`

[cli/lib/paths.js:1-79](https://github.com/lossyrob/phased-agent-workflow/blob/c868543a2a04d76fe05d5684e74213addb4d4608/cli/lib/paths.js#L1-L79): Target directory resolution:

| Target | Agents Dir | Skills Dir |
|--------|-----------|------------|
| `copilot` | `~/.copilot/agents/` | `~/.copilot/skills/` |
| `claude` | `~/.claude/agents/` | `~/.claude/skills/` |

- `SUPPORTED_TARGETS` = `['copilot', 'claude']` (line 32)
- Manifest stored at `~/.paw/<target>-cli/manifest.json` (line 61-62)
- Dist directory resolved relative to `import.meta.dirname` (line 69)

### `cli/lib/manifest.js`

[cli/lib/manifest.js:1-44](https://github.com/lossyrob/phased-agent-workflow/blob/c868543a2a04d76fe05d5684e74213addb4d4608/cli/lib/manifest.js#L1-L44): Installation tracking:

- `readManifest(target)` — reads `~/.paw/<target>-cli/manifest.json`, returns null if missing
- `writeManifest(manifest)` — writes JSON manifest, creates directory if needed
- `createManifest(version, target, files)` — returns `{ version, installedAt, target, files }`
- `deleteManifest(target)` — removes manifest file

### `cli/lib/version.js`

[cli/lib/version.js:1-7](https://github.com/lossyrob/phased-agent-workflow/blob/c868543a2a04d76fe05d5684e74213addb4d4608/cli/lib/version.js#L1-L7): Exports `VERSION` by reading `cli/package.json` via `createRequire`.

### `cli/lib/registry.js`

[cli/lib/registry.js:1-42](https://github.com/lossyrob/phased-agent-workflow/blob/c868543a2a04d76fe05d5684e74213addb4d4608/cli/lib/registry.js#L1-L42): Queries npm registry at `https://registry.npmjs.org/@paw-workflow/cli` for latest version. Used by the upgrade command.

### Other CLI Commands

- `cli/lib/commands/list.js` ([lines 1-25](https://github.com/lossyrob/phased-agent-workflow/blob/c868543a2a04d76fe05d5684e74213addb4d4608/cli/lib/commands/list.js#L1-L25)): Reads manifests for all targets, displays version/target/install date/file counts.
- `cli/lib/commands/uninstall.js` ([lines 1-115](https://github.com/lossyrob/phased-agent-workflow/blob/c868543a2a04d76fe05d5684e74213addb4d4608/cli/lib/commands/uninstall.js#L1-L115)): Uses manifest file lists to remove individual files, cleans empty directories, handles orphaned files without manifest.
- `cli/lib/commands/upgrade.js` ([lines 1-132](https://github.com/lossyrob/phased-agent-workflow/blob/c868543a2a04d76fe05d5684e74213addb4d4608/cli/lib/commands/upgrade.js#L1-L132)): Compares installed version against npm registry, handles both global and npx upgrade paths.

### CLI Tests

- `cli/test/build.test.js` — tests for the build script
- `cli/test/install.test.js` — tests for the install command

---

## 4. CI/CD Workflows

### `.github/workflows/publish-cli.yml`

[publish-cli.yml:1-92](https://github.com/lossyrob/phased-agent-workflow/blob/c868543a2a04d76fe05d5684e74213addb4d4608/.github/workflows/publish-cli.yml#L1-L92):

**Trigger**: Push of tags matching `cli-v*` (line 6-7).

**Permissions**: `id-token: write` (OIDC), `contents: write` (releases) (lines 9-10).

**Steps**:
1. Checkout code
2. Setup Node.js 24 with npm registry
3. Extract version from tag: strips `cli-v` prefix (lines 30-34)
4. Determine pre-release: checks for `-alpha`, `-beta`, `-rc` suffixes (lines 38-49)
5. Set `package.json` version from tag via `npm version` (line 52)
6. Install dependencies (`npm ci`), build (`npm run build`), test (`npm test`)
7. Publish to npm with `--access public --tag latest` (or `beta` for pre-releases) (line 64)
8. Create GitHub Release if it doesn't exist (lines 66-92)

**Key detail**: The workflow runs in `cli/` working directory (line 17-18). Version is extracted from the git tag, not from package.json.

### `.github/workflows/release.yml`

[release.yml:1-116](https://github.com/lossyrob/phased-agent-workflow/blob/c868543a2a04d76fe05d5684e74213addb4d4608/.github/workflows/release.yml#L1-L116):

**Trigger**: Push of tags matching `v*` (VS Code extension releases).

**Steps**: Checkout → npm ci → compile → extract version → determine pre-release (odd/even minor) → `npm version` → package VSIX → create GitHub Release with VSIX attached.

This is the VS Code extension release workflow, separate from CLI publishing.

### `.github/workflows/pr-checks.yml`

[pr-checks.yml:1-66](https://github.com/lossyrob/phased-agent-workflow/blob/c868543a2a04d76fe05d5684e74213addb4d4608/.github/workflows/pr-checks.yml#L1-L66):

**Trigger**: PRs to `main` or `feature/**` branches, filtered by path changes in `src/`, `agents/`, `skills/`, `scripts/`, `.github/workflows/pr-checks.yml` (lines 8-16).

**Checks run**:
1. `npm run lint` — ESLint
2. `npm run compile` — TypeScript compilation
3. `npm test` — VS Code extension unit tests (requires xvfb for headless Electron)
4. `npm run lint:agent:all` — Agent file linting

**Note**: No CLI-specific tests (`cli/npm test`) run in PR checks. Only the root-level VS Code extension tests run.

### `.github/workflows/docs.yml`

[docs.yml:1-66](https://github.com/lossyrob/phased-agent-workflow/blob/c868543a2a04d76fe05d5684e74213addb4d4608/.github/workflows/docs.yml#L1-L66):

**Trigger**: Push to `main` with changes in `docs/`, `mkdocs.yml`, or the workflow file itself.

Deploys documentation to GitHub Pages via `mkdocs gh-deploy --force`. Uses Python, `mkdocs-material` pip package.

---

## 5. Agent and Skill Source Files

### Agents (`agents/`)

Two agent files exist:

| File | Lines | Description |
|------|-------|-------------|
| `agents/PAW.agent.md` | 215 | Main PAW implementation workflow orchestrator. Contains conditional blocks (`{{#vscode}}`/`{{#cli}}`). Uses hybrid execution model with interactive and delegated activities. |
| `agents/PAW Review.agent.md` | 100 | PAW Review workflow orchestrator for PR code review. Contains conditional blocks for platform-specific skill loading. |

Filenames have spaces; the build script normalizes them to hyphens for CLI distribution.

### Skills (`skills/`)

29 skill directories exist, each containing at minimum a `SKILL.md` file:

| Skill | Has `references/`? |
|-------|--------------------|
| paw-code-research | No |
| paw-docs-guidance | No |
| paw-final-review | No |
| paw-git-operations | No |
| paw-impl-review | No |
| paw-implement | No |
| paw-init | No |
| paw-plan-review | No |
| paw-planning | No |
| paw-planning-docs-review | No |
| paw-pr | No |
| paw-review-baseline | No |
| paw-review-correlation | No |
| paw-review-critic | No |
| paw-review-feedback | No |
| paw-review-gap | No |
| paw-review-github | No |
| paw-review-impact | No |
| paw-review-response | No |
| paw-review-understanding | No |
| paw-review-workflow | No |
| paw-rewind | No |
| paw-sot | Yes (`references/specialists`) |
| paw-spec | No |
| paw-spec-research | No |
| paw-spec-review | No |
| paw-status | No |
| paw-transition | No |
| paw-work-shaping | No |
| paw-workflow | No |

Only `paw-sot` has a `references/` subdirectory (containing `specialists`).

---

## 6. Documentation System

### MkDocs with Material Theme

[mkdocs.yml:1-78](https://github.com/lossyrob/phased-agent-workflow/blob/c868543a2a04d76fe05d5684e74213addb4d4608/mkdocs.yml#L1-L78):

- **Site**: `https://lossyrob.github.io/phased-agent-workflow`
- **Theme**: Material for MkDocs with light/dark mode toggle
- **Plugins**: search
- **Extensions**: syntax highlighting, admonitions, TOC with permalinks

**Navigation structure** (lines 61-78):
```
- Home: index.md
- User Guide:
    - Getting Started
    - VS Code Extension
    - CLI Installation
    - Workflow Modes
    - Stage Transitions
    - Two Workflows
    - Society-of-Thought Review
- Specification:
    - Overview
    - Implementation Workflow
    - Review Workflow
- Reference:
    - Agents
    - Artifacts
```

### `docs/` Directory Structure

```
docs/
├── index.md
├── guide/
│   ├── index.md
│   ├── cli-installation.md
│   ├── vscode-extension.md
│   ├── workflow-modes.md
│   ├── stage-transitions.md
│   ├── two-workflows.md
│   └── society-of-thought-review.md
├── specification/
│   ├── index.md (inferred)
│   ├── implementation.md (inferred)
│   └── review.md (inferred)
└── reference/
    ├── agents.md
    └── artifacts.md
```

### Build Commands

- `mkdocs build` — build static site
- `mkdocs build --strict` — build with strict link validation (per `.github/copilot-instructions.md`)
- `mkdocs serve` — local dev server at `http://localhost:8000`
- `mkdocs gh-deploy --force` — deploy to GitHub Pages

### CLI-Specific Documentation

- [docs/guide/cli-installation.md](https://github.com/lossyrob/phased-agent-workflow/blob/c868543a2a04d76fe05d5684e74213addb4d4608/docs/guide/cli-installation.md): Documents `npx @paw-workflow/cli install copilot` workflow, commands, and what gets installed.
- [cli/README.md](https://github.com/lossyrob/phased-agent-workflow/blob/c868543a2a04d76fe05d5684e74213addb4d4608/cli/README.md): CLI-specific developer documentation including setup, build, test, and publishing.

### Root README.md

[README.md](https://github.com/lossyrob/phased-agent-workflow/blob/c868543a2a04d76fe05d5684e74213addb4d4608/README.md): Opens with `npx @paw-workflow/cli install copilot` as the primary install method. Documents both platforms (Copilot CLI and VS Code).

---

## 7. Verification Commands

### Root `package.json` Scripts

[package.json:122-137](https://github.com/lossyrob/phased-agent-workflow/blob/c868543a2a04d76fe05d5684e74213addb4d4608/package.json#L122-L137):

| Script | Command | Purpose |
|--------|---------|---------|
| `compile` | `tsc -p ./` | TypeScript compilation (VS Code extension) |
| `test` | `node ./out/test/runTest.js` | VS Code extension unit tests |
| `lint` | `eslint src --ext ts` | ESLint on TypeScript source |
| `package` | `vsce package` | Package VSIX |
| `lint:agent` | `./scripts/lint-prompting.sh` | Lint single agent file |
| `lint:agent:all` | `./scripts/lint-prompting.sh --all` | Lint all agents and skills |
| `lint:skills` | `./scripts/lint-prompting.sh --skills` | Lint skills only |
| `test:integration` | `cd tests/integration && npx tsx --test tests/**/*.test.ts` | All integration tests |
| `test:integration:skills` | (same pattern, skills only) | Skill-level integration tests |
| `test:integration:workflows` | (same pattern, workflows only) | Workflow integration tests |

### CLI-Specific Scripts

[cli/package.json:14-18](https://github.com/lossyrob/phased-agent-workflow/blob/c868543a2a04d76fe05d5684e74213addb4d4608/cli/package.json#L14-L18):

| Script | Command | Purpose |
|--------|---------|---------|
| `build` | `node scripts/build-dist.js` | Build dist from source agents/skills |
| `test` | `node --test test/*.test.js` | CLI unit tests |
| `lint` | `eslint .` | ESLint on CLI code |
| `prepublishOnly` | `npm run build` | Auto-build before npm publish |

---

## 8. Existing Plugin/Marketplace Files

**No plugin or marketplace files exist anywhere in the repository.**

Specifically checked and not found:
- No `plugin.json` files anywhere
- No `.github/plugin/` directory
- No `marketplace.json` files
- No `.claude-plugin/` directory

The plugin distribution feature will be creating these from scratch.

---

## Summary of Key Integration Points

1. **Build script** (`cli/scripts/build-dist.js`) already produces processed agents and skills in `cli/dist/` — plugin generation can reuse or extend this output.
2. **Version source**: `cli/package.json` version, overridden from git tag in CI via `npm version` (publish-cli.yml:52).
3. **Conditional processing** is already in place for CLI vs VS Code content differentiation.
4. **CI trigger convention**: `cli-v*` tags trigger CLI publishing; plugin branch publishing would extend this workflow.
5. **npm `prepublishOnly` hook** ensures dist/ is built before any publish; plugin build could follow a similar pattern.
6. **No existing plugin infrastructure** — all plugin files (plugin.json, marketplace.json, plugin branch) need to be created new.
7. **Documentation** exists in three locations that may need updates: `README.md`, `cli/README.md`, and `docs/guide/cli-installation.md`.
