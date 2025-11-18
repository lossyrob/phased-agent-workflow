# Prepare Release

This prompt guides the GitHub Copilot agent through creating a new release tag and ensuring all PRs are properly labeled before pushing the tag, which triggers the automated release workflow.

## Overview

You will:
1. Identify PRs merged since the last release
2. Verify all PRs have appropriate labels
3. Label any unlabeled PRs
4. Generate a changelog preview
5. Create and push the release tag

## Prerequisites

- The `main` branch must have a clean working directory
- All PRs intended for the release must already be merged to `main`

## Task Instructions

### 1. Determine Release Version

First, check the latest release tags to determine the next version by listing recent tags.

Follow semantic versioning conventions for this project:
- **Even minor versions** (0.2.x, 0.4.x, 1.0.x, 1.2.x): **Stable releases**
- **Odd minor versions** (0.1.x, 0.3.x, 1.1.x, 1.3.x): **Pre-releases**

Choose the appropriate next version based on the changes:
- **Patch release** (0.4.0 → 0.4.1): Bug fixes and minor updates
- **Minor release** (0.4.0 → 0.6.0): New features (use even number for stable)
- **Major release** (0.4.0 → 1.0.0): Breaking changes

Ask the user to confirm the version number before proceeding.

### 2. Identify PRs for Release

Find the last release tag and its commit date. Then search for all merged PRs to the main branch since that date. You should get the PR number, title, labels, and merge date for each PR.

Review the results to identify PRs that need labels.

### 3. Review and Label PRs

According to `.github/copilot-instructions.md`, all PRs must have one of these labels:
- `enhancement` - For new features
- `bug` - For bug fixes  
- `documentation` - For documentation changes
- `maintenance` - For maintenance, refactoring, or chores

**Labeling Guidelines:**
- New features, major enhancements → `enhancement`
- Bug fixes, error corrections → `bug`
- README updates, documentation improvements → `documentation`
- Refactoring, code cleanup, dependency updates, CI/CD changes → `maintenance`

For each unlabeled PR:
1. Review the PR title and description to determine the appropriate label
2. Add the label to the PR/issue

Continue until all PRs have labels.

### 4. Verify All PRs Are Labeled

Re-check that all PRs now have labels by searching for merged PRs since the last release again.

Ensure no PRs are missing labels. If any are still unlabeled, repeat step 3.

### 5. Generate Changelog Preview

Generate a changelog preview organized by label category. Search for merged PRs since the last release filtered by each label:
- `enhancement` for Features
- `bug` for Bug Fixes
- `documentation` for Documentation
- `maintenance` for Maintenance

Format the output as a complete changelog following the project's format:

```
## 🚀 Features
- [Feature Title] Feature description (#123)

## 🐛 Bug Fixes
- [Bug Title] Bug description (#124)

## 📚 Documentation
- [Doc Title] Doc description (#125)

## 🔧 Maintenance
- [Maintenance Title] Maintenance description (#126)
```

Present this changelog to the user for review.

