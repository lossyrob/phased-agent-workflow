# Feature Specification: Centralized Workflow Parameters

**Branch**: feature/param-doc  |  **Created**: 2025-10-15  |  **Status**: Draft
**Input Brief**: Create a shared parameter document (`WorkflowContext.md`) in each branch folder to eliminate repeated parameter declarations across stage prompt files.

## User Scenarios & Testing

### User Story P1 – Single Source for Workflow Parameters
**Narrative**: As a developer invoking PAW stages, I want a single `WorkflowContext.md` file under `docs/agents/<target_branch>/` that holds target branch, GitHub issue reference, and canonical artifact paths, so I can reference one file in GitHub Copilot Chat instead of re-specifying parameters in each stage prompt.

**Independent Test**: Open `docs/agents/feature/example/WorkflowContext.md`, copy its content into a Copilot Chat session, and verify all stage agents can extract target branch, issue reference, and artifact paths without additional prompts.

**Acceptance Scenarios**:
1. **Given** a feature branch exists, **When** the developer creates `WorkflowContext.md` with target branch, remote, issue URL, and artifact paths, **Then** the file contains all parameters needed by Spec, Spec Research, Code Research, Implementation Planning, Implementation, Review, Documentation, Status, and PR stages.
2. **Given** `WorkflowContext.md` exists, **When** the developer adds it to a Copilot Chat session for any stage, **Then** the agent extracts parameters without asking for branch, remote, or issue information.
3. **Given** multiple stage prompts reference overlapping parameters, **When** `WorkflowContext.md` is present, **Then** the developer can supply it once instead of repeating context across prompts.
4. **Given** the developer works against a fork, **When** they specify a remote other than `origin` in `WorkflowContext.md`, **Then** PR and branch operations target the specified remote instead of the default.

### User Story P2 – Clear Parameter Schema
**Narrative**: As a developer creating a new feature branch workflow, I want `WorkflowContext.md` to follow a documented structure (target branch, issue reference, artifact paths, optional inputs), so I know exactly what fields to populate and in what format.

**Independent Test**: Given a blank feature branch folder, follow the schema definition to create `WorkflowContext.md`, then validate it contains all required fields in the expected format.

**Acceptance Scenarios**:
1. **Given** the developer starts a new feature, **When** they reference the schema, **Then** they can populate `WorkflowContext.md` with: target branch (string), remote (string, defaults to `origin`), GitHub issue (URL format preferred, optional), and artifact paths (Spec, SpecResearch, CodeResearch, ImplementationPlan, Docs).
2. **Given** the schema includes optional "Additional Inputs" field, **When** the developer needs to reference supporting documents, **Then** they can add a comma-separated list or state "none".
3. **Given** the schema defines expected artifact path conventions, **When** artifact names follow PAW standards (`Spec.md`, `SpecResearch.md`, etc.), **Then** paths can be auto-derived from the target branch or explicitly listed.
4. **Given** the schema defines remote as optional with default `origin`, **When** the developer omits the remote field, **Then** agents assume `origin` for all git and PR operations.

### User Story P3 – Documentation of Usage Pattern
**Narrative**: As a developer maintaining the PAW workflow, I want documentation explaining when and how to use `WorkflowContext.md` (location, fields, stage compatibility), so I can educate team members and update the workflow as it evolves.

**Independent Test**: Read the documentation section describing `WorkflowContext.md`, then successfully create the file for a new feature and use it across three different stage invocations.

**Acceptance Scenarios**:
1. **Given** the developer reads the usage documentation, **When** they create `WorkflowContext.md` for a feature branch, **Then** the file is placed in `docs/agents/<target_branch>/WorkflowContext.md`.
2. **Given** the documentation lists compatible stages, **When** the developer uses `WorkflowContext.md` with Spec Agent, **Then** the agent recognizes and extracts parameters correctly.
3. **Given** the documentation explains optional vs required fields, **When** the developer omits optional "Additional Inputs", **Then** agents proceed without errors.

### User Story P4 – Work Title for PR Naming Consistency
**Narrative**: As a developer reviewing multiple PRs from a PAW workflow, I want all PRs (Planning, Phase, Docs, Final) to be prefixed with a consistent work title (e.g., `[WorkflowContext]`), so I can quickly identify related PRs and understand the feature scope at a glance.

**Independent Test**: Given a feature workflow with a Work Title set to "Auth", verify that the Planning PR, Phase PRs, Docs PR, and Final PR all have titles starting with `[Auth] `.

**Acceptance Scenarios**:
1. **Given** the Spec Agent creates `WorkflowContext.md` with Work Title "WorkflowContext", **When** the Implementation Plan Agent opens the Planning PR, **Then** the PR title starts with `[WorkflowContext] `.
2. **Given** a Work Title exists in `WorkflowContext.md`, **When** the Implementation Review Agent opens Phase PRs, **Then** each PR title starts with `[<Work Title>] `.
3. **Given** a Work Title exists in `WorkflowContext.md`, **When** the Documentation Agent opens the Docs PR, **Then** the PR title starts with `[<Work Title>] `.
4. **Given** a Work Title exists in `WorkflowContext.md`, **When** the PR Agent opens the Final PR to main, **Then** the PR title starts with `[<Work Title>] `.
5. **Given** the Spec Agent refines the spec, **When** the Work Title needs adjustment for clarity, **Then** the agent updates the Work Title in `WorkflowContext.md` and informs the user.
6. **Given** multiple features are in progress, **When** viewing the PR list, **Then** each feature's PRs are easily distinguishable by their unique Work Title prefix.

### Edge Cases
- **Missing WorkflowContext.md**: Agents fall back to existing behavior (prompt for parameters or inspect current branch). Generate the WorkflowContext.md file if missing and parameters are provided or can be inferred, informing the user.
- **Omitted Remote**: If remote is not specified in `WorkflowContext.md`, agents default to `origin`.
- **Conflicting parameters**: If both `WorkflowContext.md` and a stage prompt supply the same parameter with different values, agents should clarify or follow a documented precedence rule (out of scope for initial implementation; agents will ask for clarification if detected).
- **Malformed file structure**: If required fields are missing or incorrectly formatted, agents should report which parameters are invalid or missing.
- **Branch derivatives**: `WorkflowContext.md` resides on the base target branch; derivative branches (`_plan`, `_phaseN`, `_docs`) reference the original file via relative path or agent instruction.
- **Fork workflows**: When working against a fork (remote other than `origin`), the developer must explicitly specify the remote in `WorkflowContext.md` to ensure PR and branch operations target the correct repository.

## Requirements

### Functional Requirements
- **FR-001**: The system SHALL define a standard location for `WorkflowContext.md` as `docs/agents/<target_branch>/WorkflowContext.md`. *(Stories: P1)*
- **FR-002**: `WorkflowContext.md` SHALL contain the following required parameters: Target Branch (string) and Work Title (short string) after Spec stage completion. *(Stories: P1, P2)*
- **FR-003**: `WorkflowContext.md` SHALL contain the following optional parameters: GitHub Issue (URL format preferred), Remote (string, defaults to `origin`), Artifact Paths (Spec, SpecResearch, CodeResearch, ImplementationPlan, Docs as relative or absolute paths), and Additional Inputs (list of supplementary documents). *(Stories: P1, P2)*
- **FR-011**: The Spec Agent SHALL generate an initial Work Title based on the feature brief or GitHub Issue and store it in `WorkflowContext.md`. *(Stories: P2)*
- **FR-012**: The Spec Agent SHALL refine the Work Title during the Spec refinement process as the feature understanding evolves. *(Stories: P2)*
- **FR-013**: Agents that create PRs (Implementation Review Agent, Documentation Agent, PR Agent, Implementation Plan Agent) SHALL prefix all PR titles with `[<Work Title>] `. *(Stories: P1, P2)*
- **FR-004**: If the Remote parameter is omitted from `WorkflowContext.md`, agents SHALL default to `origin` for all git and PR operations. *(Stories: P2; Edge case: omitted remote)*
- **FR-005**: The file format SHALL be Markdown with a minimal frontmatter header specifying purpose or schema version (optional for initial version). *(Stories: P2)*
- **FR-006**: Documentation SHALL describe the file location, required fields, optional fields, expected format, and usage examples for each PAW stage. *(Stories: P3)*
- **FR-007**: Agents SHALL read `WorkflowContext.md` when supplied in chat context and extract parameters without additional user prompts. *(Stories: P1)*
- **FR-008**: If `WorkflowContext.md` is absent, agents SHALL fall back to existing parameter discovery behavior (prompt user or inspect current branch). *(Edge case: missing file)*
- **FR-009**: If required fields (Target Branch) are missing from `WorkflowContext.md`, agents SHALL report which parameters are invalid or absent. *(Edge case: malformed structure)*
- **FR-010**: When a developer specifies a remote other than `origin`, PR and branch operations SHALL target the specified remote repository. *(Stories: P1; Edge case: fork workflows)*

### Key Entities
- **WorkflowContext.md**: Centralized parameter document residing in `docs/agents/<target_branch>/`.
  - **Work Title**: Short, descriptive name for the work that prefixes all PR titles (e.g., `WorkflowContext`, `Auth`, `API Refactor`). Generated by Spec Agent and refined through Spec stage. *Required after Spec stage.*
  - **Target Branch**: String identifying the feature branch namespace (e.g., `feature/param-doc`). *Required.*
  - **Remote**: String identifying the git remote for branch and PR operations (e.g., `origin`, `fork`, `upstream`). *Optional; defaults to `origin`.*
  - **GitHub Issue**: Reference to the driving issue, full URL format preferred (`https://github.com/owner/repo/issues/N`). *Optional.*
  - **Artifact Paths**: Map or list of canonical artifacts (Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md, Docs.md) as relative paths under the branch folder or absolute workspace paths. *Optional; can be auto-derived from target branch.*
  - **Additional Inputs**: Optional comma-separated list of supporting documents (e.g., `paw-specification.md`).
  - **Mode/Schema Version** (optional): Frontmatter identifier for future extensibility.

### Cross-Cutting / Non-Functional
- **Backward Compatibility**: Existing stage prompts continue to function without `WorkflowContext.md`; agents tolerate its absence.
- **Readability**: File structure must be human-readable Markdown suitable for quick editing and direct inclusion in chat context.
- **Discoverability**: File name (`WorkflowContext.md`) and location convention (`docs/agents/<branch>/`) should be self-explanatory to new developers.

## Success Criteria
- **SC-001**: A developer can create `WorkflowContext.md` for a new feature branch and use it across at least three distinct PAW stages (e.g., Spec, Code Research, Implementation) without re-entering target branch, remote, or issue information. *(FR-001, FR-002, FR-003, FR-007)*
- **SC-002**: Documentation exists that explains the file's purpose, location, required/optional fields, and usage examples for each stage. *(FR-006)*
- **SC-003**: When `WorkflowContext.md` is missing, agents continue to request parameters interactively or inspect the current branch, maintaining existing workflow behavior. *(FR-008)*
- **SC-004**: When required fields (Target Branch, Work Title after Spec stage) are omitted from `WorkflowContext.md`, agents produce a clear error message identifying the missing parameter(s). *(FR-009)*
- **SC-005**: The file schema supports optional "Additional Inputs" without breaking parameter extraction if the field is omitted. *(FR-003)*
- **SC-006**: When the Remote field is omitted, agents default to `origin` for all git and PR operations without prompting the user. *(FR-004)*
- **SC-007**: When a developer specifies a remote other than `origin` (e.g., working against a fork), PR creation and branch operations target the specified remote repository. *(FR-010)*
- **SC-008**: All PRs created during the workflow (Planning PR, Phase PRs, Docs PR, Final PR) are prefixed with `[<Work Title>] ` where Work Title comes from `WorkflowContext.md`. *(FR-013)*
- **SC-009**: The Spec Agent generates a Work Title and stores it in `WorkflowContext.md` by the end of the Spec stage. *(FR-011)*
- **SC-010**: The Work Title can be refined during Spec iterations without requiring manual file edits. *(FR-012)*

## Assumptions
- **Markdown Parsing**: Agents rely on LLM interpretation of Markdown structure rather than programmatic parsing; no schema validation library is introduced.
- **Single WorkflowContext per Branch**: Each feature branch has exactly one `WorkflowContext.md` in its root agent folder; derivative branches (`_plan`, `_phaseN`, `_docs`) reference the original.
- **No Automated Sync**: Parameters are manually maintained; no automated update mechanism propagates changes across artifacts or branches.
- **Frontmatter Optional**: Initial implementation does not require YAML frontmatter; future schema versioning may introduce it.
- **Parameter Precedence Undefined**: If both `WorkflowContext.md` and a stage prompt supply conflicting values, agents will ask the user for clarification rather than following a built-in precedence rule (explicit precedence design is out of scope).
- **Default Remote**: When the Remote parameter is omitted, agents assume `origin` as the git remote for all branch and PR operations.
- **Remote Name Validity**: Developers are responsible for ensuring the specified remote name matches an actual git remote configured in their local repository; agents do not validate remote existence before attempting operations.

## Scope

**In Scope**:
- Define `WorkflowContext.md` structure and location convention.
- Document required fields (Target Branch, GitHub Issue) and optional fields (Remote with default `origin`, Artifact Paths, Additional Inputs).
- Provide usage examples showing how to reference `WorkflowContext.md` in Copilot Chat for each PAW stage.
- Specify agent behavior when the file is present (extract parameters) and absent (fallback to prompts).
- Specify agent behavior when required fields are missing (report errors).
- Specify agent behavior when Remote is omitted (default to `origin`).
- Support fork workflows by allowing developers to specify a non-default remote.

**Out of Scope**:
- Automated generation or update of `WorkflowContext.md` (manual creation only).
- Programmatic validation or schema enforcement (agents rely on LLM interpretation).
- Validation of git remote existence before attempting operations (developers must ensure remote is configured).
- Updating existing stage prompt files to reference `WorkflowContext.md` (prompts remain unchanged).
- Defining precedence rules for conflicting parameter values (agents ask for clarification).
- Migrating historical feature branches to use `WorkflowContext.md` (applies to new workflows only).
- Integration with external configuration systems or CI/CD pipelines.

## Dependencies
- PAW stage agent instructions (chatmode definitions in `.github/chatmodes/`) must acknowledge `WorkflowContext.md` as an optional context source.
- Existing artifact path conventions (`docs/agents/<target_branch>/Spec.md`, etc.) remain unchanged.
- GitHub MCP tools continue to provide issue/PR data retrieval.

## Risks & Mitigations
- **Risk**: Developers forget to create `WorkflowContext.md` and continue using per-stage prompts, fragmenting the workflow.
  - **Impact**: Medium – reduces consistency but does not break functionality.
  - **Mitigation**: Document `WorkflowContext.md` prominently in `paw-specification.md` and include a creation step in the workflow kickoff checklist.
  
- **Risk**: Conflicting parameter values between `WorkflowContext.md` and stage prompts cause agent confusion.
  - **Impact**: Low – agents can ask for clarification, but may slow down workflow.
  - **Mitigation**: Document recommendation to use `WorkflowContext.md` as single source; future enhancement could define explicit precedence.

- **Risk**: Manual maintenance of `WorkflowContext.md` leads to stale or incorrect parameters (e.g., outdated issue reference).
  - **Impact**: Low – agents may reference wrong context but user can correct interactively.
  - **Mitigation**: Encourage updating `WorkflowContext.md` at each stage transition; future enhancement could add validation prompts.

- **Risk**: Lack of schema validation means malformed files are not caught early.
  - **Impact**: Low – agents will report missing fields when they attempt extraction.
  - **Mitigation**: Provide clear schema documentation and examples; consider adding a validation tool in future iterations.

## References
- **Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/12
- **Research**: docs/agents/feature/param-doc/SpecResearch.md
- **External**: None

## Glossary
- **WorkflowContext.md**: Centralized parameter document holding target branch, work title, remote, issue reference, artifact paths, and optional inputs for a PAW feature workflow.
- **Work Title**: Short, descriptive name for the work (e.g., `WorkflowContext`, `Auth`, `API Refactor`) that prefixes all PR titles. Generated by Spec Agent and refined during Spec stage.
- **Target Branch**: The feature branch serving as the namespace for all workflow artifacts (e.g., `feature/param-doc`).
- **Remote**: Git remote name for branch and PR operations (e.g., `origin`, `fork`, `upstream`); defaults to `origin` if omitted.
- **Artifact Paths**: Locations of canonical workflow outputs (Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md, Docs.md).
- **Additional Inputs**: Optional supplementary documents referenced during spec or research stages (e.g., system documentation, reference prompts).
- **Derivative Branch**: Branches created during later workflow stages (`<target_branch>_plan`, `<target_branch>_phaseN`, `<target_branch>_docs`) that reference the original target branch's `WorkflowContext.md`.
- **Fork Workflow**: Development pattern where a developer works against a personal fork (non-default remote) to avoid creating PRs in the upstream repository until ready.
