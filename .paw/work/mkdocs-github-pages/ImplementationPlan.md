# MkDocs GitHub Pages Setup Implementation Plan

## Overview

This plan implements automated documentation publishing for the PAW project using MkDocs with Material theme, deploying to GitHub Pages. Documentation source files will live in `/docs` and be automatically built and published to `https://lossyrob.github.io/phased-agent-workflow` whenever changes are merged to main.

## Current State Analysis

- **No `/docs` folder exists** - Documentation currently lives in root-level Markdown files (README.md, DEVELOPING.md, specifications)
- **No GitHub Pages configured** - API returns 404; no `gh-pages` branch exists
- **Two existing workflows** in `.github/workflows/`:
  - `pr-checks.yml` - Runs tests on PRs (triggers on `src/`, `agents/`, `scripts/`)
  - `release.yml` - Handles version tagging and VSIX packaging
- **`.gitignore` includes `.cache/`** but not `site/` (MkDocs build output)

### Key Discoveries:
- Existing workflows use `@v4` action versions, `ubuntu-latest` runners, and descriptive comments (`.github/workflows/pr-checks.yml:1-4`)
- Configuration files follow root-level placement pattern (`package.json`, `tsconfig.json`)
- Official Material for MkDocs deployment pattern uses `mkdocs gh-deploy --force` which handles `gh-pages` branch creation automatically

## Desired End State

After this plan is complete:
- Documentation site is live at `https://lossyrob.github.io/phased-agent-workflow`
- Merges to `main` that include changes to `docs/` or `mkdocs.yml` trigger automatic rebuilds
- Documentation structure is minimal but functional with search, navigation, and Material theme styling
- Contributors can add/edit documentation by modifying Markdown files in `/docs`

### Verification:
1. GitHub Actions workflow completes successfully on merge to main
2. Site loads at the GitHub Pages URL with correct content
3. Search returns results for terms in documentation
4. Navigation displays organized structure

## What We're NOT Doing

- **NOT migrating existing documentation** (README.md, DEVELOPING.md, specifications) into the new structure—that's a future enhancement
- **NOT customizing the Material theme** beyond standard configuration options
- **NOT adding PR preview builds** for documentation changes—only main branch deployment
- **NOT adding documentation linting** or build validation to PR checks (optional future enhancement)

## Implementation Approach

The implementation is structured as a single phase since all components are interdependent and form a minimal viable documentation system. The workflow cannot be tested without configuration, the configuration needs content to build, and the content needs the workflow to publish. Testing occurs end-to-end after all pieces are in place.

## Phase Summary

1. **Phase 1: Complete MkDocs Setup** - Create documentation folder, configuration, GitHub Actions workflow, and gitignore update for a functional documentation publishing system

---

## Phase 1: Complete MkDocs Setup

### Overview
Create all artifacts needed for a functional MkDocs documentation site with automated GitHub Pages deployment.

### Changes Required:

#### 1. Documentation Source Structure
**Folder**: `docs/`
**Changes**:
- Create `docs/` directory at repository root
- Add `docs/index.md` as the documentation landing page with:
  - Brief project introduction
  - Links to key sections (placeholder for future content)
  - Getting started pointer
- Add `docs/getting-started.md` with:
  - Prerequisites (VS Code, GitHub Copilot Chat)
  - Installation instructions (from README.md quick reference)
  - First workflow walkthrough pointer

**Tests**:
- Files exist and are valid Markdown
- No broken internal links (verified during `mkdocs build`)

#### 2. MkDocs Configuration
**File**: `mkdocs.yml`
**Changes**:
- Create configuration file at repository root following project patterns
- Configure site metadata:
  - `site_name`: "Phased Agent Workflow (PAW)"
  - `site_url`: "https://lossyrob.github.io/phased-agent-workflow"
  - `repo_url` and `repo_name` for GitHub integration
- Configure Material theme with:
  - `navigation.instant` for faster page loads
  - `search.suggest` for search autocomplete
  - `content.code.copy` for code block copy buttons
  - Light/dark mode toggle
- Enable `search` plugin (built-in)
- Configure markdown extensions for code highlighting (`pymdownx.highlight`, `pymdownx.superfences`)
- Define navigation structure with initial pages

**Tests**:
- Configuration validates: `mkdocs build` succeeds
- Theme features appear correctly in built output

#### 3. GitHub Actions Workflow
**File**: `.github/workflows/docs.yml`
**Changes**:
- Create workflow following repository patterns (descriptive header comment, action version pinning)
- Trigger on pushes to `main` with path filter for `docs/**` and `mkdocs.yml`
- Declare `contents: write` permission (required for `gh-pages` branch push)
- Configure git credentials for github-actions[bot]
- Use `actions/setup-python@v5` with Python 3.x
- Implement weekly caching for Material theme assets (using `%V` week number pattern)
- Install mkdocs-material via pip
- Deploy using `mkdocs gh-deploy --force`

**Tests**:
- Workflow YAML is valid syntax
- Workflow triggers correctly on relevant file changes
- Deployment completes successfully (verified in Actions tab)

#### 4. Gitignore Update
**File**: `.gitignore`
**Changes**:
- Add `site/` entry for MkDocs build output directory
- Group with existing build output entries (`dist/`, `build/`, `out/`)

**Tests**:
- Local `mkdocs build` creates `site/` directory
- `site/` directory is ignored by git (not staged)

### Success Criteria:

#### Automated Verification:
- [ ] `mkdocs build` completes without errors (validates config and content)
- [ ] GitHub Actions workflow passes syntax validation
- [ ] Workflow runs successfully on push to main (visible in Actions tab)
- [ ] `git status` shows `site/` is untracked after local build

#### Manual Verification:
- [ ] **GitHub Pages enabled**: Repository Settings → Pages shows `gh-pages` branch configured
- [ ] **Site accessible**: `https://lossyrob.github.io/phased-agent-workflow` loads without errors
- [ ] **Search functional**: Search input finds terms from documentation content
- [ ] **Navigation displays**: Left sidebar shows documentation structure
- [ ] **Theme renders**: Material theme styling visible with dark/light toggle
- [ ] **Mobile responsive**: Site renders correctly on mobile viewport

### Post-Phase Notes

After workflow runs successfully, the repository owner must enable GitHub Pages:
1. Navigate to repository Settings → Pages
2. Under "Build and deployment", select:
   - Source: "Deploy from a branch"
   - Branch: `gh-pages` / `/ (root)`
3. Save settings

The site should be accessible within a few minutes at `https://lossyrob.github.io/phased-agent-workflow`.

---

## Cross-Phase Testing Strategy

### Integration Tests:
- End-to-end: Merge a documentation change to main and verify the published site updates

### Manual Testing Steps:
1. After initial deployment, visit `https://lossyrob.github.io/phased-agent-workflow`
2. Verify landing page content matches `docs/index.md`
3. Navigate to Getting Started page via sidebar
4. Use search to find "PAW" or "workflow"
5. Toggle between light and dark mode
6. Access site on mobile device or responsive view

## Performance Considerations

- MkDocs builds are fast; current minimal content will build in seconds
- Weekly cache refresh (`%V` pattern) balances freshness with build speed
- As documentation grows, build time should be monitored but is not a near-term concern

## Migration Notes

Not applicable for this phase. Content migration from existing documentation files is explicitly out of scope.

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/109
- Spec: `.paw/work/mkdocs-github-pages/Spec.md`
- Research: `.paw/work/mkdocs-github-pages/SpecResearch.md`, `.paw/work/mkdocs-github-pages/CodeResearch.md`
- Existing workflow patterns: `.github/workflows/pr-checks.yml`, `.github/workflows/release.yml`
- Material for MkDocs publishing guide: https://squidfunk.github.io/mkdocs-material/publishing-your-site/
