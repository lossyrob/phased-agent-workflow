# Prepare CLI Release

This prompt guides the agent through preparing a CLI release by identifying PRs, ensuring labels, and creating the release tag.

## Overview

You will:
1. Identify PRs merged to `main` since the last CLI release
2. Exclude any VS Code-only PRs (label with `vscode`)
3. Ensure all included PRs have category labels
4. Generate a changelog preview
5. Create and push the release tag

## Label Model

The CLI installs agents, skills, and CLI code. Most PRs are relevant to the CLI release.

- **No platform label** — Relevant to both CLI and VS Code (default for most PRs)
- **`cli`** — CLI-only changes (not in VS Code extension changelog)
- **`vscode`** — VS Code-only changes (excluded from CLI changelog)

The changelog builder automatically excludes PRs labeled `vscode`.

## Prerequisites

- The `main` branch must have a clean working directory
- All PRs intended for the release must already be merged to `main`

## Task Instructions

### 1. Determine Release Version

Check the latest CLI release tags (`cli-v*`) to determine the next version.

Semantic versioning:
- **Patch** (0.0.3 → 0.0.4): Bug fixes and minor updates
- **Minor** (0.0.3 → 0.1.0): New features, backward compatible
- **Major** (0.0.3 → 1.0.0): Breaking changes
- **Pre-release** (0.0.4-beta.1): Published to `beta` npm dist-tag

Ask the user to confirm the version number before proceeding.

### 2. Identify PRs for Release

Find the last `cli-v*` release tag and its date. Search for all merged PRs **targeting `main`** since that date.

Exclude PRs that targeted feature branches (not `main`).

### 3. Label PRs

For each PR, review its changed files and apply labels:

**Platform labels** (apply when needed):
- Add `vscode` if the PR **only** affects VS Code extension code (e.g., `.vsix` packaging, VS Code-specific UI, extension manifest) with no changes to agents, skills, CLI, or shared code
- Add `cli` if the PR **only** affects CLI-specific code (`cli/` directory, `publish-cli.yml`, CLI-specific docs) with no changes to agents, skills, or shared code
- Leave unlabeled (no platform label) if the PR touches agents, skills, prompts, shared docs, or anything installed by both platforms

**Category labels** (every PR needs one):
- `enhancement` — New features
- `bug` — Bug fixes
- `documentation` — Documentation changes
- `maintenance` — Refactoring, CI/CD, dependency updates

### 4. Generate Changelog Preview

Generate a changelog from all PRs since the last release, **excluding** any labeled `vscode`. Organize by category:

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

### 5. Create and Push Tag

After the user approves:

1. Ensure you're on `main` with a clean working directory
2. Create the annotated tag: `git tag -a cli-v<version> -m "CLI release <version>"`
3. Push the tag: `git push origin cli-v<version>`

The tag push triggers `publish-cli.yml` which publishes to npm and creates a GitHub Release.

### 6. Verify Release

Check that:
1. The GitHub Actions workflow started
2. The npm package was published
3. The GitHub Release was created with the changelog
