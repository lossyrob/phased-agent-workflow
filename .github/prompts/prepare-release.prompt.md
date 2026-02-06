# Prepare Release

This prompt guides the agent through creating a VS Code extension release with curated release notes.

## Overview

You will:
1. Identify PRs merged since the last release
2. Verify all PRs have category labels
3. Write curated release notes
4. Create and push the release tag
5. Post release notes to the GitHub Release

## Label Model

- **No platform label** — Relevant to both CLI and VS Code (default)
- **`cli`** — CLI-only changes (excluded from VS Code changelog)
- **`vscode`** — VS Code-only changes (not in CLI changelog)

## Prerequisites

- The `main` branch must have a clean working directory
- All PRs intended for the release must already be merged to `main`

## Task Instructions

### 1. Determine Release Version

Check the latest release tags (`v*`, excluding `cli-v*`) to determine the next version.

VS Code extension versioning convention:
- **Even minor** (0.2.x, 0.4.x): Stable releases
- **Odd minor** (0.1.x, 0.3.x): Pre-releases

Choose based on changes:
- **Patch** (0.10.0 → 0.10.1): Bug fixes
- **Minor** (0.10.0 → 0.12.0): New features (even = stable)
- **Major** (0.10.0 → 1.0.0): Breaking changes

Ask the user to confirm the version number before proceeding.

### 2. Identify PRs for Release

Find the last `v*` release tag (excluding `cli-v*`) and its date. Search for all merged PRs **targeting `main`** since that date.

Exclude PRs that targeted feature branches (not `main`).

### 3. Label PRs

For each PR, ensure it has a category label:
- `enhancement` — New features
- `bug` — Bug fixes
- `documentation` — Documentation changes
- `maintenance` — Refactoring, CI/CD, dependency updates

Also apply platform labels where needed:
- `cli` if the PR **only** affects CLI-specific code
- `vscode` if the PR **only** affects VS Code extension code
- No platform label if the PR touches shared code (agents, skills, prompts, docs)

### 4. Generate and Post Release Notes

Write a changelog from all PRs since the last release, **excluding** any labeled `cli`. Organize by category:

```markdown
## 🚀 Features
- Brief description ([#123](PR_URL))

## 🐛 Bug Fixes
- Brief description ([#124](PR_URL))

## 📚 Documentation
- Brief description ([#125](PR_URL))

## 🔧 Maintenance
- Brief description ([#126](PR_URL))
```

Guidelines:
- Write concise descriptions (don't just copy PR titles — clean up brackets, prefixes)
- Link PR numbers to their URLs
- Omit empty categories
- Add an installation section at the end with VSIX download and install instructions

Present the changelog to the user for review.

### 5. Create and Push Tag

After the user approves:

1. Ensure you're on `main` with a clean working directory
2. Create the annotated tag: `git tag -a v<version> -m "Release <version>"`
3. Push the tag: `git push origin v<version>`

The tag push triggers `release.yml` which builds the VSIX, publishes it, and creates a placeholder GitHub Release.

### 6. Post Release Notes

After the workflow completes and the release exists:

1. Write the changelog to a temp file
2. Update the release: `gh release edit v<version> --notes-file <file>`
3. Verify the release looks correct: `gh release view v<version>`