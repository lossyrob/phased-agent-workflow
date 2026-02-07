# Feature Specification: Integration Testing Framework

**Branch**: feature/integration-testing-framework  |  **Created**: 2026-02-07  |  **Status**: Draft
**Input Brief**: Build local-first integration testing framework for PAW using Copilot SDK

## Overview

PAW orchestrates multi-stage AI agent workflows (specification, planning, implementation, review) but currently lacks automated testing for agent behavior. When skills or agent prompts change, there is no way to verify that PAW still produces correct artifacts, follows workflow rules, or handles edge cases properly. The only validation is manual: run a workflow and inspect results.

This feature introduces an integration testing framework that programmatically drives PAW agent sessions against test repositories, auto-answers user decisions, enforces sandbox safety, and verifies produced artifacts. By treating PAW skills as testable functions—inject prompt, provide inputs, check outputs—developers can catch regressions before they reach users.

The framework prioritizes local developer experience. Tests run on a developer's machine using their existing Copilot CLI authentication, with no external infrastructure required. Future CI integration is possible via Azure BYOK but is not part of this initial scope.

## Objectives

- Enable automated verification of PAW skill behavior after prompt changes
- Catch regressions in artifact structure, tool usage, and workflow logic
- Provide fast feedback during skill development (run single test in ~30s)
- Ensure test safety: no git pushes, no PR creation, no writes outside sandbox
- Make test authoring straightforward for adding coverage of new skills

## User Scenarios & Testing

### User Story P1 – Run Integration Tests Locally
Narrative: A developer modifies a PAW skill prompt and wants to verify it still produces correct artifacts before committing.
Independent Test: Run `npm run test:integration` and see pass/fail results.
Acceptance Scenarios:
1. Given a developer with Copilot CLI auth configured, When they run `npm run test:integration`, Then all tests execute and report pass/fail
2. Given a test that creates a Copilot SDK session, When the session completes, Then the temp workspace is cleaned up automatically
3. Given `PAW_TEST_DEBUG=1` is set, When a test runs, Then agent output streams to console in real-time

### User Story P2 – Verify Skill Produces Correct Artifacts
Narrative: A developer writes a test that verifies paw-spec produces a Spec.md with the expected structure.
Independent Test: A paw-spec test creates Spec.md with FR-*/SC-* identifiers.
Acceptance Scenarios:
1. Given a skill loaded as system prompt in an SDK session, When sent a feature brief, Then the skill creates the expected artifact in the workspace
2. Given an artifact assertion helper, When checking Spec.md structure, Then it verifies presence of overview, functional requirements, and success criteria sections
3. Given a tool trace logger, When the skill completes, Then the log contains the tools called and their arguments

### User Story P3 – Safe Sandbox Execution
Narrative: A test runs an agent that tries to push code or create PRs, and the sandbox blocks it.
Independent Test: Tool policy denies `git push` and test passes without side effects.
Acceptance Scenarios:
1. Given a tool policy configured for a workspace, When the agent calls `git push`, Then the call is denied with an error message
2. Given a tool policy, When the agent tries to write a file outside the workspace root, Then the write is blocked
3. Given `PAW_TEST_KEEP_WORKSPACE=1`, When a test completes, Then the workspace is preserved and its path is logged

### User Story P4 – Auto-Answer Agent Questions
Narrative: During a test, the agent asks clarifying questions via `ask_user`, and the test harness answers automatically based on configured rules.
Independent Test: A rule-based answerer provides deterministic answers and fails on unexpected questions.
Acceptance Scenarios:
1. Given an answerer with rules for "workflow mode" and "branch name", When the agent asks those questions, Then the rules provide correct answers
2. Given no matching rule for a question, When the agent asks that question, Then the test fails with a clear error showing the unmatched question and choices

### Edge Cases
- Agent session times out (>120s default): test fails with timeout error including session ID for debugging
- Copilot CLI auth not configured: clear error message explaining prerequisite
- Fixture template missing: test fails at setup with descriptive error
- Agent produces no artifacts: assertion failure with tool trace for diagnosis

## Requirements

### Functional Requirements
- FR-001: Test harness creates isolated Copilot SDK sessions with skill content as system prompt (Stories: P1, P2)
- FR-002: Test harness uses Copilot CLI auth (`useLoggedInUser: true`) by default (Stories: P1)
- FR-003: Test fixture system clones template repositories to temp directories with git initialization (Stories: P1, P2)
- FR-004: Rule-based auto-answerer intercepts `ask_user` tool calls and provides deterministic answers (Stories: P4)
- FR-005: Auto-answerer throws on unmatched questions (fail-closed behavior) (Stories: P4)
- FR-006: Tool policy blocks `git push`, `gh pr/issue create`, and file writes outside workspace (Stories: P3)
- FR-007: Structural assertion helpers verify artifact existence and content patterns (Stories: P2)
- FR-008: Tool call trace logger captures all tool invocations with names and arguments (Stories: P2)
- FR-009: Skill loader reads `skills/*/SKILL.md` and `agents/*.agent.md` from the repo (Stories: P2)
- FR-010: npm scripts expose test commands (`test:integration`, `test:integration:skills`, `test:integration:workflows`) (Stories: P1)
- FR-011: Debug mode (`PAW_TEST_DEBUG=1`) streams agent output to console (Stories: P1)
- FR-012: Workspace preservation mode (`PAW_TEST_KEEP_WORKSPACE=1`) skips cleanup (Stories: P3)
- FR-013: At least 3 passing integration tests covering paw-spec, paw-planning, and a negative case (Stories: P1, P2)

### Key Entities
- **TestContext**: Bundles client, session, fixture, tool log, and answerer for a single test
- **TestFixture**: Manages temp directory lifecycle, git state, and optional workflow state seeding
- **ToolPolicy**: Decides allow/deny/stub for each tool call based on sandbox rules
- **Answerer**: Provides deterministic answers to `ask_user` with logging and fail-closed behavior
- **ToolCallLog**: Records tool invocations for post-test assertions

### Cross-Cutting / Non-Functional
- Tests execute using Node.js native test runner via `tsx` (TypeScript execution)
- Each test gets a fresh SDK session and temp directory (no cross-test pollution)
- Test timeout defaults to 120 seconds per test (configurable via `PAW_TEST_TIMEOUT`)

## Success Criteria
- SC-001: Running `npm run test:integration` executes at least 3 tests that pass on a machine with Copilot CLI auth (FR-001, FR-002, FR-010, FR-013)
- SC-002: A paw-spec test produces a Spec.md containing functional requirement and success criteria identifiers (FR-007, FR-009)
- SC-003: A tool policy test confirms that `git push` commands are blocked (FR-006)
- SC-004: An unmatched `ask_user` question causes a test to fail with a descriptive error (FR-005)
- SC-005: Setting `PAW_TEST_DEBUG=1` produces visible agent output during test execution (FR-011)
- SC-006: No test creates files outside its temp workspace directory (FR-006)

## Assumptions
- Developers running tests have Copilot CLI installed and authenticated (`copilot auth status` succeeds)
- The `@github/copilot-sdk` package is available via npm (validated in `poc/sdk/`)
- SDK sessions support `onUserInputRequest`, `onPreToolUse`, and `onPostToolUse` hooks
- Tests run sequentially by default (parallel execution is a future optimization)

## Scope

In Scope:
- Test harness library (`tests/integration/lib/`)
- Single `minimal-ts` fixture template
- Prompt-level skill tests (paw-spec, paw-planning)
- Negative test (missing prerequisite detection)
- npm script integration
- Debug and workspace preservation modes
- Documentation updates to DEVELOPING.md

Out of Scope:
- CI/GitHub Actions workflow (requires Azure BYOK setup)
- VS Code extension integration tests
- LLM-as-judge semantic comparison
- Record/replay cassette system
- Multiple fixture templates (Python, monorepo)
- Runtime integration tests that invoke the full `copilot` CLI binary
- PAW Review workflow tests

## Dependencies
- `@github/copilot-sdk` npm package
- `simple-git` npm package for fixture git operations
- `tsx` for TypeScript test execution
- Copilot CLI authentication on developer machine

## Risks & Mitigations
- **LLM non-determinism**: Agent output varies between runs. Mitigation: Assert on structural patterns (section presence, ID formats) not exact content.
- **SDK API changes**: `@github/copilot-sdk` is evolving. Mitigation: Isolate SDK calls behind harness abstractions; POC validates current API.
- **Test cost**: Each test consumes API tokens. Mitigation: Keep tests minimal; default timeout prevents runaway sessions.
- **Auth brittleness**: Copilot CLI auth may expire. Mitigation: Clear error message on auth failure; document prerequisite.

## References
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/225
- Copilot SDK Knowledge Base: https://gist.github.com/lossyrob/1ddee9a944476c0f042ea8bc5aa237c0
- Existing POC: `poc/sdk/` in this repo
