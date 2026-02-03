# Prepare CLI Release

This prompt guides the GitHub Copilot agent through preparing a CLI release by identifying CLI-related PRs, labeling them appropriately, and creating the release tag.

## Overview

You will:
1. Identify PRs merged since the last CLI release
2. Assess which PRs affect CLI code and apply the `cli` label
3. Ensure all CLI PRs have category labels
4. Generate a changelog preview
5. Create and push the release tag

## Prerequisites

- The `main` branch must have a clean working directory
- All PRs intended for the release must already be merged to `main`

## Task Instructions

### 1. Determine Release Version

First, check the latest CLI release tags to determine the next version by listing recent tags matching `cli-v*`.

Follow semantic versioning conventions:
- **Stable releases**: `cli-v1.0.0`, `cli-v1.0.1`, `cli-v1.1.0`
- **Pre-releases**: `cli-v1.0.0-alpha.1`, `cli-v1.0.0-beta.1`, `cli-v1.0.0-rc.1`

Pre-release versions are published to the `beta` npm dist-tag and won't be installed by default.

Choose the appropriate next version based on the changes:
- **Patch release** (1.0.0 → 1.0.1): Bug fixes and minor updates
- **Minor release** (1.0.0 → 1.1.0): New features, backward compatible
- **Major release** (1.0.0 → 2.0.0): Breaking changes
- **Pre-release** (1.0.0 → 1.1.0-beta.1): Testing before stable release

Ask the user to confirm the version number before proceeding.

### 2. Identify PRs for Release

Find the last `cli-v*` release tag and its commit date. Then search for all merged PRs **that target the main branch** since that date.

**IMPORTANT:** Only include PRs where the base/target branch is `main`. Exclude PRs that targeted feature branches.

### 3. Assess and Label CLI PRs

For each PR merged since the last release, determine if it affects CLI code. A PR should receive the `cli` label if it includes changes to:

- `cli/` directory (source code, tests, scripts)
- `.github/workflows/publish-cli.yml`
- `.github/cli-release-changelog-config.json`
- `.github/prompts/prepare-cli-release.prompt.md`
- CLI-related documentation in `docs/` that specifically covers CLI usage

**Labeling workflow:**
1. Review each PR's changed files
2. If the PR affects CLI code (per criteria above), add the `cli` label
3. If the PR already has a category label (`enhancement`, `bug`, `documentation`, `maintenance`), keep it
4. If the PR lacks a category label, determine the appropriate one based on the PR content and add it

**Category label guidelines:**
- `enhancement` - New features, major enhancements
- `bug` - Bug fixes, error corrections
- `documentation` - README updates, documentation improvements
- `maintenance` - Refactoring, code cleanup, dependency updates, CI/CD changes

Continue until all CLI-affecting PRs have both the `cli` label and a category label.

### 4. Verify All CLI PRs Are Labeled

Re-check that all CLI PRs now have:
1. The `cli` label
2. One of the category labels

If any are still missing labels, repeat step 3.

### 5. Generate Changelog Preview

Generate a changelog preview organized by label category. **Only include PRs that have the `cli` label.**

Search for merged PRs since the last release filtered by the `cli` label AND each category label:
- `cli` + `enhancement` for Features
- `cli` + `bug` for Bug Fixes
- `cli` + `documentation` for Documentation
- `cli` + `maintenance` for Maintenance

Format the output as a complete changelog:

```
## 🚀 Features
- Feature description (#123)

## 🐛 Bug Fixes
- Bug description (#124)

## 📚 Documentation
- Doc description (#125)

## 🔧 Maintenance
- Maintenance description (#126)
```

Present this changelog to the user for review.

### 6. Create and Push Tag

After the user approves:

1. Ensure you're on the `main` branch with a clean working directory
2. Create the annotated tag: `git tag -a cli-v<version> -m "CLI release <version>"`
3. Push the tag: `git push origin cli-v<version>`

The tag push will trigger the `publish-cli.yml` workflow which:
- Publishes to npm (with `--tag beta` for pre-releases)
- Generates the changelog from labeled PRs
- Creates a GitHub Release

### 7. Verify Release

After pushing the tag, check that:
1. The GitHub Actions workflow started
2. The npm package was published
3. The GitHub Release was created with the changelog
