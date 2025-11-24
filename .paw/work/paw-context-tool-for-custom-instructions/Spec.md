# Feature Specification: PAW Context Tool for Custom Instructions

**Branch**: feature/custom-agent-instructions  |  **Created**: 2025-11-19  |  **Status**: Draft
**Input Brief**: Create a language model tool enabling PAW agents to dynamically retrieve workspace-specific and user-level custom instructions plus workflow context at runtime.

## Overview

**Terminology Note**: This specification uses "work ID" as the primary term for the normalized identifier. A work ID (also known as a "feature slug" or "slug" internally) is a filesystem-safe identifier for workflow artifacts that may represent features, bug fixes, or any other work items.

When developers work across multiple projects using PAW agents, each project may have unique requirements, conventions, or preferences that should guide agent behavior. Currently, PAW agents are installed globally to the user's VS Code prompts directory and shared across all workspaces. This creates a challenge: how can project-specific customizations be applied without polluting the global agent definitions or requiring agents to be reinstalled every time a developer switches workspaces?

The PAW Context Tool solves this by providing a centralized mechanism for agents to dynamically load context at runtime. When an agent begins work, it calls the `paw_get_context` tool to retrieve three categories of information: workspace-specific custom instructions stored in the project's `.paw/instructions/` directory, user-level custom instructions from the developer's home directory at `~/.paw/instructions/`, and the current workflow metadata from `WorkflowContext.md`. This approach maintains clean separation between global agent definitions and project-specific customizations.

The tool returns formatted context that agents can incorporate into their decision-making. Workspace instructions take precedence over user-level instructions, allowing projects to enforce specific standards while still respecting developer preferences. When no custom instructions exist, the tool returns an empty response, ensuring agents can always call it without error handling complexity. The workflow metadata enables agents to access feature slug, target branch, and other contextual details without making separate file reads, consolidating workspace context retrieval into a single efficient tool call.

This design enables flexible, workspace-aware agent behavior while preserving the simplicity of globally installed agent files. Developers can customize PAW workflows at both the user and project levels, and agents automatically adapt to the current workspace context without manual configuration or workspace switching overhead.

## Objectives

- Enable agents to retrieve custom instructions from both workspace and user-level locations in a single tool call (Rationale: centralizes context access and avoids redundant tool calls searching for instruction files)
- Provide workspace isolation so custom instructions from one project do not affect agent behavior in unrelated projects (Rationale: prevents configuration leakage and ensures agents operate with correct context)
- Return workflow metadata from WorkflowContext.md as part of context response (Rationale: eliminates separate file reads for feature slug, target branch, and other workflow parameters)
- Support optional custom instructions without requiring error handling by agents (Rationale: simplifies agent implementation by treating missing instructions as normal case)
- Establish precedence rules where workspace instructions override user instructions, and custom instructions override agent defaults (Rationale: allows projects to enforce standards while respecting user preferences)

## User Scenarios & Testing

### User Story P1 – Agent Loads Workspace Context at Startup

Narrative: As a PAW agent beginning work on a feature, I need to retrieve the current workspace's custom instructions and workflow metadata so I can adapt my behavior to project-specific requirements and access feature context without additional file reads.

Independent Test: Agent calls `paw_get_context` with feature slug and receives workspace instructions, user instructions, and workflow metadata in a single response.

Acceptance Scenarios:
1. Given a workspace with custom instructions at `.paw/instructions/PAW-02B Impl Planner-instructions.md` and workflow metadata at `.paw/work/auth-system/WorkflowContext.md`, When the Implementation Planner agent calls `paw_get_context` with `feature_slug: "auth-system"`, Then the response includes workspace instructions content, empty user instructions (if not present), and workflow metadata fields (feature slug, target branch, work title).
2. Given no custom instructions exist at workspace or user level, When any agent calls `paw_get_context`, Then the response indicates no custom instructions found and returns workflow metadata only.
3. Given user-level instructions at `~/.paw/instructions/PAW-01A Specification-instructions.md` but no workspace instructions, When the Specification agent calls `paw_get_context`, Then the response includes user instructions content and workflow metadata.

### User Story P2 – Developer Configures Project-Specific Behavior

Narrative: As a developer working on a project with specific conventions, I want to provide custom instructions in `.paw/instructions/` that PAW agents will follow so that generated artifacts comply with project standards without modifying global agent files.

Independent Test: Developer creates `.paw/instructions/<agent>-instructions.md` and verifies that the agent's behavior reflects the custom instructions when called.

Acceptance Scenarios:
1. Given a file `.paw/instructions/PAW-02B Impl Planner-instructions.md` containing "Always include an ADR for each major architectural decision", When the Implementation Planner agent calls `paw_get_context` and generates an implementation plan, Then the agent includes ADRs in the plan as instructed.
2. Given workspace instructions that conflict with user-level instructions (e.g., different code style preferences), When an agent calls `paw_get_context`, Then workspace instructions take precedence in the returned context.
3. Given custom instructions that override agent default behavior, When an agent processes the custom instructions, Then custom instruction directives supersede conflicting agent defaults.

### User Story P3 – Developer Sets User-Level Preferences

Narrative: As a developer who works across multiple PAW projects, I want to define personal preferences in `~/.paw/instructions/` that apply to all projects unless overridden so that I can maintain consistent behavior without duplicating instructions across workspaces.

Independent Test: Developer creates `~/.paw/instructions/<agent>-instructions.md` and verifies that all workspaces reflect the user-level preferences when no workspace-level override exists.

Acceptance Scenarios:
1. Given user instructions at `~/.paw/instructions/PAW-01A Specification-instructions.md` requesting concise specifications, When any workspace's Specification agent calls `paw_get_context` without workspace-level override, Then the agent follows the user-level preference.
2. Given a new workspace without `.paw/instructions/` directory, When any agent calls `paw_get_context`, Then user-level instructions are applied as the default customization.

### User Story P4 – Extension Manages Cross-Platform User Paths

Narrative: As the PAW extension managing user-level instruction paths, I need to resolve user directories correctly on Windows, macOS, Linux, and WSL so that user instructions are consistently accessible regardless of platform.

Independent Test: Extension resolves user instruction path using platform detection and successfully loads `~/.paw/instructions/<agent>-instructions.md` on each supported platform.

Acceptance Scenarios:
1. Given Windows platform, When `paw_get_context` resolves user instruction path, Then the path is `%USERPROFILE%\.paw\instructions\<agent>-instructions.md`.
2. Given macOS platform, When `paw_get_context` resolves user instruction path, Then the path is `/Users/<username>/.paw/instructions/<agent>-instructions.md`.
3. Given Linux platform, When `paw_get_context` resolves user instruction path, Then the path is `/home/<username>/.paw/instructions/<agent>-instructions.md`.
4. Given WSL environment, When `paw_get_context` resolves user instruction path, Then the path targets Windows user directory `/mnt/c/Users/<username>/.paw/instructions/` for consistency with VS Code agent files.

### Edge Cases

- Custom instruction file exists but is empty: Tool returns `exists: true, content: '', error: 'file is empty'`.
- Custom instruction file is inaccessible due to permissions: Tool returns `exists: true, content: '', error: 'permission denied'` with descriptive message.
- WorkflowContext.md missing or malformed: Tool returns empty workflow metadata without failing overall context retrieval.
- Feature slug parameter missing: Tool returns error response indicating required parameter not provided.
- Agent name in instruction filename contains spaces or special characters: Tool normalizes filename to match agent naming conventions.
- Multiple workspaces open in VS Code: Tool resolves context for the workspace containing the feature slug path.
- User interrupts context tool invocation: Tool respects cancellation token and terminates gracefully.

## Requirements

### Functional Requirements

- FR-001: Tool accepts `feature_slug` parameter identifying the workflow context to load (Stories: P1, P2, P3)
- FR-002: Tool reads workspace-level custom instructions from `.paw/instructions/<agent>-instructions.md` relative to workspace root (Stories: P1, P2)
- FR-003: Tool reads user-level custom instructions from `~/.paw/instructions/<agent>-instructions.md` using platform-appropriate home directory resolution (Stories: P1, P3, P4)
- FR-004: Tool reads workflow metadata from `.paw/work/<feature-slug>/WorkflowContext.md` and extracts feature slug, target branch, work title, and other fields (Stories: P1)
- FR-005: Tool returns structured response indicating existence, content, and errors for both workspace and user instructions (Stories: P1, P2, P3)
- FR-006: Tool returns workflow metadata fields as structured data in the response (Stories: P1)
- FR-007: Tool formats response as natural language text suitable for agent consumption, not raw JSON (Stories: P1)
- FR-008: Tool handles missing custom instruction files gracefully, returning empty content without failing (Stories: P1, P2, P3)
- FR-009: Tool handles file read errors (permissions, encoding issues) by returning descriptive error messages while continuing to load other files (Stories: P1)
- FR-010: Tool implements VS Code Language Model Tool API with `invoke()` method returning `LanguageModelToolResult` (Stories: P1, P2, P3, P4)
- FR-011: Tool is registered in `package.json` under `contributes.languageModelTools` with parameter schema defining `feature_slug` as required (Stories: P1)
- FR-012: Tool optionally implements `prepareInvocation()` method to show confirmation UI before execution (Stories: P1)
- FR-013: Tool resolves platform-specific user directories correctly for Windows, macOS, Linux, and WSL (Stories: P4)
- FR-014: Tool respects cancellation tokens during file read operations to support user interruption (Stories: P1)

### Key Entities

- **Custom Instruction File**: Markdown document at `.paw/instructions/<agent>-instructions.md` or `~/.paw/instructions/<agent>-instructions.md` containing free-form instructions for agent behavior customization. May include optional YAML frontmatter.
- **Workflow Context**: Metadata file at `.paw/work/<feature-slug>/WorkflowContext.md` containing structured fields: Work Title, Feature Slug, Target Branch, Issue URL, Remote, Artifact Paths, Additional Inputs, Workflow Mode, Review Strategy.
- **Context Response**: Structured data returned by `paw_get_context` tool containing workspace instructions (exists, content, error), user instructions (exists, content, error), and workflow metadata (feature slug, target branch, work title, etc.).
- **Feature Slug**: Normalized identifier for workflow artifacts (e.g., "auth-system", "api-refactor-v2") used to locate WorkflowContext.md and derive artifact paths.

### Cross-Cutting / Non-Functional

- **Workspace Isolation**: Custom instructions loaded for one workspace must not affect agent behavior in other workspaces. Tool must use the provided feature slug to determine the correct workspace context.
- **Precedence Rules**: When both workspace and user instructions exist, workspace instructions take precedence. Custom instructions override agent default behavior when conflicts occur.
- **Error Resilience**: Tool continues loading remaining context even if individual files fail to read. Partial failures are reported but do not prevent returning available context.
- **Performance**: File reads should be synchronous and complete within typical VS Code tool invocation timeouts. No network calls or long-running operations.
- **Compatibility**: Tool must work with existing PAW agent templates and workflow structure without requiring changes to agent installation locations or format.

## Success Criteria

- SC-001: Agent calling `paw_get_context` with valid feature slug receives response containing workspace instructions, user instructions, and workflow metadata within 500ms (FR-001, FR-002, FR-003, FR-004, FR-006)
- SC-002: Response clearly indicates existence status for both workspace and user instruction files (true/false) independent of content availability (FR-005, FR-008)
- SC-003: When workspace and user instructions both exist for the same agent, the tool's formatted response presents workspace instructions with precedence notation (FR-005, FR-007)
- SC-004: When custom instruction file is missing, tool returns successful response with `exists: false` and empty content, not an error result (FR-008)
- SC-005: When custom instruction file cannot be read due to permissions or encoding errors, tool returns `exists: true` with empty content and descriptive error message, while continuing to load other files (FR-009)
- SC-006: Tool extracts at minimum feature slug, target branch, and work title from WorkflowContext.md when present (FR-004, FR-006)
- SC-007: Tool is discoverable by agents through VS Code's language model tool registry after extension activation (FR-010, FR-011)
- SC-008: On Windows, user instruction path resolves to `%USERPROFILE%\.paw\instructions\` (FR-013)
- SC-009: On macOS, user instruction path resolves to `/Users/<username>/.paw/instructions/` (FR-013)
- SC-010: On Linux, user instruction path resolves to `/home/<username>/.paw/instructions/` (FR-013)
- SC-011: On WSL, user instruction path resolves to `/mnt/c/Users/<username>/.paw/instructions/` consistent with VS Code agent file locations (FR-013)
- SC-012: Tool respects cancellation token and terminates file read operations within 100ms when user cancels invocation (FR-014)
- SC-013: Tool response format is natural language text describing available instructions, not raw JSON or XML (FR-007)
- SC-014: When WorkflowContext.md is missing or malformed, tool returns empty workflow metadata object without failing the entire context retrieval (FR-004, FR-009)
- SC-015: Tool parameter schema in package.json declares `feature_slug` as required string parameter with description (FR-011)

## Assumptions

- Custom instruction files are UTF-8 encoded plain text Markdown documents. Non-UTF-8 files will be treated as read errors.
- WorkflowContext.md follows the established format with `Field: Value` line structure. Alternative formats are not supported.
- Agent names in instruction filenames match the agent names as installed (e.g., "PAW-01A Specification" results in filename "PAW-01A Specification-instructions.md"). Filename normalization handles spaces and special characters.
- File sizes for custom instructions and WorkflowContext.md are reasonable (under 1MB). Extremely large files may cause performance degradation.
- Agents call `paw_get_context` once at startup rather than repeatedly during workflow execution. Multiple calls are supported but not optimized.
- The VS Code workspace has a root directory. Multi-root workspaces will resolve context relative to the first workspace folder.
- Platform detection using `os.platform()` and WSL detection via `/proc/version` or environment variables are reliable. Edge cases (unusual Unix variants, Cygwin) are not explicitly supported.
- User home directory is accessible and writable. If `os.homedir()` fails, user-level instructions cannot be loaded.
- Agents are responsible for interpreting and applying custom instructions. The tool provides content but does not enforce behavioral changes.
- Generated prompt files reference feature slug rather than WorkflowContext.md path, as agents will retrieve workflow context via `paw_get_context`.

## Scope

In Scope:
- Loading workspace-level custom instructions from `.paw/instructions/`
- Loading user-level custom instructions from `~/.paw/instructions/`
- Reading workflow metadata from WorkflowContext.md
- Platform-specific user directory resolution (Windows, macOS, Linux, WSL)
- Graceful handling of missing or inaccessible files
- VS Code Language Model Tool API registration and implementation
- Structured response format with natural language text for agent consumption

Out of Scope:
- Validation or enforcement of custom instruction content
- Composition or merging of custom instructions into agent files
- Automatic detection of agent name from calling context (agents must specify via instruction filename patterns)
- Editing or writing custom instruction files (tool is read-only)
- Searching for custom instructions in non-standard locations
- Custom instruction versioning or history tracking
- Integration with GitHub Copilot's `.github/custom-instructions.md` (separate feature with different purpose)
- Hot-reloading of custom instructions when files change during agent execution
- Caching of loaded instructions across tool invocations

## Dependencies

- VS Code Language Model API (`vscode.lm.*`)
- Node.js `fs` module for synchronous file operations
- Node.js `path` module for cross-platform path resolution
- Node.js `os` module for platform detection and home directory resolution
- Existing `platformDetection.ts` module for consistent platform handling
- Existing WorkflowContext.md format as defined by PAW workflow structure
- Extension activation prior to tool registration

## Risks & Mitigations

- **Risk**: Custom instruction files contain malicious content that affects agent behavior. **Impact**: Agents may generate harmful or incorrect output. **Mitigation**: Document that custom instructions are user-provided content with the same trust level as workspace code. Future enhancement could add content scanning or size limits.
- **Risk**: Path traversal attacks via feature slug parameter (e.g., `feature_slug: "../../../etc/passwd"`). **Impact**: Tool could read files outside workspace. **Mitigation**: Validate feature slug format (alphanumeric and hyphens only) and construct paths safely using `path.join()` from known workspace root.
- **Risk**: Large custom instruction files cause tool invocation timeouts. **Impact**: Agents fail to retrieve context. **Mitigation**: Document recommended file size limits and implement timeout handling in future iteration if needed.
- **Risk**: Inconsistent platform detection in unusual environments. **Impact**: User instructions not found or wrong path used. **Mitigation**: Follow existing `platformDetection.ts` patterns and log errors when platform cannot be determined. Default to `os.homedir()` when platform detection fails.
- **Risk**: WorkflowContext.md format changes over time, breaking metadata parsing. **Impact**: Workflow metadata not available to agents. **Mitigation**: Parse metadata robustly using simple line-based extraction. Missing fields result in empty metadata, not errors.
- **Risk**: Concurrent file access when multiple agents call tool simultaneously. **Impact**: Race conditions or file lock errors. **Mitigation**: Use synchronous read operations which are atomic at OS level. File writes are out of scope for this tool.

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/86
- Research: .paw/work/paw-context-tool-for-custom-instructions/SpecResearch.md
- External: None

## Glossary

- **Language Model Tool**: VS Code extension feature allowing registration of custom tools that agents can invoke during conversations
- **Feature Slug**: Normalized, filesystem-safe identifier for workflow artifacts (e.g., "auth-system", "api-refactor")
- **Workspace Instructions**: Custom instructions stored in project's `.paw/instructions/` directory, applying to all users working on that project
- **User Instructions**: Custom instructions stored in user's home directory at `~/.paw/instructions/`, applying across all workspaces for that user
- **WorkflowContext.md**: Metadata file storing feature slug, target branch, work title, and workflow configuration for active PAW workflow
- **Agent Precedence**: Rule determining which instructions take priority: workspace > user > agent defaults

