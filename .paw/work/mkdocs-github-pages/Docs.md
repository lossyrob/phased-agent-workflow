# MkDocs GitHub Pages Setup

## Overview

This implementation establishes automated documentation publishing for the Phased Agent Workflow (PAW) project using MkDocs with the Material theme, deploying to GitHub Pages at `https://lossyrob.github.io/phased-agent-workflow`.

**What was implemented:**
- A complete `/docs` folder structure with organized documentation sections
- MkDocs configuration with Material theme, search, code highlighting, and light/dark mode
- GitHub Actions workflow for automated deployment on merge to main
- Migration of existing documentation content into a professional, navigable site

**Why this matters:**
PAW documentation was previously scattered across root-level Markdown files (README.md, paw-specification.md, paw-review-specification.md) without structure, search capability, or polished presentation. This implementation transforms that content into a professional documentation site that helps users discover and understand PAW's capabilities.

## Architecture and Design

### High-Level Architecture

```
                     ┌─────────────────────┐
                     │   GitHub Actions    │
                     │  (docs.yml workflow)│
                     └──────────┬──────────┘
                                │
                                │ push to main
                                │ (docs/** or mkdocs.yml changes)
                                ▼
┌─────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│  docs/      │──────│   mkdocs build      │──────│   gh-pages branch   │
│  (source)   │      │   (static site)     │      │   (GitHub Pages)    │
└─────────────┘      └─────────────────────┘      └─────────────────────┘
                                │
                                ▼
                     ┌─────────────────────┐
                     │  Published Site     │
                     │  lossyrob.github.io │
                     │  /phased-agent-     │
                     │   workflow          │
                     └─────────────────────┘
```

**Components:**
- **Source files (`docs/`)**: Markdown files organized into logical sections
- **Configuration (`mkdocs.yml`)**: Site metadata, theme settings, navigation structure
- **Workflow (`.github/workflows/docs.yml`)**: Automated build and deployment pipeline
- **Published site (`gh-pages` branch)**: Static HTML served by GitHub Pages

### Design Decisions

**MkDocs over alternatives (Hugo, Jekyll, Docusaurus):**
MkDocs with Material theme was chosen because:
1. Python-based, aligning with existing Python tooling in the ecosystem
2. Material theme provides excellent search, code highlighting, and responsive design out-of-box
3. Simple configuration and Markdown-centric workflow
4. Well-established deployment pattern with `mkdocs gh-deploy`

**Branch-based publishing (`gh-pages`):**
Using a separate `gh-pages` branch (created automatically by `mkdocs gh-deploy --force`) isolates generated content from source, keeping the main branch clean and avoiding large diffs in PRs.

**Path-filtered workflow triggers:**
The workflow only triggers on changes to `docs/**`, `mkdocs.yml`, or the workflow file itself—preventing unnecessary builds on unrelated commits to main.

**Weekly cache strategy:**
Material theme assets are cached using week number (`%V`) pattern, balancing freshness with build speed. Cache refreshes weekly rather than daily to reduce rebuild overhead.

**Source files remain in place:**
Root-level documentation files (README.md, paw-specification.md, paw-review-specification.md) are NOT removed. The docs site contains reorganized versions of this content, but the originals remain as they're often the first thing contributors encounter.

### Integration Points

**GitHub Pages:**
- After first successful workflow run, repository owner must enable GitHub Pages in Settings → Pages
- Source: Deploy from a branch → `gh-pages` / `/ (root)`
- Site accessible at `https://lossyrob.github.io/phased-agent-workflow`

**GitHub Actions:**
- Workflow runs on `ubuntu-latest` with Python 3.x
- Uses `actions/setup-python@v5` and `actions/cache@v4` (matching project patterns)
- `contents: write` permission required for pushing to `gh-pages`

**Git credentials:**
- Configured for `github-actions[bot]` to enable automated commits to `gh-pages`

## User Guide

### For Documentation Contributors

**Adding a new documentation page:**

1. Create a new Markdown file in the appropriate `docs/` subdirectory:
   - `docs/guide/` — User guides and how-tos
   - `docs/specification/` — Technical specifications
   - `docs/reference/` — Reference documentation (agents, artifacts)

2. Add the page to navigation in `mkdocs.yml`:
   ```yaml
   nav:
     - User Guide:
       - Your New Page: guide/your-page.md
   ```

3. Submit a PR—after merge to main, the site rebuilds automatically

**Local preview:**

```bash
# Activate Python virtual environment
source .venv/bin/activate

# Build the site (validates config and links)
mkdocs build

# Serve locally with live reload
mkdocs serve
# Visit http://localhost:8000
```

**Markdown features available:**

- Code blocks with syntax highlighting (specify language after opening ```)
- Admonitions (`!!! note`, `!!! warning`, `!!! info`)
- Tables with Material styling
- Internal cross-references (relative paths to other .md files)
- Table of contents with anchor links (automatic with `toc: permalink: true`)

### For Repository Maintainers

**Initial GitHub Pages setup** (one-time):

1. Wait for first successful docs workflow run
2. Go to repository Settings → Pages
3. Under "Build and deployment":
   - Source: "Deploy from a branch"
   - Branch: `gh-pages` / `/ (root)`
4. Save—site available in ~1-2 minutes

**Monitoring documentation builds:**

- Check Actions tab for `Deploy Documentation` workflow runs
- Failed builds don't affect the published site (previous content remains)
- Build logs show any broken links or configuration issues

**Forcing a rebuild:**

If needed, trigger a rebuild by:
- Making any change to `docs/**` or `mkdocs.yml` in a PR
- Using GitHub Actions "Run workflow" if `workflow_dispatch` trigger is added

## Technical Reference

### Directory Structure

```
docs/
├── index.md                    # Landing page
├── guide/                      # User guides
│   ├── index.md               # Getting Started
│   ├── vscode-extension.md    # Extension commands and config
│   ├── workflow-modes.md      # Full/Minimal/Custom modes
│   ├── stage-transitions.md   # Handoff commands and navigation
│   ├── custom-instructions.md # Workspace/user customization
│   └── two-workflows.md       # Implementation vs Review workflows
├── specification/              # Technical specifications
│   ├── index.md               # Overview and key properties
│   ├── implementation.md      # Implementation workflow stages
│   └── review.md              # Review workflow (R1/R2/R3)
└── reference/                  # Reference documentation
    ├── agents.md              # All PAW agents
    └── artifacts.md           # Artifact descriptions
```

### Configuration Reference (`mkdocs.yml`)

| Setting | Value | Purpose |
|---------|-------|---------|
| `site_name` | Phased Agent Workflow (PAW) | Browser title and site header |
| `site_url` | https://lossyrob.github.io/phased-agent-workflow | Canonical URL for SEO |
| `theme.name` | material | Material for MkDocs theme |
| `theme.features` | navigation.instant, search.suggest, content.code.copy | UX enhancements |
| `theme.palette` | Light/dark toggle with indigo primary | Color scheme |
| `plugins` | search | Built-in full-text search |

**Markdown extensions enabled:**
- `attr_list` — Add attributes to Markdown elements (buttons, images)
- `pymdownx.highlight` — Code block syntax highlighting
- `pymdownx.superfences` — Nested code blocks
- `admonition` — Callout boxes (note, warning, info)
- `toc: permalink: true` — Anchor links on headings

### Workflow Reference (`.github/workflows/docs.yml`)

**Triggers:**
- Push to `main` branch
- Path filter: `docs/**`, `mkdocs.yml`, `.github/workflows/docs.yml`

**Steps:**
1. Checkout code
2. Configure git credentials for github-actions[bot]
3. Setup Python 3.x
4. Set cache ID (week number)
5. Restore/save Material theme cache
6. Install mkdocs-material via pip
7. Deploy with `mkdocs gh-deploy --force`
8. Output job summary

**Required permissions:**
- `contents: write` — Push to `gh-pages` branch

## Testing Guide

### How to Test This Implementation

**1. Verify local build works:**
```bash
source .venv/bin/activate
mkdocs build --strict
# Should complete with no errors or warnings
```

**2. Verify local preview:**
```bash
mkdocs serve
# Open http://localhost:8000
# - Verify navigation structure matches mkdocs.yml
# - Test search functionality (search for "PAW", "workflow", "agent")
# - Toggle dark/light mode
# - Check responsive layout (resize browser)
```

**3. Verify documentation content:**
- Navigate through all User Guide sections
- Check Specification pages contain expected workflow details
- Verify Reference pages list all agents and artifacts
- Click internal links to ensure no broken cross-references

**4. Verify deployment (after merge to main):**
- Check Actions tab for successful `Deploy Documentation` run
- Visit https://lossyrob.github.io/phased-agent-workflow
- Verify content matches local preview
- Test search returns results

**5. Verify incremental update:**
- Make a documentation change
- Submit PR, merge to main
- Verify change appears on live site within ~2-3 minutes

### Automated Verification

The `mkdocs build --strict` command validates:
- All internal links resolve to valid pages
- All images/assets exist
- YAML configuration is valid
- Markdown parses without errors

This runs as part of the deployment workflow—failed builds prevent publishing broken content.

## Edge Cases and Limitations

**GitHub Pages must be manually enabled:**
The first deployment creates the `gh-pages` branch, but a repository admin must enable GitHub Pages in Settings → Pages to make the site accessible. Until enabled, the workflow succeeds but the site returns 404.

**No PR preview builds:**
Documentation changes are only visible on the published site after merge to main. Contributors should use `mkdocs serve` locally to preview changes before submitting PRs.

**Path-based routing:**
The site is served at `/phased-agent-workflow/` (repo name as path). Internal links must be relative or account for this base path.

**Cache invalidation:**
Material theme assets cache weekly. If theme updates cause issues, clear cache in GitHub Actions or wait for next week's automatic refresh.

**Large documentation builds:**
Current documentation builds in seconds. As content grows, build times should be monitored. GitHub Actions has a 6-hour timeout limit, but this is unlikely to be reached.

## Migration and Compatibility

**Migrated content sources:**
- `README.md` → `docs/guide/index.md` (Getting Started), `docs/index.md` (landing page)
- `paw-specification.md` → `docs/specification/implementation.md`, `docs/specification/index.md`
- `paw-review-specification.md` → `docs/specification/review.md`
- Various `.paw/work/*/Docs.md` files → `docs/guide/vscode-extension.md`, `docs/guide/stage-transitions.md`, `docs/guide/custom-instructions.md`

**Original files preserved:**
Root-level documentation files remain in place and are not deprecated. They serve as quick-access documentation for contributors viewing the repository directly on GitHub.

**Future documentation updates:**
New documentation should be added to `docs/` for the published site. README.md may be updated to point users to the documentation site for detailed information.

## References

- **Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/109
- **Specification**: `.paw/work/mkdocs-github-pages/Spec.md`
- **Implementation Plan**: `.paw/work/mkdocs-github-pages/ImplementationPlan.md`
- **MkDocs Documentation**: https://www.mkdocs.org/
- **Material for MkDocs**: https://squidfunk.github.io/mkdocs-material/
- **GitHub Pages Documentation**: https://docs.github.com/en/pages
- **Published Site**: https://lossyrob.github.io/phased-agent-workflow
