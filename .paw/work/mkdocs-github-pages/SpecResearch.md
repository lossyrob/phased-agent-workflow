# Spec Research: MkDocs GitHub Pages Setup

## Summary

The repository does not currently have GitHub Pages enabled, no `gh-pages` branch exists, and there is no `/docs` folder. The repository contains substantial documentation in the form of root-level Markdown files (README.md, DEVELOPING.md, paw-specification.md, paw-review-specification.md) that could be incorporated into the new documentation structure. Two existing GitHub Actions workflows handle PR checks and release automation; neither conflicts with a docs deployment workflow. The infrastructure is clean for a fresh MkDocs setup.

## Agent Notes

The issue clearly specifies the architecture:
- `/docs` folder in main repository for Markdown documentation
- MkDocs with Material theme for build system
- GitHub Pages publishing to `https://lossyrob.github.io/phased-agent-workflow`
- Automated deployment via GitHub Actions to `gh-pages` branch

The research focuses on understanding the current repository state to inform integration decisions. We need to know what already exists (GitHub Pages config, workflows, documentation files) to ensure smooth implementation without conflicts.

Key assumptions being made (pending research validation):
- Standard MkDocs structure with index page
- GitHub Actions workflow triggered on push to main
- `gh-pages` branch for deployment (standard GitHub Pages pattern)

## Research Findings

### Question 1: Does the repository currently have GitHub Pages enabled? If enabled, what source is configured (branch/folder)?

**Answer**: No, GitHub Pages is not currently enabled for this repository. The GitHub Pages API endpoint returns a 404 "Not Found" response, indicating no Pages site exists.

**Evidence**: GitHub API response to `/repos/lossyrob/phased-agent-workflow/pages` returns `{"message": "Not Found", "status": "404"}`.

**Implications**: GitHub Pages will need to be enabled as part of this work. The configuration should specify the `gh-pages` branch as the source (standard pattern for automated deployments).

### Question 2: Does a `gh-pages` branch already exist in the repository?

**Answer**: No, there is no `gh-pages` branch (local or remote). The `git branch -a` command searching for "gh-pages" or "pages" patterns found no matches.

**Evidence**: Terminal command `git branch -a | grep -E "(gh-pages|pages)"` returned no results matching the pattern.

**Implications**: The GitHub Actions workflow will need to create the `gh-pages` branch on first deployment. This is handled automatically by most MkDocs deployment actions (e.g., `peaceiris/actions-gh-pages` or the `mkdocs gh-deploy` command).

### Question 3: What existing documentation files exist in the repository that should be incorporated or referenced in the new documentation structure?

**Answer**: The repository contains four primary documentation files at the root level:

1. **README.md** (319 lines) - Comprehensive project overview including:
   - Quickstart guide
   - PAW workflow overview and philosophy
   - Agent descriptions (Implementation and Review workflows)
   - Requirements and installation instructions
   - Getting started guide
   - Custom instructions usage

2. **DEVELOPING.md** (196 lines) - Developer documentation including:
   - Development setup prerequisites
   - Agent linting scripts and token thresholds
   - VS Code extension development workflow
   - Testing and packaging instructions
   - Migration testing procedures

3. **paw-specification.md** (1224 lines) - Complete PAW specification covering:
   - Workflow modes (full, minimal, custom)
   - Review strategies (PRs vs local)
   - Stage descriptions
   - Artifact formats

4. **paw-review-specification.md** - Review workflow specification

Additionally, there is substantial documentation in `.paw/work/` directories (e.g., `Docs.md` files like `.paw/work/paw-review/Docs.md` with 474 lines documenting the Review Workflow).

**Evidence**: Repository file listing, `file_search` for `**/*.md`, and direct file reads.

**Implications**: These files represent high-value documentation that should be incorporated into the MkDocs structure. The README.md content could form the landing page; the specifications and developing guide could become dedicated sections.

### Question 4: Are there existing GitHub Actions workflows? If so, what do they do, and are there any that might conflict with or need coordination with a docs deployment workflow?

**Answer**: Yes, two workflows exist in `.github/workflows/`:

1. **pr-checks.yml** - Runs on pull requests to `main` and `feature/**` branches
   - Triggers on changes to `src/`, `agents/`, `scripts/`, and the workflow file itself
   - Runs extension unit tests (with xvfb for headless VS Code testing)
   - Runs agent file linting
   - Does NOT trigger on documentation changes

2. **release.yml** - Runs on version tags (`v*`)
   - Builds and packages the VSIX extension
   - Creates GitHub Release with changelog and VSIX attachment
   - Handles pre-release detection (odd minor versions)

**Evidence**: Direct read of `.github/workflows/pr-checks.yml` and `.github/workflows/release.yml`.

**Implications**: Neither workflow conflicts with a docs deployment workflow. The new docs workflow should:
- Trigger on pushes to `main` when `docs/` or `mkdocs.yml` changes
- Be independent of the existing workflows
- Potentially include a PR check for docs build verification (optional enhancement)

### Question 5: Is there an existing `/docs` folder in the repository? If so, what is its current structure and contents?

**Answer**: No, there is no `/docs` folder in the repository. The directory does not exist.

**Evidence**: Terminal command `ls -la docs` returned "No docs directory exists".

**Implications**: The `/docs` folder will need to be created as part of this work. The standard MkDocs structure can be implemented from scratch without migration concerns.

## Open Unknowns

None. All internal questions have been answered through repository inspection and API queries.

## User-Provided External Knowledge (Manual Fill)

The following optional external/context questions may be filled in manually if additional guidance is desired:

- [ ] What are the current recommended versions of MkDocs and mkdocs-material for new projects? (Note: we can proceed with "latest stable" assumption if not researched)
