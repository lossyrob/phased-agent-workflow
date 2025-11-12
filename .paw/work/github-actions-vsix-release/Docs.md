# GitHub Actions VSIX Release

## Overview

This implementation adds automated release management and quality assurance for the PAW VS Code extension through two GitHub Actions workflows:

1. **Release Workflow** - Automatically builds the extension, packages it as a VSIX file, generates a changelog from commit history, and creates GitHub Releases with downloadable VSIX assets when version tags are pushed
2. **PR Gate Workflow** - Runs automated quality checks on pull requests to validate extension code and chatmode files before merging

These workflows solve the problem of manual release processes and lack of automated quality gates, enabling the PAW project to:
- Release extension versions efficiently without manual build and upload steps
- Maintain consistent versioning between git tags and package.json
- Provide users with easy-to-find, installable extension builds
- Prevent broken code or oversized chatmode files from being merged via pull requests
- Generate human-readable changelogs automatically from commit history

The implementation follows VS Code extension best practices for pre-release versioning (odd minor versions) and stable releases (even minor versions), ensuring users can easily identify development vs. production-ready builds.

## Architecture and Design

### High-Level Architecture

The system consists of two independent GitHub Actions workflows:

**Release Workflow** (`.github/workflows/release.yml`):
- Triggered by pushing git tags matching `v*` pattern
- Runs on GitHub-hosted Ubuntu runners
- Builds extension → Packages VSIX → Generates changelog → Creates GitHub Release
- Outputs: GitHub Release with attached VSIX file and auto-generated changelog

**PR Gate Workflow** (`.github/workflows/pr-checks.yml`):
- Triggered by pull requests targeting `main` or `feature/**` branches
- Runs on GitHub-hosted Ubuntu runners
- Compiles extension → Runs unit tests → Lints chatmode files
- Outputs: Pass/fail status on the pull request

Both workflows use GitHub's built-in `GITHUB_TOKEN` for authentication, eliminating the need for manual secret configuration.

### Design Decisions

**1. Separate Workflows for Distinct Purposes**
- Release and PR checks are independent workflows rather than combined jobs
- Rationale: Different triggers (tags vs. pull requests), different audiences (users vs. developers), and different failure modes require clear separation for maintainability

**2. Tag-Driven Releases Instead of Automated Version Bumping**
- Developers manually update `package.json` version and create matching git tags
- Workflow validates version match between tag and `package.json`
- Rationale: Explicit version control gives developers full control over release timing and versioning decisions; prevents accidental releases from automated commits

**3. Odd/Even Minor Version Pre-Release Detection**
- Uses modulo arithmetic on minor version number: `minor % 2 === 1` means pre-release
- Example: `v0.1.x` and `v0.3.x` are pre-releases; `v0.2.x` and `v0.4.x` are stable
- Rationale: Follows VS Code extension publishing best practices; provides clear visual distinction in GitHub Releases; avoids separate pre-release branches

**4. Idempotent Release Creation**
- Workflow checks if release exists before creating it
- Re-running workflow for existing tag skips release creation without error
- Rationale: Allows safe workflow re-runs for debugging; prevents duplicate releases; supports recovery from partial failures

**5. Changelog Generation from Commit History**
- Uses `mikepenz/release-changelog-builder-action@v4` to parse commits between tags
- Categorizes commits by PR labels (features, bugs, docs, maintenance)
- Rationale: Zero-configuration changelog generation; works without requiring conventional commit format; provides structured, readable release notes

**6. Comprehensive PR Path Filtering**
- PR workflow only runs when relevant files change (extension code, chatmode files, scripts, or the workflow itself)
- Rationale: Avoids unnecessary workflow runs for documentation-only changes; speeds up PR feedback loops; reduces GitHub Actions usage costs

**7. Headless VS Code Testing with xvfb**
- Extension unit tests run in xvfb (X virtual framebuffer) on Ubuntu runners
- Provides virtual display for VS Code's Electron-based test environment
- Rationale: Enables automated testing in CI without requiring physical display; matches VS Code testing best practices; allows tests to run the same way locally and in CI

**8. PAW Attribution in Release Notes**
- Changelog template includes "Generated with PAW" footer with link
- Rationale: Demonstrates PAW workflow capabilities; provides example for other projects; builds awareness of the development methodology

### Integration Points

**Git Tags → Release Workflow**:
- Git tags matching `v*` pattern trigger the release workflow
- Tags must match semantic versioning format (e.g., `v0.2.0`, `v1.0.5`)
- Version extracted from tag is validated against `vscode-extension/package.json`

**Pull Requests → PR Gate Workflow**:
- Pull requests targeting `main` or `feature/**` branches trigger quality checks
- Workflow status appears in PR checks section
- Failed checks prevent merge (when branch protection rules are configured)

**Extension Build System → Both Workflows**:
- Both workflows use existing npm scripts: `compile`, `test`, `package`
- Build commands run in `vscode-extension/` working directory
- Dependencies installed via `npm ci` for reproducible builds

**Chatmode Linting → PR Gate Workflow**:
- Uses existing `npm run lint:chatmode:all` script from root directory
- Validates all chatmode files don't exceed token limits (warning at 3,500, error at 6,500)

**GitHub Releases → Users**:
- VSIX files attached to releases as downloadable assets
- Users install extensions via `code --install-extension <file>.vsix` or VS Code UI
- Changelog in release description explains what changed

## User Guide

### Prerequisites

**For Release Workflow**:
- Repository with GitHub Actions enabled
- VS Code extension code in `vscode-extension/` directory
- Extension `package.json` with valid version field
- Git repository with commit history

**For PR Gate Workflow**:
- Root `package.json` with chatmode linting dependencies
- Extension unit tests configured in `vscode-extension/src/test/`
- Chatmode files in `.github/chatmodes/` (optional, but required for linting to have value)

### Creating a Release

**Step 1: Update Extension Version**

Edit `vscode-extension/package.json` and update the `version` field:

```json
{
  "name": "paw-workflow",
  "version": "0.2.0",
  ...
}
```

Choose your version number according to the pre-release convention:
- Odd minor versions (`0.1.x`, `0.3.x`, `0.5.x`) = Pre-releases
- Even minor versions (`0.2.x`, `0.4.x`, `0.6.x`) = Stable releases

**Step 2: Commit Version Change**

```bash
git add vscode-extension/package.json
git commit -m "chore: bump version to 0.2.0"
```

**Step 3: Create and Push Git Tag**

```bash
# Create tag matching the package.json version (with v prefix)
git tag v0.2.0

# Push commit and tag together
git push origin <branch-name>
git push origin v0.2.0
```

**Step 4: Monitor Workflow**

1. Navigate to your repository's **Actions** tab on GitHub
2. Find the "Release VSIX" workflow run for your tag
3. Monitor the workflow progress (typically completes in 2-4 minutes)
4. Check for any errors in the workflow logs

**Step 5: Verify Release**

1. Navigate to your repository's **Releases** page
2. Confirm a new release exists for your tag (e.g., `v0.2.0`)
3. Verify the release includes:
   - VSIX file attachment (e.g., `paw-workflow-0.2.0.vsix`)
   - Auto-generated changelog in the description
   - Correct pre-release flag (for odd minor versions)
   - Installation instructions

### Installing a Released Extension

**Method 1: Command Line**

```bash
# Download VSIX from the release page first, then:
code --install-extension paw-workflow-0.2.0.vsix
```

**Method 2: VS Code UI**

1. Open the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`)
2. Click the overflow menu (`⋯`) at the top
3. Select **Install from VSIX...**
4. Navigate to the downloaded VSIX file and select it
5. Reload VS Code when prompted

**Verification**:
- Extension appears in the Extensions view
- Extension commands are available in the Command Palette (e.g., `PAW: Initialize Work Item`)

### Working with Pull Requests

**Automatic Quality Checks**:

When you open a pull request targeting `main` or a `feature/**` branch, the PR Gate workflow automatically runs if your PR modifies:
- Extension code in `vscode-extension/`
- Chatmode files in `.github/chatmodes/`
- Scripts in `scripts/`
- The PR workflow itself

**Check Status**:

The PR will show a status check named "PR Checks / test":
- ✅ **Green check** - All tests and linting passed
- ❌ **Red X** - Tests failed or chatmode files exceed token limits
- 🟡 **Yellow dot** - Workflow is still running

**Viewing Check Details**:

1. Click "Details" next to the failed check
2. Review the workflow logs to identify:
   - Which unit tests failed (if any)
   - Which chatmode files exceed token limits (if any)
3. Fix the issues in your PR branch
4. Push new commits - the workflow re-runs automatically

**Common Failures**:

- **Extension tests fail**: Fix the test failures in your code, run `npm test` locally to verify, then push
- **Chatmode linting fails**: Reduce token count in oversized chatmode files (warning at 3,500, error at 6,500 tokens)
- **Compilation errors**: Fix TypeScript errors, run `npm run compile` locally to verify, then push

## Technical Reference

### Release Workflow Steps

**1. Trigger Configuration**
- Pattern: Tags matching `v*` (e.g., `v0.1.0`, `v1.2.3`)
- Ignored: Non-matching tags (e.g., `release-1.0`, `test`)

**2. Environment Setup**
- Runner: `ubuntu-latest` (GitHub-hosted)
- Node.js: Version 20 (LTS)
- Cache: npm cache based on `vscode-extension/package-lock.json`
- Permissions: `contents: write` (required to create releases)

**3. Build Process**
```bash
# Working directory: vscode-extension/
npm ci              # Install dependencies from lock file
npm run compile     # Compile TypeScript
npm run package     # Create VSIX with vsce
```

**4. Version Extraction and Validation**
- Extracts version from tag: `v0.2.0` → `0.2.0`
- Reads `package.json` version using Node.js
- Fails if mismatch detected (prevents accidental version inconsistencies)

**5. Pre-Release Detection**
```bash
# Extract minor version (middle number)
MINOR=$(echo $VERSION | cut -d. -f2)

# Check if odd (pre-release) or even (stable)
if [ $((MINOR % 2)) -eq 1 ]; then
  # Pre-release
else
  # Stable release
fi
```

**6. VSIX Verification**
- Expected filename: `paw-workflow-<version>.vsix`
- Fails if file not found (catches packaging failures)
- Outputs both full path and filename for later steps

**7. Changelog Generation**
- Action: `mikepenz/release-changelog-builder-action@v4`
- Configuration: `.github/release-changelog-config.json`
- Finds commits between current tag and previous tag
- Categorizes by PR labels (features, bugs, docs, maintenance)
- Fallback: "No changes in this release" if no commits found

**8. Release Existence Check**
```bash
# Check if release already exists (idempotency)
gh release view "$TAG_NAME" --json id 2>/dev/null
```
- Skips release creation if already exists
- Prevents duplicate releases on workflow re-runs

**9. GitHub Release Creation**
- Action: `softprops/action-gh-release@v1`
- Release name: Same as tag (e.g., `v0.2.0`)
- Description: Auto-generated changelog with installation instructions
- Assets: VSIX file
- Pre-release flag: Based on odd/even minor version
- Fail on unmatched files: Ensures VSIX path is correct

**10. Summary Output**
- Displays version, pre-release status, VSIX filename
- Provides direct link to created release

### PR Gate Workflow Steps

**1. Trigger Configuration**
- Event: Pull requests
- Target branches: `main`, `feature/**`
- Path filters: `vscode-extension/**`, `.github/chatmodes/**`, `scripts/**`, `.github/workflows/pr-checks.yml`

**2. Environment Setup**
- Runner: `ubuntu-latest`
- Node.js: Version 20
- Cache: npm cache for both root and extension lock files

**3. Dependency Installation**
```bash
# Root dependencies (for chatmode linting)
npm ci

# Extension dependencies (for tests)
cd vscode-extension && npm ci
```

**4. Extension Compilation**
```bash
cd vscode-extension
npm run compile
```

**5. Unit Tests with xvfb**
```bash
# Install virtual display server
sudo apt-get update
sudo apt-get install -y xvfb

# Run tests in virtual display
xvfb-run -a npm test
```

Environment variables:
- `DISPLAY=:99.0` - Tells VS Code to use virtual display

**6. Chatmode Linting**
```bash
# From root directory
npm run lint:chatmode:all
```

Checks all `.chatmode.md` files in `.github/chatmodes/`:
- Warning: 3,500+ tokens
- Error: 6,500+ tokens (fails workflow)

**7. Summary Output**
- Confirms which checks passed
- Displayed only on success

### Configuration Files

**`.github/release-changelog-config.json`**

Configures changelog generation behavior:

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
  "ignore_labels": ["ignore", "wontfix", "duplicate", "invalid"],
  "template": "...",  // Includes installation instructions and PAW attribution
  "max_pull_requests": 200,
  "max_back_track_time_days": 365
}
```

**Key Settings**:
- `categories`: Groups PRs by label into sections
- `ignore_labels`: Excludes PRs with these labels from changelog
- `template`: Wraps changelog with installation instructions and footer
- `pr_template`: Format for individual changelog entries
- `empty_template`: Message shown when no changes exist between releases

### Error Handling

**Version Mismatch**:
```
Error: package.json version (0.2.0) does not match tag version (0.3.0)
```
- Cause: Tag and package.json have different versions
- Fix: Update `package.json` to match tag, or delete tag and create correct one

**VSIX Not Found**:
```
Error: Expected VSIX file not found: paw-workflow-0.2.0.vsix
```
- Cause: Packaging failed silently or filename mismatch
- Fix: Check workflow logs for compilation errors; verify extension name in package.json

**Release Already Exists**:
```
Release already exists for tag v0.2.0, skipping
```
- Cause: Release was previously created for this tag (idempotency check)
- Result: Workflow completes successfully without creating duplicate
- Action: No fix needed - this is expected behavior

**PR Workflow Test Failures**:
- Extension tests fail: Review test output in workflow logs, fix code, push changes
- Chatmode linting fails: Reduce file size or split content into multiple files

## Usage Examples

### Example 1: First Stable Release

**Scenario**: Releasing version `0.2.0` as the first stable release after initial pre-release development.

**Steps**:

1. Update version in `vscode-extension/package.json`:
```json
{
  "version": "0.2.0"
}
```

2. Commit and tag:
```bash
git add vscode-extension/package.json
git commit -m "chore: release v0.2.0"
git tag v0.2.0
git push origin main
git push origin v0.2.0
```

3. Wait for workflow to complete (check Actions tab)

4. Verify release at `https://github.com/<owner>/<repo>/releases/tag/v0.2.0`:
   - Release is NOT marked as pre-release (even minor version)
   - VSIX file `paw-workflow-0.2.0.vsix` is attached
   - Changelog includes all commits since previous tag

### Example 2: Creating a Pre-Release

**Scenario**: Releasing version `0.3.0` for beta testing before stable `0.4.0`.

**Steps**:

1. Update version to `0.3.0` (odd minor = pre-release)
2. Commit and tag as shown above
3. Workflow automatically marks release as "Pre-release" on GitHub
4. Users see pre-release badge and can opt in to testing

**Key Difference**: GitHub displays a "Pre-release" badge, warning users this is not production-ready.

### Example 3: Recovering from Failed Release

**Scenario**: Workflow failed halfway through due to network issue. You need to re-run it.

**Steps**:

1. Navigate to Actions tab
2. Find the failed "Release VSIX" workflow run
3. Click "Re-run jobs" → "Re-run failed jobs"
4. Workflow detects release already exists (if it got that far) and skips creation
5. If release wasn't created, workflow completes normally

**Idempotency ensures safe re-runs without manual cleanup.**

### Example 4: Testing Extension from Release

**Scenario**: User wants to install extension from GitHub Releases instead of Marketplace.

**Steps**:

1. Visit repository Releases page
2. Find desired version (e.g., `v0.2.0`)
3. Download `paw-workflow-0.2.0.vsix` from Assets section
4. Install via command line:
```bash
code --install-extension ~/Downloads/paw-workflow-0.2.0.vsix
```
5. Reload VS Code
6. Verify extension appears in Extensions view

## Edge Cases and Limitations

### Edge Cases Handled

**No Previous Tags (First Release)**:
- Changelog includes all commits since repository initialization
- Generates comprehensive "what's in this release" summary
- Tested: Creates meaningful changelog even with no prior releases

**No Commits Between Releases**:
- Changelog shows "No changes in this release" message
- Release still created with VSIX attached
- Useful for fixing release metadata without code changes

**Concurrent Tag Pushes**:
- Multiple tags pushed simultaneously trigger independent workflow runs
- GitHub Actions queues jobs automatically
- Each release is tag-specific, preventing conflicts

**Re-Running Workflow**:
- Idempotency check skips release creation if already exists
- Safe to re-run for debugging without creating duplicates
- Workflow completes successfully (not an error)

**Path-Filtered PR Changes**:
- PR modifying only `README.md` doesn't trigger PR workflow
- PR modifying extension code triggers full test suite
- Reduces unnecessary workflow runs

### Known Limitations

**Version Format Requirements**:
- Tags must match `v*` pattern (e.g., `v0.2.0`)
- Non-matching tags (e.g., `release-1.0`, `v1.0`) are ignored
- Non-semver tags may cause version extraction to fail

**Manual Version Management**:
- Developers must manually update `package.json` version
- No automated version bumping from commit messages
- Prevents accidental releases but requires discipline

**Changelog Accuracy Depends on Labels**:
- Unlabeled PRs appear in changelog without categorization
- Incorrect labels result in mis-categorized changes
- Requires consistent PR labeling discipline

**No Marketplace Publishing**:
- Workflows only create GitHub Releases
- Manual publishing to VS Code Marketplace still required
- Future enhancement could automate marketplace publishing

**Single Platform VSIX**:
- Extension is platform-agnostic (no native dependencies)
- No separate builds for Windows/Linux/macOS
- Not applicable unless extension adds platform-specific code

**Test Environment Constraints**:
- Extension tests run in headless xvfb environment
- UI-heavy tests may behave differently than in real VS Code
- Most extension tests work fine, but complex UI interactions may need adjustments

## Testing Guide

### How to Test Release Workflow

**Prerequisites**:
- Repository with GitHub Actions enabled
- Extension code committed to a branch
- Version in `package.json` ready to be tagged

**Test Steps**:

1. **Update Version**: Edit `vscode-extension/package.json` to version `0.2.0`

2. **Commit**: 
   ```bash
   git add vscode-extension/package.json
   git commit -m "chore: release v0.2.0"
   ```

3. **Create Tag**:
   ```bash
   git tag v0.2.0
   ```

4. **Push Tag**:
   ```bash
   git push origin <branch-name>
   git push origin v0.2.0
   ```

5. **Monitor Workflow**:
   - Go to repository Actions tab
   - Find "Release VSIX" workflow run
   - Watch steps execute (should complete in 2-4 minutes)

6. **Verify Release Created**:
   - Navigate to repository Releases page
   - Confirm release `v0.2.0` exists
   - Check release is NOT marked as pre-release (even minor)
   - Verify VSIX file is attached

7. **Download and Install VSIX**:
   ```bash
   # Download paw-workflow-0.2.0.vsix from release
   code --install-extension ~/Downloads/paw-workflow-0.2.0.vsix
   ```

8. **Test Extension**:
   - Reload VS Code
   - Open Command Palette (`Ctrl+Shift+P`)
   - Search for "PAW: Initialize Work Item"
   - Verify command exists and executes

9. **Test Pre-Release**:
   - Change version to `0.3.0` (odd minor)
   - Repeat steps 2-6
   - Verify release IS marked as "Pre-release"

10. **Test Idempotency**:
    - Go to Actions tab
    - Find successful workflow run for `v0.2.0`
    - Click "Re-run jobs" → "Re-run all jobs"
    - Verify workflow completes successfully
    - Check logs show "Release already exists, skipping"
    - Verify no duplicate release was created

### How to Test PR Gate Workflow

**Prerequisites**:
- Repository with GitHub Actions enabled
- Extension code with unit tests
- Chatmode files in `.github/chatmodes/`

**Test Steps**:

1. **Create Test Branch**:
   ```bash
   git checkout -b test-pr-workflow
   ```

2. **Make Small Change** (e.g., add comment to `vscode-extension/src/extension.ts`):
   ```typescript
   // Test comment for PR workflow
   ```

3. **Commit and Push**:
   ```bash
   git add .
   git commit -m "test: verify PR workflow"
   git push origin test-pr-workflow
   ```

4. **Open Pull Request**:
   - Go to repository on GitHub
   - Click "Pull requests" → "New pull request"
   - Select `test-pr-workflow` → `main` (or target branch)
   - Create PR

5. **Verify Workflow Triggers**:
   - PR page should show "PR Checks / test" check
   - Status starts as yellow (in progress)
   - Click "Details" to view workflow logs

6. **Monitor Execution**:
   - Watch workflow steps complete:
     - Checkout code
     - Setup Node.js
     - Install dependencies (root and extension)
     - Compile extension
     - Run extension unit tests
     - Lint chatmode files
     - Summary

7. **Verify Success**:
   - Check status turns green ✅
   - Review summary in workflow logs

8. **Test Failure Scenario - Failing Test**:
   - Add a failing test to extension test suite
   - Commit and push to PR branch
   - Verify workflow fails with red X ❌
   - Check logs show which test failed
   - Fix test and push - verify workflow re-runs and passes

9. **Test Failure Scenario - Oversized Chatmode**:
   - Create a chatmode file with >6,500 tokens
   - Commit and push
   - Verify workflow fails
   - Check logs show token count error
   - Fix file and verify workflow passes

10. **Test Path Filtering**:
    - Create new branch
    - Modify only `README.md` (outside path filters)
    - Open PR
    - Verify PR workflow does NOT run
    - Add change to `vscode-extension/` file
    - Push commit
    - Verify workflow NOW runs

## Migration and Compatibility

### For Existing PAW Repository Users

**Initial Setup** (one-time):

1. **Merge Workflows**: Merge the feature branch containing `.github/workflows/release.yml` and `.github/workflows/pr-checks.yml` to your main branch

2. **Configure Branch Protection** (optional but recommended):
   - Go to repository Settings → Branches
   - Add branch protection rule for `main`
   - Enable "Require status checks to pass before merging"
   - Select "PR Checks / test" as required check
   - PRs now require passing tests and linting before merge

3. **Create Initial Release**:
   - Ensure `vscode-extension/package.json` version reflects current state (e.g., `0.0.1`)
   - Create initial tag: `git tag v0.0.1 && git push origin v0.0.1`
   - Verify workflow creates first release
   - This establishes baseline for future changelog generation

**No Breaking Changes**:
- Existing extension code requires no modifications
- Existing npm scripts (`compile`, `test`, `package`) work as-is
- Developers can continue local development workflows unchanged
- GitHub Actions workflows are additive (don't change existing processes)

### Compatibility Notes

**Node.js Version**:
- Workflows use Node.js 20 (current LTS)
- Extension code compatible with Node.js 16+ (existing requirement)
- No Node.js upgrade required for local development

**VS Code Version**:
- Extension requires VS Code 1.85.0+ (existing requirement)
- Released VSIX files work on any compatible VS Code version
- No version constraint changes

**GitHub Actions**:
- Actions used are actively maintained with stable APIs:
  - `actions/checkout@v4` - GitHub official, stable
  - `actions/setup-node@v4` - GitHub official, stable
  - `mikepenz/release-changelog-builder-action@v4` - 3rd party, v4 stable
  - `softprops/action-gh-release@v1` - 3rd party, v1 stable
- Major version pinning prevents breaking changes
- Update dependency: Change version in workflow YAML files

**Repository Permissions**:
- Workflows use `GITHUB_TOKEN` (automatically provided)
- No manual secret configuration required
- Works on any repository with GitHub Actions enabled

### Rollback Procedure

**If Release Workflow Malfunctions**:

1. **Delete Incorrect Release**:
   - Go to Releases page
   - Find incorrect release
   - Click "Delete release"

2. **Delete Tag**:
   ```bash
   git push origin --delete v0.x.x
   git tag -d v0.x.x
   ```

3. **Fix Issue** (update workflow YAML or extension code)

4. **Recreate Tag**:
   ```bash
   git tag v0.x.x
   git push origin v0.x.x
   ```

**If PR Workflow Blocks Valid PRs**:

1. **Temporary**: Merge PR with admin override (bypass branch protection)

2. **Permanent Fix**: 
   - Fix workflow issue in `.github/workflows/pr-checks.yml`
   - Push fix to main branch
   - Future PRs use corrected workflow

**Complete Removal** (not recommended):
```bash
# Remove workflows
git rm .github/workflows/release.yml
git rm .github/workflows/pr-checks.yml
git rm .github/release-changelog-config.json
git commit -m "chore: remove GitHub Actions workflows"
git push origin main
```

## References

### Project Artifacts
- **Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/64
- **Specification**: `.paw/work/github-actions-vsix-release/Spec.md`
- **Implementation Plan**: `.paw/work/github-actions-vsix-release/ImplementationPlan.md`
- **Code Research**: `.paw/work/github-actions-vsix-release/CodeResearch.md`
- **Spec Research**: `.paw/work/github-actions-vsix-release/SpecResearch.md`

### External Documentation
- **GitHub Actions**: https://docs.github.com/en/actions
- **VS Code Extension Publishing**: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- **VS Code Pre-Release Extensions**: https://code.visualstudio.com/api/working-with-extensions/publishing-extension#prerelease-extensions
- **Semantic Versioning**: https://semver.org/
- **Changelog Builder Action**: https://github.com/mikepenz/release-changelog-builder-action
- **GitHub Release Action**: https://github.com/softprops/action-gh-release
- **VSIX Packaging (vsce)**: https://github.com/microsoft/vscode-vsce

### Related PAW Documentation
- **Main README**: `README.md` - Overview of PAW methodology
- **Development Guide**: `DEVELOPING.md` - Local development setup and scripts
- **Extension README**: `vscode-extension/README.md` - Extension-specific documentation
