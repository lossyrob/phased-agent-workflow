# GitHub Actions VSIX Release Implementation Plan

## Overview

This implementation plan creates two GitHub Actions workflows for the PAW VS Code extension:

1. **Release Workflow**: Automatically builds the extension, packages it as a VSIX file, generates a changelog from commit history, and creates a GitHub Release with the VSIX attached as a downloadable asset whenever a version tag matching `v*` is pushed to the repository.

2. **PR Gate Workflow**: Automatically runs on pull requests to validate code quality before merging. This workflow runs unit tests for the extension and lints all chatmode files to ensure they don't exceed token limits, serving as a quality gate to prevent broken code or oversized chatmode files from being merged.

## Current State Analysis

The phased-agent-workflow repository contains a VS Code extension in `vscode-extension/` with a complete build system already configured:

- Extension uses TypeScript compiled with `tsc`
- Build scripts already defined: `npm run compile` and `npm run package`
- VSIX packaging tool `@vscode/vsce` already installed as dev dependency
- Extension name: `paw-workflow`, current version: `0.0.1`
- **No existing GitHub Actions workflows** - completely clean slate

### Key Discoveries:
- Build process is straightforward: `npm install` → `npm run compile` → `npm run package` (from `vscode-extension/package.json:62-68`)
- All npm commands must run in the `vscode-extension/` working directory
- The `vscode:prepublish` script automatically runs compilation before packaging (`vscode-extension/package.json:62`)
- VSIX files are excluded from git via `.gitignore` (`vscode-extension/.gitignore:4`)
- Extension generates filename pattern: `paw-workflow-<version>.vsix`

## Desired End State

A fully automated release and quality assurance system where:

**Release Automation:**
1. Developers update `vscode-extension/package.json` version to match desired release (e.g., `0.2.0`)
2. Developers create and push a matching git tag (e.g., `git tag v0.2.0 && git push origin v0.2.0`)
3. GitHub Actions automatically:
   - Builds and packages the extension into a VSIX file
   - Generates a changelog from commits since the previous tag
   - Detects if version is pre-release (odd minor) or stable (even minor)
   - Creates a GitHub Release with the VSIX attached
4. Users can download the VSIX from the Releases page and install it in VS Code

**PR Quality Gates:**
1. Developers open pull requests with code changes
2. GitHub Actions automatically:
   - Compiles the extension TypeScript code
   - Runs all unit tests with proper VS Code environment
   - Lints all chatmode files to ensure they don't exceed token limits
   - Reports pass/fail status on the PR
3. PRs cannot be merged until all checks pass
4. Failed checks clearly indicate which test or lint rule failed

### Verification:
- **Automated (Release)**: Push tag `v0.2.0` and within 5 minutes, a GitHub Release exists with attached VSIX
- **Automated (Release)**: Download VSIX from release, install with `code --install-extension paw-workflow-0.2.0.vsix`, verify extension loads
- **Automated (Release)**: Check workflow logs show successful completion without errors
- **Automated (PR Gate)**: Open PR and verify workflow runs automatically within 1 minute
- **Automated (PR Gate)**: Verify unit tests run and report results
- **Automated (PR Gate)**: Verify chatmode linting runs and reports results
- **Manual (Release)**: Verify changelog in release description contains commits since previous tag
- **Manual (Release)**: Verify pre-release flag is correctly set (odd minor = pre-release, even minor = stable)
- **Manual (PR Gate)**: Create failing test and verify PR workflow fails with clear error message
- **Manual (PR Gate)**: Create oversized chatmode file and verify PR workflow fails with token count error

## What We're NOT Doing

- Publishing to Visual Studio Code Marketplace (future enhancement)
- Supporting non-`v*` tag patterns or non-semver versions
- Automatically updating `package.json` version (manual step before tagging)
- Building multi-platform VSIX variants (extension is platform-agnostic)
- Creating release branches or managing git workflows
- Editing or deleting releases via automation
- Uploading build artifacts beyond the final VSIX (in release workflow)
- Running performance or integration tests (only unit tests and linting)

## Implementation Approach

The implementation is divided into three phases:

1. **Phase 1** establishes the release workflow file structure, trigger configuration, and environment setup. This creates a minimal workflow that responds to tag pushes and sets up the Node.js build environment.

2. **Phase 2** implements all release functional steps: building the extension, packaging the VSIX, generating the changelog, detecting pre-release versions, and creating the GitHub Release with proper metadata and assets.

3. **Phase 3** creates a separate PR gate workflow that runs on pull requests to validate code quality before merging. This includes unit tests for the extension and linting for chatmode files to ensure they don't exceed token limits.

This phasing allows us to verify the trigger mechanism works correctly (Phase 1) before adding the complex release logic (Phase 2). Phase 3 is separate because it's a distinct workflow with different triggers and purposes - it gates PR merges rather than creating releases. Each workflow can be tested and validated independently.

## Phase 1: Create GitHub Actions Workflow Structure

### Overview
Set up the foundational workflow file with tag-based triggering, Node.js environment configuration, and basic job structure. This phase establishes the workflow skeleton that will be filled with functional steps in Phase 2.

### Changes Required:

#### 1. Create Workflow Directory and File
**File**: `.github/workflows/release.yml`
**Changes**: Create new file with workflow structure

```yaml
name: Release VSIX

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    
    permissions:
      contents: write  # Required to create releases and upload assets
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: 'vscode-extension/package-lock.json'
      
      - name: Verify workflow trigger
        run: |
          echo "Triggered by tag: ${{ github.ref_name }}"
          echo "Repository: ${{ github.repository }}"
```

**Rationale:**
- `on.push.tags: ['v*']` ensures workflow only runs for version tags (matches `v0.1.0`, `v1.2.3`, etc.)
- `ubuntu-latest` is sufficient for Node.js builds and is fastest/cheapest runner
- `permissions.contents: write` grants the workflow ability to create releases
- `actions/checkout@v4` is the latest stable checkout action
- `actions/setup-node@v4` with cache enabled speeds up subsequent runs
- Node.js 20 is the current LTS and matches modern extension development practices
- `cache-dependency-path` points to extension's lock file for accurate caching
- Verification step allows testing the workflow triggers correctly

### Success Criteria:

#### Automated Verification:
- [x] Workflow file passes YAML syntax validation (no GitHub Actions errors)
- [ ] Create test tag locally: `git tag v0.0.1-test && git push origin v0.0.1-test`
- [ ] Workflow appears in Actions tab and starts running
- [ ] Workflow completes "Checkout code" and "Setup Node.js" steps successfully
- [ ] Workflow logs show correct tag name in "Verify workflow trigger" output
- [ ] Delete test tag after verification: `git push origin --delete v0.0.1-test && git tag -d v0.0.1-test`

#### Manual Verification:
- [ ] Workflow does not trigger when pushing commits without tags
- [ ] Workflow does not trigger for non-`v*` tags (e.g., `release-1.0`)
- [ ] Node.js cache is populated after first run (check workflow logs for "Cache restored" message)

### Phase 1 Implementation Complete - 2025-11-11

**Status**: Phase 1 implementation completed. The GitHub Actions workflow structure has been created at `.github/workflows/release.yml` with:
- Tag-based trigger configuration (`v*` pattern)
- Ubuntu runner with contents write permissions
- Checkout and Node.js setup steps with npm caching
- Verification step to display trigger information

**YAML Validation**: Workflow file syntax validated successfully using Python's YAML parser.

**Remaining Verification**: The automated verification steps requiring tag push and workflow execution on GitHub Actions will need to be tested after the phase PR is merged. These tests include:
- Creating and pushing a test tag to verify workflow triggering
- Verifying workflow appears in Actions tab and completes successfully
- Verifying Node.js cache behavior
- Testing that non-`v*` tags do not trigger the workflow

**Review Notes**: 
- Reviewer should verify the workflow file structure follows GitHub Actions best practices
- Pay attention to the cache configuration pointing to the correct lock file path
- Ensure permissions are correctly scoped to `contents: write` only

---

## Phase 2: Add Build, Package, and Release Steps

### Overview
Implement the complete release functionality: install dependencies, compile TypeScript, package the VSIX, generate a changelog, determine pre-release status, and create a GitHub Release with the VSIX attached. This phase transforms the skeleton workflow into a fully functional release automation system.

### Changes Required:

#### 1. Add Dependency Installation and Build Steps
**File**: `.github/workflows/release.yml`
**Changes**: Add steps after the Node.js setup to install dependencies and build the extension

```yaml
      - name: Install dependencies
        working-directory: vscode-extension
        run: npm ci
      
      - name: Compile extension
        working-directory: vscode-extension
        run: npm run compile
```

**Rationale:**
- `npm ci` provides clean, reproducible installs from lock file (faster and more reliable than `npm install`)
- `working-directory: vscode-extension` ensures commands run in the correct directory
- Explicit `npm run compile` makes build step visible in logs (even though `vscode:prepublish` would run it)

#### 2. Extract Version and Detect Pre-release Status
**File**: `.github/workflows/release.yml`
**Changes**: Add steps to parse the tag, extract version, and determine if it's a pre-release

```yaml
      - name: Extract version from tag
        id: version
        run: |
          TAG_NAME="${{ github.ref_name }}"
          VERSION="${TAG_NAME#v}"  # Remove 'v' prefix
          echo "version=${VERSION}" >> $GITHUB_OUTPUT
          echo "Extracted version: ${VERSION}"
      
      - name: Verify package.json version matches tag
        working-directory: vscode-extension
        run: |
          PACKAGE_VERSION=$(node -p "require('./package.json').version")
          TAG_VERSION="${{ steps.version.outputs.version }}"
          if [ "$PACKAGE_VERSION" != "$TAG_VERSION" ]; then
            echo "Error: package.json version ($PACKAGE_VERSION) does not match tag version ($TAG_VERSION)"
            exit 1
          fi
          echo "Version match confirmed: $PACKAGE_VERSION"
      
      - name: Determine pre-release status
        id: prerelease
        run: |
          VERSION="${{ steps.version.outputs.version }}"
          # Extract minor version (second number in semver)
          MINOR=$(echo $VERSION | cut -d. -f2)
          # Check if minor version is odd (pre-release) or even (stable)
          if [ $((MINOR % 2)) -eq 1 ]; then
            echo "is_prerelease=true" >> $GITHUB_OUTPUT
            echo "This is a pre-release version (minor=$MINOR is odd)"
          else
            echo "is_prerelease=false" >> $GITHUB_OUTPUT
            echo "This is a stable release version (minor=$MINOR is even)"
          fi
```

**Rationale:**
- Extract version once and reuse via `$GITHUB_OUTPUT` for consistency
- Version verification prevents accidental mismatches between git tag and package.json
- Pre-release detection uses modulo arithmetic on minor version: `minor % 2 === 1` means odd (pre-release)
- Bash parameter expansion `${TAG_NAME#v}` cleanly removes `v` prefix

#### 3. Package VSIX
**File**: `.github/workflows/release.yml`
**Changes**: Add step to create the VSIX file

```yaml
      - name: Package VSIX
        working-directory: vscode-extension
        run: npm run package
      
      - name: Verify VSIX created
        id: vsix
        working-directory: vscode-extension
        run: |
          VSIX_FILE="paw-workflow-${{ steps.version.outputs.version }}.vsix"
          if [ ! -f "$VSIX_FILE" ]; then
            echo "Error: Expected VSIX file not found: $VSIX_FILE"
            exit 1
          fi
          echo "vsix_path=vscode-extension/${VSIX_FILE}" >> $GITHUB_OUTPUT
          echo "vsix_name=${VSIX_FILE}" >> $GITHUB_OUTPUT
          echo "VSIX created successfully: $VSIX_FILE"
```

**Rationale:**
- `npm run package` runs `vsce package` which creates the VSIX
- Verification step ensures the file exists before attempting to upload
- Store both full path and filename for use in release step
- Fails fast if packaging silently fails

#### 4. Generate Changelog
**File**: `.github/workflows/release.yml`
**Changes**: Add step to generate changelog from commit history

```yaml
      - name: Generate changelog
        id: changelog
        uses: mikepenz/release-changelog-builder-action@v4
        with:
          configuration: .github/release-changelog-config.json
          failOnError: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Rationale:**
- `mikepenz/release-changelog-builder-action@v4` is well-maintained and feature-rich
- `failOnError: false` prevents workflow failure if changelog generation has issues (release still proceeds)
- Will create configuration file in next change to customize output format

#### 5. Create Changelog Configuration
**File**: `.github/release-changelog-config.json`
**Changes**: Create new file with changelog generation settings

```json
{
  "categories": [
    {
      "title": "## 🚀 Features",
      "labels": ["feature", "enhancement", "feat"]
    },
    {
      "title": "## 🐛 Bug Fixes",
      "labels": ["bug", "fix"]
    },
    {
      "title": "## 📚 Documentation",
      "labels": ["documentation", "docs"]
    },
    {
      "title": "## 🔧 Maintenance",
      "labels": ["chore", "refactor", "maintenance"]
    }
  ],
  "ignore_labels": [
    "ignore",
    "wontfix",
    "duplicate",
    "invalid"
  ],
  "sort": {
    "order": "ASC",
    "on_property": "mergedAt"
  },
  "template": "#{{CHANGELOG}}\n\n## Installation\n\nDownload the `.vsix` file from the assets below and install it in VS Code:\n\n```bash\ncode --install-extension paw-workflow-${{ steps.version.outputs.version }}.vsix\n```\n\nOr use the VS Code UI: Extensions view → ⋯ menu → Install from VSIX\n\n---\n\n🐾 Generated with [PAW](https://github.com/lossyrob/phased-agent-workflow)",
  "pr_template": "- #{{TITLE}} (#{{NUMBER}})",
  "empty_template": "No changes in this release",
  "max_pull_requests": 200,
  "max_back_track_time_days": 365
}
```

**Rationale:**
- Categories organize commits by type for readability
- Supports both PR labels and conventional commit keywords
- Includes installation instructions directly in release notes
- PAW attribution at the bottom per specification
- `empty_template` handles edge case of no commits between releases
- `max_pull_requests: 200` and `max_back_track_time_days: 365` provide reasonable limits

#### 6. Check for Existing Release
**File**: `.github/workflows/release.yml`
**Changes**: Add step to check if release already exists (idempotency)

```yaml
      - name: Check if release exists
        id: check_release
        run: |
          RELEASE_EXISTS=$(gh release view "${{ github.ref_name }}" --json id 2>/dev/null || echo "")
          if [ -n "$RELEASE_EXISTS" ]; then
            echo "exists=true" >> $GITHUB_OUTPUT
            echo "Release already exists for tag ${{ github.ref_name }}, skipping"
          else
            echo "exists=false" >> $GITHUB_OUTPUT
            echo "No existing release found, will create new release"
          fi
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Rationale:**
- Uses `gh` CLI to check for existing release (installed by default on GitHub runners)
- Gracefully handles case where release doesn't exist (stderr redirected to /dev/null)
- Sets output flag for conditional execution in next step
- Provides idempotency - re-running workflow won't fail or duplicate

#### 7. Create GitHub Release
**File**: `.github/workflows/release.yml`
**Changes**: Add final step to create the release with VSIX attached

```yaml
      - name: Create GitHub Release
        if: steps.check_release.outputs.exists == 'false'
        uses: softprops/action-gh-release@v1
        with:
          name: ${{ github.ref_name }}
          tag_name: ${{ github.ref_name }}
          body: ${{ steps.changelog.outputs.changelog }}
          files: ${{ steps.vsix.outputs.vsix_path }}
          prerelease: ${{ steps.prerelease.outputs.is_prerelease }}
          fail_on_unmatched_files: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Release summary
        if: steps.check_release.outputs.exists == 'false'
        run: |
          echo "✅ Release created successfully!"
          echo "Version: ${{ steps.version.outputs.version }}"
          echo "Pre-release: ${{ steps.prerelease.outputs.is_prerelease }}"
          echo "VSIX: ${{ steps.vsix.outputs.vsix_name }}"
          echo "View release: ${{ github.server_url }}/${{ github.repository }}/releases/tag/${{ github.ref_name }}"
```

**Rationale:**
- `softprops/action-gh-release@v1` is the most popular and reliable release action
- Conditional `if:` skips release creation if it already exists
- `name` and `tag_name` both use the git tag for consistency
- `body` contains the auto-generated changelog
- `files` attaches the VSIX to the release
- `prerelease` flag set based on our odd/even minor version logic
- `fail_on_unmatched_files: true` ensures we fail if VSIX path is wrong
- Summary step provides clear success message with release URL

### Success Criteria:

#### Automated Verification:
- [ ] Update `vscode-extension/package.json` version to `0.2.0`
- [ ] Commit change: `git add vscode-extension/package.json && git commit -m "chore: bump version to 0.2.0"`
- [ ] Create and push tag: `git tag v0.2.0 && git push origin feature/github-actions-vsix-release && git push origin v0.2.0`
- [ ] Workflow completes successfully within 5 minutes
- [ ] GitHub Release exists at `https://github.com/lossyrob/phased-agent-workflow/releases/tag/v0.2.0`
- [ ] Release has VSIX file attached named `paw-workflow-0.2.0.vsix`
- [ ] Release is marked as stable (not pre-release) because minor version 2 is even
- [ ] Download VSIX and verify it installs: `code --install-extension paw-workflow-0.2.0.vsix`
- [ ] Re-run workflow and verify it skips release creation (idempotency check)

#### Manual Verification:
- [ ] Release description contains changelog with commits since previous tag (or all commits if first release)
- [ ] Release description includes installation instructions
- [ ] Release description includes PAW attribution footer
- [ ] Create tag `v0.3.0` (odd minor) and verify release is marked as pre-release
- [ ] Workflow logs clearly show each step's progress and don't contain errors
- [ ] VSIX file size is reasonable (should be under 1MB for this extension)

### Phase 2 Implementation Complete - 2025-11-11

**Status**: Phase 2 implementation completed. The release workflow has been fully implemented with all functional steps:
- Dependency installation (`npm ci`) and TypeScript compilation
- Version extraction from git tag with validation against `package.json`
- Pre-release detection based on odd/even minor version numbers
- VSIX packaging and verification
- Changelog generation using `mikepenz/release-changelog-builder-action@v4`
- Release existence check for idempotency
- GitHub Release creation with VSIX attachment using `softprops/action-gh-release@v1`
- Summary step with release URL

**Files Modified**:
- `.github/workflows/release.yml` - Added all Phase 2 steps
- `.github/release-changelog-config.json` - Created changelog configuration with categories, template, and PAW attribution

**Validation**: Both YAML workflow syntax and JSON config syntax validated successfully using Python parsers.

**Note on Changelog Template**: The implementation plan included a reference to `${{ steps.version.outputs.version }}` in the JSON config template, which is GitHub Actions syntax and doesn't work in the changelog action's template. I replaced it with `#{{TO_TAG}}` which is the correct placeholder syntax for the changelog builder action's template system.

**Remaining Verification**: The automated and manual verification steps require:
1. Updating `vscode-extension/package.json` to version `0.2.0`
2. Committing and tagging the change
3. Pushing the tag to trigger the workflow on GitHub Actions
4. Testing download and installation of the generated VSIX
5. Verifying idempotency by re-running the workflow
6. Testing pre-release detection with an odd minor version (e.g., `v0.3.0`)

These verification steps will be performed after the Phase PR is merged to the target branch.

**Review Notes**: 
- Reviewer should verify all workflow steps match the implementation plan specifications
- Check that the changelog configuration properly categorizes commits by label
- Verify the version verification step will fail fast if package.json doesn't match tag
- Ensure pre-release logic correctly uses modulo arithmetic on minor version
- Confirm VSIX path construction matches the extension's naming pattern (`paw-workflow-<version>.vsix`)
- Validate that the release creation step properly uses conditional execution to skip if release already exists

---

## Phase 3: Create PR Gate Workflow

### Overview
Create a separate GitHub Actions workflow that runs on pull requests to validate code quality before merging. This workflow runs unit tests for the VS Code extension and lints all chatmode files to ensure they don't exceed token limits. This serves as a quality gate to prevent broken code or oversized chatmode files from being merged.

### Changes Required:

#### 1. Create PR Workflow File
**File**: `.github/workflows/pr-checks.yml`
**Changes**: Create new workflow that triggers on pull requests

```yaml
name: PR Checks

on:
  pull_request:
    branches:
      - main
      - 'feature/**'
    paths:
      - 'vscode-extension/**'
      - '.github/chatmodes/**'
      - 'scripts/**'
      - '.github/workflows/pr-checks.yml'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: |
            vscode-extension/package-lock.json
            package-lock.json
      
      - name: Install root dependencies
        run: npm ci
      
      - name: Install extension dependencies
        working-directory: vscode-extension
        run: npm ci
      
      - name: Compile extension
        working-directory: vscode-extension
        run: npm run compile
      
      - name: Run extension unit tests
        working-directory: vscode-extension
        run: |
          # Install xvfb for headless VS Code testing
          sudo apt-get update
          sudo apt-get install -y xvfb
          
          # Run tests with virtual display
          xvfb-run -a npm test
        env:
          # Prevent VS Code from showing UI during tests
          DISPLAY: ':99.0'
      
      - name: Lint chatmode files
        run: npm run lint:chatmode:all
      
      - name: PR checks summary
        if: success()
        run: |
          echo "✅ All PR checks passed!"
          echo "- Extension unit tests: PASSED"
          echo "- Chatmode linting: PASSED"
```

**Rationale:**
- Triggers only on PRs targeting `main` or `feature/**` branches
- `paths` filter ensures workflow only runs when relevant files change
- Installs dependencies for both root (chatmode linting) and extension (tests)
- Uses `xvfb` for headless VS Code testing (required for extension tests)
- Runs both unit tests and chatmode linting
- Provides clear summary of what passed

#### 2. Add xvfb Setup Comments to Extension Test Runner
**File**: `vscode-extension/src/test/runTest.ts`
**Changes**: Add comment documenting xvfb requirement (no code changes needed)

```typescript
/**
 * Test runner for VS Code extension tests
 * 
 * Note: In CI environments (like GitHub Actions), tests require xvfb
 * for headless VS Code execution. The CI workflow handles this setup.
 * 
 * Local testing: Just run `npm test` - VS Code will launch normally.
 * CI testing: Handled by `xvfb-run -a npm test` in the workflow.
 */
```

**Rationale:**
- Documents the xvfb requirement for future maintainers
- Clarifies why CI setup differs from local testing
- No functional changes needed - just documentation

### Success Criteria:

#### Automated Verification:
- [ ] Create a test branch with a small change to extension code
- [ ] Open PR to merge test branch into target branch
- [ ] Verify PR workflow appears in Actions tab and starts automatically
- [ ] Workflow completes all steps successfully
- [ ] Extension tests run and pass
- [ ] Chatmode linting runs and passes
- [ ] Test failure scenario: Add a failing test and verify workflow fails
- [ ] Test failure scenario: Create an oversized chatmode file (>6500 tokens) and verify workflow fails
- [ ] Verify workflow does NOT run when pushing to branches without opening a PR
- [ ] Verify workflow does NOT run when changing files outside the `paths` filter

#### Manual Verification:
- [ ] Review workflow logs to ensure all test output is visible
- [ ] Verify xvfb setup works correctly (no display errors)
- [ ] Confirm chatmode linting errors are clearly reported
- [ ] Check that workflow completes in reasonable time (<5 minutes)
- [ ] Verify GitHub PR interface shows workflow status clearly
- [ ] Test with PR that modifies only chatmode files (extension tests should still run)
- [ ] Test with PR that modifies only extension code (chatmode linting should still run)

---

## Testing Strategy

### Automated Testing:
The workflow itself serves as the automated test. Each phase has automated verification criteria that validate the workflow executes correctly.

**Phase 1 Testing:**
- Create a test tag and verify workflow triggers
- Check workflow logs for successful environment setup
- Delete test tag after validation

**Phase 2 Testing:**
- Perform real release with version `0.2.0`
- Download and install VSIX to verify it works
- Test idempotency by re-running workflow
- Test pre-release detection with odd minor version

**Phase 3 Testing:**
- Create test PR and verify workflow triggers
- Verify unit tests run successfully
- Verify chatmode linting passes
- Test failure scenarios (failing test, oversized chatmode)
- Verify workflow doesn't run on non-PR pushes

### Manual Testing Steps:
1. **First Release (v0.1.0)**:
   - Update package.json to `0.1.0`
   - Push tag `v0.1.0`
   - Verify changelog includes all commits since repository start
   - Verify release is marked as pre-release (minor = 1, odd)
   
2. **Second Release (v0.2.0)**:
   - Update package.json to `0.2.0`
   - Push tag `v0.2.0`
   - Verify changelog only includes commits between `v0.1.0` and `v0.2.0`
   - Verify release is marked as stable (minor = 2, even)
   
3. **Version Mismatch Test**:
   - Update package.json to `0.3.0` but push tag `v0.4.0`
   - Verify workflow fails with clear error message about version mismatch
   
4. **Non-semver Tag Test**:
   - Push tag `v1.0` (missing patch version)
   - Verify workflow behavior (should fail or skip gracefully)

5. **Installation Test**:
   - Download VSIX from any release
   - Install with `code --install-extension <file>`
   - Verify extension appears in Extensions view
   - Verify extension commands work (e.g., `paw.initializeWorkItem`)

6. **PR Workflow Test**:
   - Create PR with extension code changes
   - Verify unit tests run automatically
   - Verify chatmode linting runs automatically
   - Create PR with failing test and verify workflow blocks merge
   - Create PR with oversized chatmode and verify workflow fails with clear error

## Performance Considerations

### Release Workflow (Phase 1-2):
- **Expected workflow duration**: 2-4 minutes for typical runs
  - Checkout: ~10 seconds
  - Node.js setup with cache: ~20 seconds (first run), ~5 seconds (cached)
  - Dependency installation: ~30-60 seconds
  - TypeScript compilation: ~10-20 seconds
  - VSIX packaging: ~5-10 seconds
  - Changelog generation: ~5-10 seconds
  - Release creation: ~5-10 seconds

### PR Checks Workflow (Phase 3):
- **Expected workflow duration**: 3-5 minutes for typical PRs
  - Checkout: ~10 seconds
  - Node.js setup with cache: ~20 seconds (first run), ~5 seconds (cached)
  - Root dependency installation: ~10-20 seconds
  - Extension dependency installation: ~30-60 seconds
  - TypeScript compilation: ~10-20 seconds
  - xvfb setup: ~5-10 seconds
  - Extension unit tests: ~30-60 seconds (depends on test suite size)
  - Chatmode linting: ~5-10 seconds (for ~30 files)

### General:
- **Caching strategy**: Node.js action caches `node_modules` based on lock file hash, significantly speeding up subsequent runs. Both workflows benefit from shared cache for extension dependencies.

- **Resource usage**: Minimal - standard Node.js build requires <1GB RAM, ubuntu-latest runner provides 7GB. Extension tests with xvfb add ~200MB overhead.

- **Concurrent execution**: Release and PR workflows are independent and can run concurrently. Multiple PRs will queue and run in parallel (up to GitHub Actions concurrency limits).

## Migration Notes

**Initial Setup:**
1. Merge this implementation to the target branch
2. Ensure `vscode-extension/package.json` version reflects current state (e.g., `0.0.1`)
3. Create initial release tag: `git tag v0.0.1 && git push origin v0.0.1`
4. Verify workflow runs and creates first release

**Ongoing Usage:**
1. Make changes to the extension
2. Update `vscode-extension/package.json` version to next desired version (e.g., `0.2.0` for stable, `0.3.0` for pre-release)
3. Commit the version change
4. Create matching tag: `git tag v0.2.0`
5. Push both commit and tag: `git push origin main && git push origin v0.2.0`
6. Wait for GitHub Actions to complete
7. Announce release to users with link to GitHub Releases page

**Rollback:**
- If a release is created incorrectly, manually delete it from GitHub Releases page
- Delete the tag: `git push origin --delete v0.x.x && git tag -d v0.x.x`
- Fix issues, then recreate tag

## References

- **Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/64
- **Spec**: `.paw/work/github-actions-vsix-release/Spec.md`
- **Research**: `.paw/work/github-actions-vsix-release/CodeResearch.md`
- **Extension package.json**: `vscode-extension/package.json`
- **GitHub Actions Documentation**: https://docs.github.com/en/actions
- **VS Code Extension Publishing**: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- **Changelog Builder Action**: https://github.com/mikepenz/release-changelog-builder-action
- **Release Action**: https://github.com/softprops/action-gh-release
