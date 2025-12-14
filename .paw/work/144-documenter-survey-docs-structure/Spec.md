# Feature Specification: Documenter Survey Docs Structure

**Branch**: feature/144-documenter-survey-docs-structure  |  **Created**: 2025-12-13  |  **Status**: Draft
**Input Brief**: Add documentation structure survey step to Documenter agent before documentation creation

## Overview

When implementing new features, documentation should not only capture technical details but also integrate seamlessly with how users discover and navigate project documentation. Currently, the Documenter agent creates comprehensive technical reference content in Docs.md and updates high-visibility files like README and CHANGELOG, but it lacks awareness of where feature-specific guides should live within a project's broader documentation architecture. This gap means feature documentation remains isolated from the project's natural discovery paths—users browsing existing guides or navigating documentation frameworks may never encounter new feature documentation.

Consider a project with a structured documentation site using MkDocs, containing user guides at `docs/guide/`, reference material at `docs/reference/`, and specifications at `docs/specification/`. When a new workflow feature is implemented, users would naturally expect to find a corresponding guide alongside existing workflow documentation. Without surveying this structure, the Documenter might create excellent technical documentation in Docs.md and update the README, yet miss the opportunity to add `docs/guide/new-workflow.md` where users would intuitively look. The feature becomes documented but not discoverable through the project's established navigation patterns.

This enhancement adds an explicit survey step to the Documenter agent's process—a moment to explore the project's documentation landscape before creating content. The survey identifies documentation frameworks in use (MkDocs, Docusaurus, plain markdown), discovers existing content organization patterns (guide directories, reference sections, navigation files), and determines where new feature documentation would naturally fit. Armed with this structural understanding, the agent can then create Docs.md with appropriate depth while also generating properly-integrated guide pages that appear in navigation menus and sit alongside related existing content.

The result is documentation that works at two levels: Docs.md remains the authoritative technical reference with full implementation detail, while project-integrated guides provide user-facing content at the appropriate detail level, discoverable through the project's existing navigation structure. Features become documented both comprehensively and accessibly.

## Objectives

- Enable the Documenter agent to understand a project's documentation structure before creating documentation (Rationale: informed decisions about where and what to create)
- Identify documentation frameworks and their configuration files to understand navigation patterns (Rationale: guides must integrate with existing nav to be discoverable)
- Discover existing content organization to determine appropriate locations for new feature documentation (Rationale: consistency with project documentation style)
- Create user-facing guide pages when projects have appropriate documentation structures (Rationale: reduces README bloat, improves discoverability)
- Maintain Docs.md as the authoritative technical reference while adding complementary project-integrated documentation (Rationale: additive enhancement, not replacement)
- Update navigation configuration when new guides are added (Rationale: guides without nav links are effectively invisible)

## User Scenarios & Testing

### User Story P1 – Documentation Structure Survey
Narrative: As a developer using PAW, when the Documenter agent creates feature documentation, it first surveys my project's documentation structure to understand where guides, references, and navigation are organized—so that new documentation integrates with my existing patterns rather than existing in isolation.

Independent Test: After completing documentation, verify a survey findings section appears in Docs.md documenting the discovered structure.

Acceptance Scenarios:
1. Given a project with MkDocs configuration (mkdocs.yml exists), When the Documenter runs the survey step, Then it identifies MkDocs as the framework and discovers the docs source directory and nav structure.
2. Given a project with a `docs/guide/` directory containing existing guides, When the Documenter runs the survey step, Then it identifies this as the appropriate location for user-facing feature guides.
3. Given a project with no documentation framework (only README.md), When the Documenter runs the survey step, Then it notes that project documentation is limited to README and proceeds without attempting guide creation.

### User Story P2 – Guide Creation for Structured Projects
Narrative: As a developer with a structured documentation site, when a feature is documented, I want the Documenter to create an appropriately-scoped guide page in my docs directory—so that users can discover the feature through my existing documentation navigation.

Independent Test: After documenting a feature in a MkDocs project with `docs/guide/`, verify a new guide file exists in that directory.

Acceptance Scenarios:
1. Given survey findings show `docs/guide/` exists with related guides, When creating feature documentation, Then a user-facing guide is created at the appropriate path within `docs/guide/`.
2. Given a new guide is created, When the Documenter completes, Then the guide contains user-appropriate content derived from Docs.md (not just duplicated technical detail).
3. Given survey findings show no structured documentation directory exists, When creating feature documentation, Then no guide file is created and Docs.md remains the sole documentation artifact.

### User Story P3 – Navigation Updates
Narrative: As a documentation site maintainer, when a new guide is added to my project, I want the corresponding navigation configuration updated—so that the guide appears in site navigation without manual intervention.

Independent Test: After a guide is created in a MkDocs project, verify mkdocs.yml nav section references the new guide.

Acceptance Scenarios:
1. Given a new guide created in a MkDocs project, When documentation is complete, Then mkdocs.yml nav section is updated to include the new guide.
2. Given a project with index files for navigation (e.g., docs/guide/index.md with links), When a new guide is created, Then the index file is updated with a reference to the new guide.
3. Given survey findings indicate framework-specific navigation patterns, When updating navigation, Then the agent follows those patterns rather than applying generic logic.

### Edge Cases
- Project has multiple documentation frameworks (e.g., both mkdocs.yml and docusaurus.config.js): Use primary framework (first detected) and log finding
- Navigation file is malformed or has complex structure: Add guide but note that manual nav verification may be needed
- `docs/` directory exists but is empty: Treat as no structured documentation; do not create guides
- Feature doesn't warrant a standalone guide (minor change): Survey still runs but agent exercises judgment on guide necessity

## Requirements

### Functional Requirements
- FR-001: Add survey step to Documenter process that executes after implementation analysis but before documentation creation (Stories: P1)
- FR-002: Survey step must check for common documentation framework configuration files at repository root (mkdocs.yml, docusaurus.config.js, .vuepress/, conf.py, _config.yml) (Stories: P1)
- FR-003: Survey step must explore docs source directories to identify content organization patterns (guide/, reference/, tutorial/ directories) (Stories: P1)
- FR-004: Survey findings must be captured in a structured section within Docs.md for transparency and debugging (Stories: P1)
- FR-005: When survey identifies a structured docs directory with guides, create a feature guide at the appropriate path (Stories: P2)
- FR-006: Guide content must be user-facing appropriate—derived from Docs.md but at a higher level suitable for user documentation (Stories: P2)
- FR-007: When a guide is created, update relevant navigation configuration (framework config file and/or index files) (Stories: P3)
- FR-008: Surveyed structure informs the existing "Update project documentation" step—not a replacement but an enhancement (Stories: P1, P2, P3)

### Cross-Cutting / Non-Functional
- Existing Docs.md quality and content must not be degraded by the survey enhancement
- Survey should be efficient—check for known patterns rather than exhaustive filesystem exploration
- Agent must gracefully handle projects without structured documentation (survey finds nothing → proceed normally)

## Success Criteria
- SC-001: Documenter process includes a survey step that runs before Docs.md creation (FR-001)
- SC-002: Survey identifies MkDocs, Docusaurus, VuePress, Sphinx, and Jekyll frameworks when their configuration files are present (FR-002)
- SC-003: Survey discovers docs organization patterns (guide/reference/tutorial directories) when they exist (FR-003)
- SC-004: Docs.md contains a "Documentation Structure" or equivalent section documenting survey findings (FR-004)
- SC-005: Projects with structured docs directories receive feature guide files in appropriate locations (FR-005)
- SC-006: Created guides contain user-appropriate content, not raw technical detail from Docs.md (FR-006)
- SC-007: Navigation configuration is updated when guides are added to framework-based documentation (FR-007)
- SC-008: Survey enhancement is additive—projects without structured docs continue to receive same documentation as before (FR-008)

## Assumptions
- Documentation frameworks can be detected by presence of their standard configuration files at repository root
- Guide content can be meaningfully derived from Docs.md technical content through summarization and user-focus reframing
- Common docs source directories follow standard naming conventions (docs/, doc/, documentation/)
- MkDocs is the highest priority framework to support fully given PAW's own usage of it

## Scope

In Scope:
- Survey step addition to Documenter agent process
- Detection of common documentation frameworks (MkDocs, Docusaurus, VuePress, Sphinx, Jekyll)
- Discovery of docs directory structure patterns
- Feature guide creation for MkDocs-based projects
- Navigation file updates for MkDocs (mkdocs.yml and index.md files)
- Survey findings documentation in Docs.md

Out of Scope:
- Full framework-specific support for all detected frameworks (MkDocs is primary; others are detection-only initially)
- Automatic migration between documentation frameworks
- Retroactive documentation structure analysis for past features
- Modification of existing guide content (only creation of new guides)
- Complex navigation restructuring (only simple additions)

## Dependencies
- PAW-04 Documenter agent file must be modifiable
- No external service dependencies
- Relies on standard documentation framework conventions

## Risks & Mitigations
- Risk: Survey adds time/tokens to documentation step. Mitigation: Survey checks known patterns efficiently rather than exhaustive exploration; framework detection is file existence check.
- Risk: Navigation updates could break existing documentation builds. Mitigation: Make conservative additions; include guidance to verify documentation build after updates.
- Risk: Agent may create guides when not appropriate (minor features). Mitigation: Include judgment guidance about when guides are warranted.

## References
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/144
- Research: .paw/work/144-documenter-survey-docs-structure/SpecResearch.md
- External: MkDocs documentation conventions (standard framework patterns)

## Glossary
- Survey step: A process step that explores project structure to gather information before taking action
- Documentation framework: A tool that generates documentation sites from source files (MkDocs, Docusaurus, etc.)
- Navigation configuration: Files that define how documentation is organized and linked (mkdocs.yml nav section, index.md files)
- Guide: User-facing documentation explaining how to use a feature, as opposed to technical reference material
