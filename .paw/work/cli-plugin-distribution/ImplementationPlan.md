# CLI Plugin Distribution Implementation Plan

## Overview
Package PAW as a Copilot CLI plugin so users can install via `copilot plugin install` with native lifecycle management. The existing build system already produces processed agents and skills in `cli/dist/`; this work adds plugin manifest generation, CI automation to publish a `plugin` orphan branch, and documentation updates.

## Current State Analysis
- `cli/scripts/build-dist.js` produces CLI-processed agents (2 files) and skills (29 directories) in `cli/dist/` with conditional block processing and version injection
- `publish-cli.yml` triggers on `cli-v*` tags, runs build/test/publish to npm, creates GitHub Releases
- No `plugin.json`, `marketplace.json`, `.github/plugin/`, or `plugin` branch exists
- Install docs in three locations: `README.md`, `docs/guide/cli-installation.md`, `cli/README.md`
- CLI version source: `cli/package.json` (overridden from git tag in CI)

## Desired End State
- `npm run build` in `cli/` additionally produces `plugin.json` and `.github/plugin/marketplace.json` in `cli/dist/`
- Pushing a `cli-v*` tag publishes both to npm AND updates the `plugin` orphan branch with the built distribution
- Users can install PAW via the plugin system (exact syntax validated in Phase 2)
- Documentation recommends plugin install for Copilot CLI users, npm CLI for Claude Code users
- All verification: CLI tests pass (`cd cli && npm test`), lint passes (`cd cli && npm run lint`), docs build (`mkdocs build --strict`), agent lint passes (`npm run lint:agent:all`)

## What We're NOT Doing
- Submitting to `github/awesome-copilot` marketplace (manual follow-up after this ships)
- Claude Code plugin (`.claude-plugin/`) support
- Bundling hooks or MCP server configs in the plugin
- Removing or deprecating the npm CLI distribution
- Modifying the VS Code extension or its release workflow
- Adding PR checks for plugin-specific validation (can be added later)

## Phase Status
- [ ] **Phase 1: Plugin Manifest Generation** - Extend build script to produce plugin.json and marketplace.json
- [ ] **Phase 2: CI Plugin Branch Publishing** - Add workflow job to publish built dist to plugin orphan branch (depends on Phase 1)
- [ ] **Phase 3: Documentation Updates** - Update install docs to recommend plugin as primary for Copilot CLI (depends on Phase 2 for validated install syntax)
- [ ] **Phase 4: Documentation** - Create Docs.md technical reference (depends on all prior phases)

## Phase Candidates
<!-- None currently — scope is well-defined -->

---

## Phase 1: Plugin Manifest Generation

### Changes Required:

- **`cli/scripts/build-dist.js`**: Add two new functions after the existing build pipeline:
  - `buildPluginManifest()` — generates `plugin.json` at `cli/dist/` root with name `paw-workflow`, version from `cli/package.json`, author, license, description, keywords, category, repository, homepage, and paths (`agents/`, `skills/`)
  - `buildMarketplaceManifest()` — generates `cli/dist/.github/plugin/marketplace.json` with the PAW plugin entry, source pointing to repo root (`.`)
  - Both called from `main()` after `buildAgents()` and `buildSkills()`
  - Version sourced from existing `version` variable (cli/scripts/build-dist.js:26)

- **`cli/test/build.test.js`**: Add test cases:
  - `plugin.json` exists in dist output with correct structure (name, version, agents path, skills path)
  - `marketplace.json` exists in `.github/plugin/` subdirectory of dist
  - Plugin manifest version matches `cli/package.json` version
  - Plugin manifest `agents` and `skills` paths point to correct directories

### Success Criteria:

#### Automated Verification:
- [ ] `cd cli && npm run build` produces `cli/dist/plugin.json` and `cli/dist/.github/plugin/marketplace.json`
- [ ] `cd cli && npm test` passes including new manifest tests
- [ ] `cd cli && npm run lint` passes

#### Manual Verification:
- [ ] `plugin.json` contents match Copilot CLI plugin schema (name, version, agents, skills fields)
- [ ] `marketplace.json` contents match marketplace schema (name, owner, plugins array)
- [ ] Dist directory structure is a valid plugin layout:
  ```
  cli/dist/
  ├── plugin.json
  ├── .github/plugin/marketplace.json
  ├── agents/PAW.agent.md, PAW-Review.agent.md
  └── skills/<29 skill dirs>/SKILL.md
  ```

---

## Phase 2: CI Plugin Branch Publishing

### Changes Required:

- **`.github/workflows/publish-cli.yml`**: Add a new job `publish-plugin` that runs after the existing publish steps:
  - Depends on successful build (use `actions/upload-artifact` / `actions/download-artifact` to share `cli/dist/` between jobs, since separate GitHub Actions jobs don't share filesystem)
  - Checks out `plugin` orphan branch (create if doesn't exist via `git checkout --orphan`)
  - Clears branch contents, copies `cli/dist/` contents to branch root
  - Commits with message like "Update plugin distribution to vX.X.X"
  - Force-pushes to `plugin` branch
  - Independent of npm publish success (one failing shouldn't block the other — use separate jobs or continue-on-error)

- **Install syntax validation** (during this phase): Test locally how `copilot plugin install` resolves branches. Determine if `OWNER/REPO` uses default branch or if there's a branch override. Document the validated install command. Potential syntaxes:
  - `copilot plugin install lossyrob/phased-agent-workflow` (if CLI checks all branches or follows some convention)
  - Git URL with branch ref if supported
  - Marketplace-based: `copilot plugin install paw-workflow@<marketplace-name>`

### Success Criteria:

#### Automated Verification:
- [ ] `publish-cli.yml` passes YAML syntax validation
- [ ] Workflow has separate jobs/steps so npm publish failure doesn't block plugin branch update and vice versa
- [ ] `npm run lint:agent:all` still passes (no changes to agents/skills)

#### Manual Verification:
- [ ] Simulated workflow logic: running the git commands locally produces a valid `plugin` branch with plugin.json at root, agents/, skills/, and .github/plugin/marketplace.json
- [ ] The validated install syntax installs PAW successfully (test with local path fallback: `copilot plugin install ./cli/dist`)
- [ ] `copilot plugin list` shows `paw-workflow` after installation
- [ ] Agents and skills loaded match those from `paw install copilot`
- [ ] Marketplace verification: `copilot plugin marketplace add ./cli/dist` + `copilot plugin marketplace browse` lists `paw-workflow` with correct metadata
- [ ] Plugin branch publishing completes within 5 minutes (Spec NFR)

---

## Phase 3: Documentation Updates

### Changes Required:

- **`README.md`**: In the "Try It Now" / "Getting Started" section:
  - Add plugin install as the primary method for Copilot CLI (above the existing npx command)
  - Keep npx command as alternative / for Claude Code users
  - Add brief note about `copilot plugin update paw-workflow` for updates

- **`docs/guide/cli-installation.md`**: 
  - Add "Plugin Installation" section as the recommended method
  - Move existing npx instructions to "NPM CLI Installation" subsection
  - Add update/uninstall commands
  - Note about switching from npm CLI to plugin (uninstall npm version first to avoid precedence issues)

- **`cli/README.md`**: Add section about plugin distribution — how the build produces plugin-ready output, how CI publishes to plugin branch

- **`mkdocs.yml`**: No nav changes needed (cli-installation.md already in nav)

### Success Criteria:

#### Automated Verification:
- [ ] `mkdocs build --strict` passes (no broken links)
- [ ] `npm run lint:agent:all` still passes

#### Manual Verification:
- [ ] README install flow reads naturally with plugin as primary, npx as alternative
- [ ] cli-installation.md covers both install paths with clear guidance on which to use
- [ ] Migration note addresses users switching from npm CLI to plugin

---

## Phase 4: Documentation

### Changes Required:
- **`.paw/work/cli-plugin-distribution/Docs.md`**: Technical reference covering:
  - Plugin packaging architecture (build-dist.js extensions)
  - Plugin branch publishing CI flow
  - Plugin manifest schema and fields
  - Marketplace manifest structure
  - Version synchronization approach
  - Verification steps for maintainers
- Load `paw-docs-guidance` for template and conventions

### Success Criteria:
- [ ] Docs.md captures implementation decisions and technical details
- [ ] Content is accurate against actual implementation

---

## References
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/263
- Spec: `.paw/work/cli-plugin-distribution/Spec.md`
- Research: `.paw/work/cli-plugin-distribution/CodeResearch.md`
- [Copilot CLI Plugin Reference](https://docs.github.com/en/copilot/reference/cli-plugin-reference)
- [Creating a Plugin](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-creating)
- [Plugin Marketplace](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-marketplace)
