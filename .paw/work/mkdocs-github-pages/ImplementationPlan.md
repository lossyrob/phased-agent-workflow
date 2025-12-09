# MkDocs GitHub Pages Setup Implementation Plan

## Overview

This plan implements automated documentation publishing for the PAW project using MkDocs with Material theme, deploying to GitHub Pages. Documentation source files will live in `/docs` and be automatically built and published to `https://lossyrob.github.io/phased-agent-workflow` whenever changes are merged to main. The plan includes migrating existing documentation content into an organized site structure.

## Current State Analysis

- **No `/docs` folder exists** - Documentation currently lives in root-level Markdown files (README.md, DEVELOPING.md, specifications)
- **No GitHub Pages configured** - API returns 404; no `gh-pages` branch exists
- **Two existing workflows** in `.github/workflows/`:
  - `pr-checks.yml` - Runs tests on PRs (triggers on `src/`, `agents/`, `scripts/`)
  - `release.yml` - Handles version tagging and VSIX packaging
- **`.gitignore` includes `.cache/`** but not `site/` (MkDocs build output)
- **Existing documentation content**:
  - `README.md` - Quickstart, features overview, installation, workflow modes
  - `paw-specification.md` - Detailed workflow stages, agents, repository layout
  - `paw-review-specification.md` - Review workflow stages and artifacts
  - `.paw/work/*/Docs.md` - Feature-level documentation from completed work items

### Key Discoveries:
- Existing workflows use `@v4` action versions, `ubuntu-latest` runners, and descriptive comments (`.github/workflows/pr-checks.yml:1-4`)
- Configuration files follow root-level placement pattern (`package.json`, `tsconfig.json`)
- Official Material for MkDocs deployment pattern uses `mkdocs gh-deploy --force` which handles `gh-pages` branch creation automatically
- 12 existing Docs.md files in `.paw/work/` directories provide detailed feature documentation

## Desired End State

After this plan is complete:
- Documentation site is live at `https://lossyrob.github.io/phased-agent-workflow`
- Merges to `main` that include changes to `docs/` or `mkdocs.yml` trigger automatic rebuilds
- Documentation is organized into logical sections: User Guide, Specifications, Developer Reference
- Existing content from README, specifications, and Docs.md files is integrated into the site
- Contributors can add/edit documentation by modifying Markdown files in `/docs`

### Verification:
1. GitHub Actions workflow completes successfully on merge to main
2. Site loads at the GitHub Pages URL with correct content
3. Search returns results for terms in documentation
4. Navigation displays organized structure with all migrated content

## What We're NOT Doing

- **NOT removing existing root-level documentation files** (README.md, DEVELOPING.md, specifications remain in place)
- **NOT customizing the Material theme** beyond standard configuration options
- **NOT adding PR preview builds** for documentation changes—only main branch deployment
- **NOT adding documentation linting** or build validation to PR checks (optional future enhancement)
- **NOT migrating DEVELOPING.md** (developer-focused, not user documentation)

## Implementation Approach

The implementation is structured in four phases to enable incremental verification:
1. **Phase 1** establishes local MkDocs infrastructure that can be built and verified locally
2. **Phase 2** adds GitHub Actions for automated publishing
3. **Phase 3** migrates user-facing content from README and specifications into organized sections
4. **Phase 4** integrates relevant Docs.md content from completed work items

This separation allows each phase to be tested independently: local builds before deployment, infrastructure before content migration.

## Phase Summary

1. **Phase 1: Local MkDocs Setup** - Create documentation folder, MkDocs configuration, and gitignore update for local build and verification
2. **Phase 2: GitHub Actions Publishing** - Create GitHub Actions workflow for automated deployment to GitHub Pages
3. **Phase 3: Core Documentation Migration** - Import and organize content from README.md, paw-specification.md, and paw-review-specification.md
4. **Phase 4: Feature Documentation Integration** - Review and integrate relevant Docs.md content from completed work items

---

## Phase 1: Local MkDocs Setup

### Overview
Create the MkDocs infrastructure that can be built and verified locally without deployment.

### Changes Required:

#### 1. Documentation Source Structure
**Folder**: `docs/`
**Changes**:
- Create `docs/` directory at repository root
- Add `docs/index.md` as a minimal landing page with:
  - Brief project introduction (2-3 sentences)
  - Note indicating more content coming in subsequent phases
- Placeholder structure will be expanded in Phase 3

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
- Define minimal navigation structure (will be expanded in Phase 3)

**Tests**:
- Configuration validates: `mkdocs build` succeeds
- Theme features appear correctly in built output

#### 3. Gitignore Update
**File**: `.gitignore`
**Changes**:
- Add `site/` entry for MkDocs build output directory
- Group with existing build output entries (`dist/`, `build/`, `out/`)

**Tests**:
- Local `mkdocs build` creates `site/` directory
- `site/` directory is ignored by git (not staged)

### Success Criteria:

#### Automated Verification:
- [x] `mkdocs build` completes without errors (validates config and content)
- [ ] `mkdocs serve` runs successfully and site is viewable at `localhost:8000`
- [x] `git status` shows `site/` is untracked after local build

#### Manual Verification:
- [ ] Local site at `localhost:8000` displays landing page content
- [ ] Material theme styling visible with dark/light toggle
- [ ] Search input is present and functional

### Phase 1 Implementation Notes

**Completed**: 2025-12-09

**Summary**: Local MkDocs infrastructure established with:
- `docs/index.md` - Minimal landing page with project introduction
- `mkdocs.yml` - Material theme configuration with search, code highlighting, light/dark mode toggle
- `.gitignore` - Updated to exclude `site/` build output

**Build warnings**: Links to `guide/index.md`, `specification/index.md`, and `reference/agents.md` show warnings because those pages don't exist yet. This is expected - they will be created in Phase 3.

**Notes for reviewers**: Consider running `mkdocs serve` to verify the site renders correctly locally before merging.

---

## Phase 2: GitHub Actions Publishing

### Overview
Add automated deployment workflow to publish documentation to GitHub Pages on merge to main.

### Changes Required:

#### 1. GitHub Actions Workflow
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

### Success Criteria:

#### Automated Verification:
- [ ] GitHub Actions workflow passes syntax validation
- [ ] Workflow runs successfully on push to main (visible in Actions tab)

#### Manual Verification:
- [ ] **GitHub Pages enabled**: Repository Settings → Pages shows `gh-pages` branch configured
- [ ] **Site accessible**: `https://lossyrob.github.io/phased-agent-workflow` loads without errors
- [ ] **Search functional**: Search input finds terms from documentation content
- [ ] **Navigation displays**: Left sidebar shows documentation structure
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

## Phase 3: Core Documentation Migration

### Overview
Import and organize content from README.md and specification documents into a structured documentation site. The goal is to create organized, navigable documentation—not to duplicate content verbatim.

### Changes Required:

#### 1. User Guide Section
**Folder**: `docs/guide/`
**Changes**:
- Create `docs/guide/index.md` (Getting Started):
  - Quickstart steps (from README.md)
  - Prerequisites and requirements
  - Installation instructions
- Create `docs/guide/workflow-modes.md`:
  - Full, Minimal, and Custom modes (from README and paw-specification)
  - Review strategies (PRs vs Local)
- Create `docs/guide/two-workflows.md`:
  - Implementation workflow overview
  - Review workflow overview
  - When to use each

**Source files**: `README.md` (lines 1-200), `paw-specification.md` (workflow modes section)

#### 2. Specification Section
**Folder**: `docs/specification/`
**Changes**:
- Create `docs/specification/index.md`:
  - PAW overview and key properties
  - Link to implementation and review specs
- Create `docs/specification/implementation.md`:
  - Workflow stages from paw-specification.md
  - Agent descriptions
  - Repository layout
- Create `docs/specification/review.md`:
  - Review workflow stages from paw-review-specification.md
  - Review artifacts
  - R1/R2/R3 stage details

**Source files**: `paw-specification.md`, `paw-review-specification.md`

#### 3. Reference Section
**Folder**: `docs/reference/`
**Changes**:
- Create `docs/reference/agents.md`:
  - List of all PAW agents with brief descriptions
  - Links to detailed documentation
- Create `docs/reference/artifacts.md`:
  - Artifact file descriptions (Spec.md, ImplementationPlan.md, Docs.md, etc.)
  - Directory structure

**Source files**: `paw-specification.md` (agents section, repository layout)

#### 4. Update Navigation
**File**: `mkdocs.yml`
**Changes**:
- Expand navigation structure to include new sections:
  ```yaml
  nav:
    - Home: index.md
    - User Guide:
      - Getting Started: guide/index.md
      - Workflow Modes: guide/workflow-modes.md
      - Two Workflows: guide/two-workflows.md
    - Specification:
      - Overview: specification/index.md
      - Implementation Workflow: specification/implementation.md
      - Review Workflow: specification/review.md
    - Reference:
      - Agents: reference/agents.md
      - Artifacts: reference/artifacts.md
  ```

#### 5. Update Landing Page
**File**: `docs/index.md`
**Changes**:
- Update to serve as proper documentation home page
- Add project logo/banner
- Brief introduction with value proposition
- Links to key sections (Getting Started, Specifications, Reference)

### Success Criteria:

#### Automated Verification:
- [ ] `mkdocs build` completes without errors
- [ ] No broken internal links in documentation
- [ ] All new pages accessible via navigation

#### Manual Verification:
- [ ] Navigation structure matches planned hierarchy
- [ ] Content is well-organized and readable
- [ ] Search returns results for key terms (PAW, workflow, agent)
- [ ] Cross-references between sections work correctly

---

## Phase 4: Feature Documentation Integration

### Overview
Review existing Docs.md files from completed work items and integrate relevant content into the documentation site. Not all Docs.md content is user-facing; this phase requires judgment about what belongs in public documentation.

### Changes Required:

#### 1. Review Existing Docs.md Files
**Task**: Analyze each Docs.md file for user-relevant content
**Files to review**:
- `.paw/work/paw-review/Docs.md` - Review workflow (likely relevant, may already be covered by Phase 3)
- `.paw/work/vscode-extension-init/Docs.md` - Extension features (likely relevant)
- `.paw/work/workflow-handoffs/Docs.md` - Handoff commands (likely relevant)
- `.paw/work/simplified-workflow/Docs.md` - Workflow simplifications
- Other Docs.md files - Review for user-facing content

**Criteria for inclusion**:
- Documents user-facing features or workflows
- Provides information not already covered in specification docs
- Adds practical guidance or examples

#### 2. Integrate Relevant Content
**Folder**: `docs/guide/` or `docs/reference/` (as appropriate)
**Changes**:
- Create additional guide pages for significant features documented in Docs.md
- Add content to existing pages where it fits naturally
- Ensure no duplication with Phase 3 content

**Note**: Specific pages will be determined during implementation based on Docs.md review. The implementer should use judgment about what content adds value to the documentation site.

#### 3. Update Navigation
**File**: `mkdocs.yml`
**Changes**:
- Add new pages to navigation structure as needed

### Success Criteria:

#### Automated Verification:
- [ ] `mkdocs build` completes without errors
- [ ] No broken internal links

#### Manual Verification:
- [ ] Integrated content is coherent with existing documentation
- [ ] No unnecessary duplication between pages
- [ ] Navigation remains logical and not overwhelming
- [ ] Search indexes new content appropriately

---

## Cross-Phase Testing Strategy

### Integration Tests:
- After Phase 2: Merge a documentation change to main and verify the published site updates
- After Phase 3: Verify all migrated content is searchable and navigable
- After Phase 4: Verify integrated content appears correctly and links work

### Manual Testing Steps:
1. After Phase 2 deployment, visit `https://lossyrob.github.io/phased-agent-workflow`
2. After Phase 3, navigate through all new sections via sidebar
3. Use search to find key terms: "PAW", "workflow", "specification", "review"
4. Toggle between light and dark mode
5. Access site on mobile device or responsive view
6. Verify cross-references between documentation pages work

## Performance Considerations

- MkDocs builds are fast; even with migrated content, build should complete in seconds
- Weekly cache refresh (`%V` pattern) balances freshness with build speed
- As documentation grows, build time should be monitored but is not a near-term concern

## Migration Notes

- Root-level documentation files (README.md, paw-specification.md, paw-review-specification.md) are NOT removed—they remain as the source of truth
- Documentation site content is derived from these files but may be reorganized for better navigation
- Future updates should update source files; documentation site will be refreshed accordingly

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/109
- Spec: `.paw/work/mkdocs-github-pages/Spec.md`
- Research: `.paw/work/mkdocs-github-pages/SpecResearch.md`, `.paw/work/mkdocs-github-pages/CodeResearch.md`
- Existing workflow patterns: `.github/workflows/pr-checks.yml`, `.github/workflows/release.yml`
- Material for MkDocs publishing guide: https://squidfunk.github.io/mkdocs-material/publishing-your-site/
