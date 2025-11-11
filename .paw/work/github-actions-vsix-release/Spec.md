# Feature Specification: GitHub Actions VSIX Release

**Branch**: feature/github-actions-vsix-release  |  **Created**: 2025-11-11  |  **Status**: Draft
**Input Brief**: Automatically build and publish VS Code extension VSIX to GitHub Releases when version tags are created, with auto-generated changelogs.

## User Scenarios & Testing

### User Story P1 – Automated VSIX Release on Tag
**Narrative**: As a developer, when I create and push a version tag (e.g., `v0.2.0`), the GitHub Actions workflow automatically builds the extension, packages it as a VSIX file, creates a GitHub Release for that tag, and attaches the VSIX as a downloadable asset.

**Independent Test**: Push a new `v*` tag and verify a GitHub Release is created with an attached VSIX file within a reasonable timeframe.

**Acceptance Scenarios**:
1. Given I have committed extension code, When I create and push tag `v0.2.0`, Then a GitHub Release titled "v0.2.0" is created with a VSIX asset attached.
2. Given I create tag `v0.3.1` (odd minor = pre-release), When the workflow runs, Then a GitHub Release is created and marked as "pre-release".
3. Given I create tag `v0.4.0` (even minor = release), When the workflow runs, Then a GitHub Release is created as a standard release (not pre-release).
4. Given a release already exists for tag `v0.2.0`, When I re-trigger the workflow, Then the workflow skips release creation without error.

### User Story P2 – Automatic Changelog Generation
**Narrative**: As a user, when I view a GitHub Release, I can read an auto-generated changelog that summarizes commits made since the previous release, helping me understand what changed in this version.

**Independent Test**: View any release and verify the release description contains a changelog with commit information from the period between this tag and the previous tag.

**Acceptance Scenarios**:
1. Given this is the first release (`v0.1.0`), When the workflow creates the release, Then the changelog includes all commits since the beginning of the repository.
2. Given a previous release exists (`v0.1.0`), When I create tag `v0.2.0`, Then the changelog includes only commits between `v0.1.0` and `v0.2.0`.
3. Given commits exist with conventional commit format, When the changelog is generated, Then commits are organized by type (feat, fix, etc.) for readability.

### User Story P3 – Easy Extension Discovery and Download
**Narrative**: As a user who wants to install the extension before marketplace publication, I can navigate to the GitHub repository's Releases page, find the latest version, and download the VSIX file to manually install in VS Code.

**Independent Test**: Navigate to the repository's Releases page, locate the latest release, download the VSIX asset, and successfully install it in VS Code using "Install from VSIX".

**Acceptance Scenarios**:
1. Given multiple releases exist, When I visit the Releases page, Then the most recent release is displayed first with clear version identification.
2. Given I download a VSIX file from a release, When I examine the filename, Then it includes the version number for clarity (e.g., `paw-vscode-0.2.0.vsix`).
3. Given I download a VSIX from a release, When I install it in VS Code, Then the extension installs successfully without errors.

### Edge Cases
- **Non-matching tag patterns**: Tags not matching `v*` pattern (e.g., `release-1.0`, `test-tag`) should not trigger the workflow.
- **Invalid version format**: Tags like `v1.0` or `vabc` should either skip processing or fail gracefully with clear error messages.
- **Build failures**: If extension compilation or VSIX packaging fails, the workflow should fail without creating a partial release.
- **Network failures**: If GitHub API calls fail during release creation, the workflow should retry or fail with actionable error messages.
- **Empty changelog**: If no commits exist between releases (unlikely), the changelog should indicate "No changes" rather than being empty.
- **Concurrent tag pushes**: If multiple tags are pushed simultaneously, each should trigger independent workflow runs without conflict.

## Requirements

### Functional Requirements
- **FR-001**: Workflow triggers only when tags matching pattern `v*` are pushed to the repository. (Stories: P1)
- **FR-002**: Workflow detects pre-release versions by checking if the minor version number is odd (e.g., `v0.3.x` is pre-release, `v0.4.x` is release). (Stories: P1)
- **FR-003**: Workflow builds the VS Code extension from source and packages it as a VSIX file. (Stories: P1, P3)
- **FR-004**: Workflow creates a GitHub Release associated with the pushed tag. (Stories: P1)
- **FR-005**: Workflow attaches the packaged VSIX file as an asset to the GitHub Release. (Stories: P1, P3)
- **FR-006**: Workflow marks GitHub Releases as "pre-release" when the version has an odd minor number, otherwise marks as standard release. (Stories: P1)
- **FR-007**: Workflow skips release creation if a release already exists for the given tag. (Stories: P1)
- **FR-008**: Workflow generates a changelog based on commit history between the current tag and the previous tag. (Stories: P2)
- **FR-009**: Workflow includes the generated changelog in the GitHub Release description. (Stories: P2)
- **FR-010**: VSIX filename includes the version number extracted from the tag. (Stories: P3)

### Key Entities
- **Tag**: Git reference matching `v*` pattern, containing semantic version (e.g., `v0.2.0`, `v1.3.5`).
- **GitHub Release**: Platform entity associated with a tag, containing title, description, pre-release flag, and attached assets.
- **VSIX Asset**: Binary file attached to a release, representing the packaged VS Code extension.
- **Changelog**: Auto-generated text summarizing commits between releases, included in release description.

### Cross-Cutting / Non-Functional
- **Reliability**: Workflow should handle transient failures (network issues) with appropriate retries.
- **Idempotency**: Re-running the workflow for the same tag should produce consistent results (skip if release exists).
- **Observability**: Workflow logs should clearly indicate each step (build, package, release creation) for debugging.
- **Performance**: Workflow should complete within reasonable time (target: under 5 minutes for typical builds).

## Success Criteria
- **SC-001**: When a tag matching `v*` is pushed, a corresponding GitHub Release is created automatically without manual intervention. (FR-001, FR-004)
- **SC-002**: Every GitHub Release created by the workflow has an attached VSIX file that can be downloaded and installed in VS Code. (FR-003, FR-005, FR-010)
- **SC-003**: Releases for tags with odd minor versions (e.g., `v0.3.0`) are marked as pre-release; even minor versions (e.g., `v0.2.0`) are standard releases. (FR-002, FR-006)
- **SC-004**: Every GitHub Release includes a changelog in its description showing commits since the previous release. (FR-008, FR-009)
- **SC-005**: Re-running the workflow for an existing release does not create duplicate releases or fail. (FR-007)
- **SC-006**: Users can navigate to the Releases page, download any VSIX file, and install it successfully in VS Code. (FR-010)

## Assumptions
- **Changelog tool selection**: The specific GitHub Action or tool used to generate changelogs is deferred to implementation; any standard changelog generator that parses commit history is acceptable.
- **Changelog format**: If conventional commits are used, group by type (feat, fix, etc.); otherwise, chronological commit list is sufficient.
- **Release naming convention**: GitHub Release title matches the tag name (e.g., tag `v0.2.0` creates release "v0.2.0").
- **VSIX naming convention**: Filename format is `<extension-name>-<version>.vsix` (e.g., `paw-vscode-0.2.0.vsix`), where extension name is derived from package.json.
- **First release handling**: For the initial release (no previous tags), include all commits since repository initialization in the changelog.
- **Build command details**: The exact commands to compile TypeScript, install dependencies, and package the VSIX are implementation details deferred to code research phase.
- **Workflow file location**: Standard GitHub Actions location `.github/workflows/release.yml` or similar descriptive name.
- **Error handling strategy**: On any build or packaging error, fail the workflow without creating a partial release; developers must fix issues and re-tag if necessary.
- **Authentication**: GitHub Actions will use built-in `GITHUB_TOKEN` for creating releases and uploading assets.
- **Tag creation location**: Tags can be created locally and pushed, or created via GitHub UI/API; workflow treats them identically.

## Scope

**In Scope**:
- Automatic GitHub Release creation when `v*` tags are pushed
- Building and packaging VS Code extension as VSIX
- Attaching VSIX to GitHub Releases as downloadable asset
- Auto-generating changelog from commit history
- Pre-release detection based on odd/even minor version numbers
- Idempotent workflow execution (skip if release exists)

**Out of Scope**:
- Publishing extension to Visual Studio Code Marketplace (future enhancement)
- Manual release creation workflows or UI
- Support for non-semver tag formats
- Release editing or deletion via automation
- Automated testing before release creation (assumed tests run in separate CI)
- Multi-platform VSIX variants (extension is platform-agnostic)
- Release notifications beyond GitHub's built-in mechanisms
- Rollback or release retraction automation
- Support for tags not matching `v*` pattern

## Dependencies
- GitHub Actions platform availability and execution environment
- Git repository with tags representing versions
- VS Code extension source code in `vscode-extension` directory
- Node.js and npm tooling for building TypeScript extension
- VSIX packaging tooling (e.g., `vsce` or equivalent)
- GitHub repository permissions allowing workflow to create releases

## Risks & Mitigations
- **Risk**: Workflow creates releases for invalid or test tags.
  **Impact**: Cluttered releases page with unwanted versions.
  **Mitigation**: Strict tag pattern matching (`v*` only) and recommend tag naming conventions in documentation.

- **Risk**: Build failures leave no artifact, making debugging difficult.
  **Impact**: Developers cannot diagnose why a release was not created.
  **Mitigation**: Ensure workflow logs each step clearly; consider uploading build logs as artifacts on failure.

- **Risk**: Changelog generation fails if commit history is malformed or tags are missing.
  **Impact**: Releases created without changelogs or with incomplete information.
  **Mitigation**: Use changelog tools that gracefully handle edge cases (missing tags, empty ranges); include fallback message if generation fails.

- **Risk**: VSIX file size exceeds GitHub's asset upload limits.
  **Impact**: Release creation fails after build succeeds.
  **Mitigation**: GitHub allows up to 2GB per asset (extensions are typically <10MB); monitor extension size growth; fail workflow if size exceeds reasonable threshold.

- **Risk**: Concurrent workflow runs for multiple tags may conflict.
  **Impact**: Race conditions or failed API calls during release creation.
  **Mitigation**: GitHub Actions queues jobs by default; releases are tag-specific so conflicts are unlikely. Idempotency (skip if exists) handles edge cases.

- **Risk**: Pre-release detection logic miscategorizes releases if version format is non-standard.
  **Impact**: Users receive unexpected pre-release or stable versions.
  **Mitigation**: Document version numbering convention clearly; validate tag format early in workflow and fail if non-compliant.

## References
- **Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/64
- **Research**: Skipped (proceeded with documented assumptions)
- **External**: 
  - VS Code Extension Versioning Best Practices: https://code.visualstudio.com/api/working-with-extensions/publishing-extension#prerelease-extensions
  - GitHub Actions Documentation: https://docs.github.com/en/actions
  - Semantic Versioning: https://semver.org/

## Glossary
- **VSIX**: Visual Studio Extension file format, a ZIP archive containing the extension code and manifest.
- **vsce**: Official command-line tool for packaging and publishing VS Code extensions.
- **Conventional Commits**: Commit message format (`feat:`, `fix:`, etc.) that enables structured changelogs.
- **Pre-release**: GitHub Release flag indicating a non-production-ready version; VS Code uses odd minor versions to denote pre-releases.
- **Semantic Versioning (semver)**: Version numbering scheme `MAJOR.MINOR.PATCH` where increments convey compatibility and change significance.
