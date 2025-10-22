# Feature Specification: PAW Directory Restructure

**Branch**: feature/move-to-paw-directory  |  **Created**: 2025-10-22  |  **Status**: Draft
**Input Brief**: Move PAW artifacts from `docs/agents/<branch>/` to `.paw/work/<feature-slug>/` with user-chosen persistent slugs

## User Scenarios & Testing

### User Story P1 – Artifact Storage in New Location
**Narrative**: As a PAW user, when agents create or read workflow artifacts (Spec.md, ImplementationPlan.md, etc.), they use the new `.paw/work/<feature-slug>/` directory structure so my work is organized by meaningful feature names instead of transient branch names.

**Independent Test**: Create a new feature using any PAW agent; verify artifacts appear in `.paw/work/<slug>/` rather than `docs/agents/<branch>/`.

**Acceptance Scenarios**:
1. Given a user starts a new PAW workflow with a feature slug "auth-system", When any agent creates an artifact (e.g., Spec.md), Then the file is created at `.paw/work/auth-system/Spec.md`
2. Given artifacts exist at `.paw/work/dashboard-redesign/`, When an agent reads WorkflowContext.md, Then it correctly locates and reads `.paw/work/dashboard-redesign/WorkflowContext.md`
3. Given a user has prompts to generate, When agents create prompt files, Then they are stored in `.paw/work/<slug>/prompts/` subdirectory
4. Given multiple concurrent features exist, When a user lists `.paw/work/`, Then they see a directory per feature slug with meaningful names

### User Story P2 – Feature Slug Auto-Generation
**Narrative**: As a PAW user, when I start a new workflow without specifying a feature slug, agents automatically generate one from available context (Work Title, GitHub Issue title, or brief description) so I can proceed without manual slug creation, and the slug aligns with the Work Title when both are being generated.

**Independent Test**: Invoke Spec Agent without Work Title or slug; verify both are auto-generated and aligned.

**Acceptance Scenarios**:
1. Given a user provides Work Title "User Authentication System", When the agent initializes WorkflowContext.md without an explicit slug, Then a slug "user-authentication-system" is auto-generated to match the Work Title
2. Given a GitHub Issue with title "Add OAuth Support" but no Work Title, When the agent creates WorkflowContext.md, Then both Work Title "OAuth Support" and slug "oauth-support" are auto-generated from the issue
3. Given neither Work Title nor slug are provided, When the agent analyzes the GitHub Issue or brief, Then it generates both Work Title and matching slug from the same source context
4. Given an auto-generated slug is created, When the agent presents it to the user, Then the user is informed of the generated slug and can proceed or override it
5. Given a Work Title contains special characters "Fix Bug: API/Rate-Limit (v2)", When auto-generating a slug, Then special characters are normalized to "fix-bug-api-rate-limit-v2"
6. Given Work Title is auto-generated as "Auth System", When slug is also auto-generated, Then it matches as "auth-system"

### User Story P3 – Feature Slug Customization
**Narrative**: As a PAW user, I can explicitly specify or override feature slugs at workflow initialization so I have control over naming when auto-generation doesn't meet my needs.

**Independent Test**: Provide an explicit slug parameter when starting a workflow; verify it's used instead of auto-generation.

**Acceptance Scenarios**:
1. Given a user provides explicit slug "auth" when starting a workflow, When WorkflowContext.md is created, Then it uses "auth" regardless of Work Title
2. Given an auto-generated slug "very-long-feature-name-from-issue", When the user requests to change it to "feature-short", Then WorkflowContext.md is updated and artifacts move to `.paw/work/feature-short/`
3. Given a user specifies slug "MyFeature" with mixed case, When the agent normalizes it, Then it becomes "myfeature" (lowercase)
4. Given a workflow is in progress with slug "temp-name", When the user requests to rename it to "final-name", Then agents update WorkflowContext.md and inform the user about manual file relocation

### User Story P4 – WorkflowContext Tracks Slug and Branch
**Narrative**: As a PAW user, WorkflowContext.md captures both my feature slug and target branch so agents have all necessary routing information for artifact paths and git operations.

**Independent Test**: Create WorkflowContext.md with both fields; verify agents use slug for artifact paths and branch for git operations.

**Acceptance Scenarios**:
1. Given a new workflow starts, When WorkflowContext.md is created, Then it contains both "Feature Slug: auth-system" and "Target Branch: feature/oauth-implementation"
2. Given WorkflowContext.md has slug "api-refactor" and branch "feature/v2-api", When an agent reads artifacts, Then it uses `.paw/work/api-refactor/Spec.md` as the path
3. Given WorkflowContext.md exists with both fields, When an agent creates a Planning PR, Then it uses the target branch for git operations
4. Given an old WorkflowContext.md lacks a Feature Slug field, When an agent reads it, Then the agent prompts for a slug or auto-generates one from the Work Title

### User Story P5 – Slug Validation and Conflict Detection
**Narrative**: As a PAW user, when I provide or agents generate a feature slug, it's validated for filesystem compatibility and uniqueness so I avoid errors from invalid characters or naming conflicts.

**Independent Test**: Attempt to create a slug with invalid characters or that conflicts with existing slugs; verify appropriate handling.

**Acceptance Scenarios**:
1. Given a user specifies slug "my/feature", When validation occurs, Then it's rejected with error "Slug cannot contain path separators (/)"
2. Given a slug contains only valid characters (lowercase, numbers, hyphens), When validation occurs, Then it's accepted without modification
3. Given a slug "feature--name__test", When normalized, Then consecutive special characters are collapsed to "feature-name-test"
4. Given a directory `.paw/work/auth-system/` already exists, When a user provides slug "auth-system", Then the agent suggests an alternative (e.g., "auth-system-2") and prompts user to choose
5. Given a directory `.paw/work/auth-system/` already exists, When an agent auto-generates slug "auth-system", Then it automatically selects a unique variant (e.g., "auth-system-2") without prompting
6. Given existing slug "user-profile", When a user provides similar slug "user-profiles", Then the agent warns about similarity and suggests confirming or choosing a more distinct name
7. Given existing slug "user-profile", When an agent auto-generates similar slug "user-profiles", Then it automatically selects a more distinct variant (e.g., "user-profiles-feature")
8. Given multiple conflicts exist ("auth-1", "auth-2"), When generating a unique slug, Then the agent selects the next available number (e.g., "auth-3")

### User Story P6 – Migration Guidance
**Narrative**: As a PAW user with existing work in `docs/agents/<branch>/`, I receive clear guidance on manual migration to the new structure so I can transition my workflows without data loss.

**Independent Test**: Read migration documentation; successfully move an existing workflow from old to new location.

**Acceptance Scenarios**:
1. Given the PAW specification documentation, When a user reads the migration section, Then it clearly states this is a breaking change requiring manual migration
2. Given migration steps are provided, When a user follows them, Then they include: (a) create `.paw/work/<chosen-slug>/`, (b) copy artifacts, (c) update WorkflowContext.md with Feature Slug field
3. Given a user has work at `docs/agents/feature/old-branch/`, When they migrate, Then the documentation warns about updating any hardcoded paths in custom scripts or bookmarks
4. Given migration is complete, When the user re-runs PAW agents, Then they correctly locate artifacts in the new location

### Edge Cases
- **Empty/whitespace-only slugs**: Rejected with clear error requiring non-empty slug
- **Reserved names**: System validates against reserved directory names (e.g., `.`, `..`, `node_modules`)
- **Extremely long slugs**: Enforced maximum length (e.g., 100 characters) to prevent filesystem issues
- **Unicode characters**: Normalized to ASCII equivalents or rejected with clear guidance
- **Leading/trailing hyphens or underscores**: Trimmed during normalization
- **Exact slug conflicts**: User-provided slugs prompt for alternative; auto-generated slugs select unique variant automatically
- **Similar slug detection**: Similarity threshold determines when warning is shown (user-provided) or variant selected (auto-generated)
- **Multiple sequential conflicts**: Numeric suffixes increment until unique slug found (auth → auth-2 → auth-3)
- **Slug similarity to own Work Title**: Allowed; similarity detection only checks against other existing slugs
- **Missing .paw directory**: Automatically created by agents when initializing first workflow
- **WorkflowContext.md corruption**: Agents detect invalid format and prompt for re-initialization
- **Case-only differences**: "Auth" and "auth" treated as same slug due to normalization to lowercase

## Requirements

### Functional Requirements
- FR-001: All PAW agents must store workflow artifacts in `.paw/work/<feature-slug>/` directory structure (Stories: P1)
- FR-002: Agents must create subdirectories (e.g., `prompts/`) within `.paw/work/<feature-slug>/` as needed (Stories: P1)
- FR-003: Agents must auto-generate feature slugs from available context (Work Title, GitHub Issue title, or brief) when not explicitly provided (Stories: P2)
- FR-004: When both Work Title and slug are auto-generated, they must be derived from the same source and align with each other (Stories: P2)
- FR-005: Slug auto-generation must normalize text to lowercase, replace spaces and special characters with hyphens, and remove invalid characters (Stories: P2, P5)
- FR-006: Users must be able to specify or override feature slugs at workflow initialization (Stories: P3)
- FR-007: Agents must allow slug modification during workflow with guidance on file relocation (Stories: P3)
- FR-008: WorkflowContext.md must include both "Feature Slug" and "Target Branch" fields (Stories: P4)
- FR-009: Agents must use feature slug for artifact path resolution and target branch for git operations (Stories: P4)
- FR-010: When WorkflowContext.md lacks Feature Slug, agents must prompt for or auto-generate one (Stories: P4)
- FR-011: Slugs must be validated to allow only lowercase letters, numbers, hyphens, and underscores (Stories: P5)
- FR-012: Slug validation must enforce maximum length constraint and reject path separators (Stories: P5)
- FR-013: Agents must check for slug conflicts by verifying `.paw/work/<slug>/` directory does not already exist (Stories: P5)
- FR-014: When a user-provided slug conflicts with existing directory, agents must suggest alternative and prompt user to choose (Stories: P5)
- FR-015: When an auto-generated slug conflicts with existing directory, agents must automatically select unique variant without user prompt (Stories: P5)
- FR-016: Agents must detect similar slugs (fuzzy match) and warn users of potential confusion when slug is user-provided (Stories: P5)
- FR-017: When auto-generated slug is similar to existing slug, agents must automatically select more distinct variant (Stories: P5)
- FR-018: Slug conflict resolution must use numeric suffixes (-2, -3, etc.) or descriptive differentiators to ensure uniqueness (Stories: P5)
- FR-019: PAW specification documentation must include migration guide for users with existing work (Stories: P6)
- FR-020: Migration guide must clearly state manual migration requirement and provide step-by-step instructions (Stories: P6)

### Key Entities
- **Feature Slug**: User-chosen or auto-generated identifier for workflow artifacts (lowercase alphanumeric with hyphens/underscores)
- **Artifact Path**: File system path `.paw/work/<feature-slug>/<artifact-name>` where workflow documents are stored
- **WorkflowContext.md**: Centralized parameter file containing Feature Slug, Target Branch, GitHub Issue, and other workflow metadata

### Cross-Cutting Requirements
- **Path Consistency**: All agents must use identical path resolution logic when computing artifact locations
- **User Communication**: Agents must clearly communicate slug auto-generation, validation failures, and migration requirements
- **Filesystem Safety**: All slug operations must be safe for cross-platform filesystems (Windows, macOS, Linux)
- **Graceful Degradation**: Agents must handle missing `.paw/` directory by creating it automatically

## Success Criteria
- SC-001: Agent creates artifact at `.paw/work/test-feature/Spec.md` when feature slug is "test-feature" (FR-001)
- SC-002: Auto-generated slug from Work Title "API Refactor v2" equals "api-refactor-v2" (FR-003, FR-005)
- SC-003: When neither Work Title nor slug provided, both are generated from GitHub Issue title and match (e.g., issue "Add Auth" → Work Title "Auth" & slug "auth") (FR-003, FR-004)
- SC-004: User-specified slug "custom-name" overrides auto-generation regardless of Work Title (FR-006)
- SC-005: WorkflowContext.md contains both `Feature Slug: <slug>` and `Target Branch: <branch>` entries (FR-008)
- SC-006: Slug "my/invalid path!" is rejected with error message listing invalid characters (FR-011, FR-012)
- SC-007: When user provides slug "auth" and `.paw/work/auth/` exists, agent suggests "auth-2" and prompts for confirmation (FR-013, FR-014, FR-018)
- SC-008: When agent auto-generates slug "auth" and `.paw/work/auth/` exists, agent automatically uses "auth-2" without prompting (FR-013, FR-015, FR-018)
- SC-009: When user provides slug "user-profile" and "user-profiles" exists, agent warns about similarity (FR-016)
- SC-010: When agent auto-generates slug "user-profile" and "user-profiles" exists, agent selects distinct variant like "user-profile-feature" (FR-017)
- SC-011: Migration guide in paw-specification.md includes minimum 3-step process for moving artifacts (FR-019, FR-020)
- SC-012: Agent successfully reads artifact from `.paw/work/auth-system/ImplementationPlan.md` when slug is "auth-system" (FR-001, FR-009)

## Assumptions
- Filesystem supports directory names up to 255 characters (standard across modern systems)
- Users have write permissions to create `.paw/` directory in repository root
- Git ignores `.paw/` directory or users configure `.gitignore` appropriately based on their workflow needs
- Slug normalization uses standard URL slug conventions (lowercase, hyphens for spaces)
- Agents have access to filesystem operations for directory creation and existence checking
- WorkflowContext.md format is extensible (adding Feature Slug doesn't break existing field parsing)
- Migration is one-time event; users don't need to maintain dual directory structure
- `.paw/archive/` directory creation and archival functionality is deferred to future work
- Similarity detection uses simple string distance metrics (e.g., edit distance, common prefixes) rather than semantic analysis
- Work Title is optional and can be auto-generated by agents when not provided
- When generating both Work Title and slug, agents derive them from the same source for consistency

## Scope

**In Scope**:
- Changing artifact storage location from `docs/agents/<branch>/` to `.paw/work/<feature-slug>/`
- Adding Feature Slug field to WorkflowContext.md
- Auto-generation of slugs from Work Title or GitHub Issue title
- Slug validation and normalization logic
- User override/customization of feature slugs
- Migration documentation for existing users
- Updating all PAW agent implementations to use new paths

**Out of Scope**:
- Backward compatibility with `docs/agents/<branch>/` locations
- Automated migration tooling or scripts
- Archive functionality in `.paw/archive/` (future work)
- Slug uniqueness enforcement across branches (user responsibility)
- Custom slug templates or patterns beyond normalization
- Integration with external project management systems
- Version control of WorkflowContext.md conflicts
- Bulk renaming or reorganization of existing slugs

## Dependencies
- PAW agent implementations (all 9 chatmode files requiring updates):
  - PAW-01A Spec Agent
  - PAW-01B Spec Research Agent
  - PAW-02A Code Researcher
  - PAW-02B Implementation Plan Agent
  - PAW-03A Implementer
  - PAW-03B Implementation Review Agent
  - PAW-04 Documenter
  - PAW-05 PR Agent
  - PAW-X Status Update Agent
  - (Approximately 50+ hardcoded path references total across all agents)
- WorkflowContext.md format specification
- PAW specification document (paw-specification.md) for migration guide additions
- Filesystem access for directory creation and path operations

## Risks & Mitigations

**Risk**: Users with in-progress work in `docs/agents/<branch>/` experience disruption during upgrade
- **Impact**: High - Could block users mid-workflow
- **Mitigation**: Clear breaking change announcement, detailed migration guide, recommend completing in-flight work before upgrade

**Risk**: Slug normalization creates conflicts (e.g., "My-Feature" and "my_feature" both normalize to "my-feature")
- **Impact**: Medium - Could cause unexpected directory conflicts
- **Mitigation**: Document normalization rules clearly, warn on conflicts, recommend slug preview before creation

**Risk**: Different agents implement path resolution inconsistently
- **Impact**: High - Artifacts could be scattered across locations
- **Mitigation**: Centralize path resolution logic in agent instructions, comprehensive testing across all 9 agents

**Risk**: Cross-platform filesystem incompatibilities (Windows path limits, case sensitivity)
- **Impact**: Medium - Could cause errors on specific operating systems
- **Mitigation**: Conservative slug validation, cross-platform testing, document platform-specific limitations

**Risk**: Users forget to update custom scripts or tooling referencing old paths
- **Impact**: Low - Breaks user automation but not core PAW
- **Mitigation**: Highlight in migration guide, provide search patterns for finding hardcoded paths

**Risk**: PR descriptions with hardcoded artifact links become outdated
- **Impact**: Low - Links in PR descriptions will point to old `docs/agents/<branch>/` paths
- **Mitigation**: Update PR Agent to generate links using new `.paw/work/<slug>/` paths, document link format change in migration guide

## References
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/19
- Research: docs/agents/feature/move-to-paw-directory/SpecResearch.md
- External: None

## Glossary
- **Feature Slug**: Normalized, filesystem-safe identifier for workflow artifacts (e.g., "auth-system")
- **Target Branch**: Git branch containing completed work (e.g., "feature/add-authentication")
- **Artifact**: PAW workflow document (Spec.md, ImplementationPlan.md, CodeResearch.md, etc.)
- **Normalization**: Process of converting text to lowercase, replacing spaces/special chars with hyphens
- **WorkflowContext.md**: Central parameter file storing Feature Slug, Target Branch, and other metadata
