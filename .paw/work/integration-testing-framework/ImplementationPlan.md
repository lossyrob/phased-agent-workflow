# Integration Testing Framework Implementation Plan

## Overview
Implement a local-first integration testing framework for PAW that programmatically drives Copilot SDK sessions to verify skill behavior. The framework creates isolated test contexts (SDK session + temp git repo + auto-answerer + tool policy), runs skills against them, and asserts on produced artifacts and tool traces.

## Current State Analysis
- PAW has unit tests in `src/test/suite/` using Mocha + VS Code test runner
- No integration tests exist for agent/skill behavior
- `poc/sdk/` validates the Copilot SDK patterns: session creation, `sendAndWait`, `onUserInputRequest`, context isolation, session destroy
- Root project is CommonJS (`"module": "commonjs"` in tsconfig); POC SDK is ESM
- Integration tests should be a separate package to avoid interfering with the VS Code extension build

## Desired End State
- `tests/integration/` directory with its own `package.json` (ESM + tsx)
- Harness library providing `TestContext`, `TestFixture`, `Answerer`, `ToolPolicy`, `ToolCallLog`
- `minimal-ts` fixture template (Express app with one route and one test)
- 3+ passing tests: paw-spec artifact creation, paw-planning phase structure, negative case
- npm scripts in root `package.json` for `test:integration`
- Debug mode and workspace preservation support

## What We're NOT Doing
- CI/GitHub Actions workflow
- VS Code extension integration tests
- LLM-as-judge semantic comparison
- Record/replay cassette system
- Multiple fixture templates
- Runtime tests invoking the `copilot` CLI binary directly

## Phase Status
- [ ] **Phase 1: Harness Library** - Core test infrastructure (fixtures, answerer, tool policy, trace, assertions)
- [ ] **Phase 2: Fixture & Tests** - Minimal-ts fixture, 3+ integration tests, npm scripts
- [ ] **Phase 3: Documentation** - DEVELOPING.md updates, Docs.md

---

## Phase 1: Harness Library

Build the core test infrastructure as a separate ESM package.

### Changes Required:

- **`tests/integration/package.json`**: New package — ESM, dependencies on `@github/copilot-sdk`, `simple-git`, `tsx`, `zod`. Scripts for `test`, `test:skills`, `test:workflows`.

- **`tests/integration/tsconfig.json`**: TypeScript config — ESNext target, NodeNext module, strict mode.

- **`tests/integration/lib/harness.ts`**: `TestContext` interface + `createTestContext()` + `destroyTestContext()`. Session creation uses `useLoggedInUser: true` by default with optional Azure BYOK via `PAW_TEST_PROVIDER` env var. Wires `onUserInputRequest`, `onPreToolUse`, `onPostToolUse` hooks. Follow pattern from `poc/sdk/src/test-stages.ts`.

- **`tests/integration/lib/fixtures.ts`**: `TestFixture` class — `clone()` copies template to temp dir, initializes git repo. `seedWorkflowState()` copies pre-built artifacts. `cleanup()` removes temp dir. Uses `simple-git`.

- **`tests/integration/lib/answerer.ts`**: `RuleBasedAnswerer` — fail-closed (throws on unmatched questions). `pawCommonRules()` factory for common PAW decisions (workflow mode, branch, work ID). Logs all Q&A pairs.

- **`tests/integration/lib/tool-policy.ts`**: `ToolPolicy` class — denies `git push`, `gh pr/issue create`, `rm -rf` outside workspace, file writes (`create`/`edit`) outside workspace root. Returns allow/deny/stub decisions.

- **`tests/integration/lib/trace.ts`**: `ToolCallLog` — records tool name, input, timing, result/error. `findPending()` for matching post-hook to pre-hook entries.

- **`tests/integration/lib/assertions.ts`**: `assertArtifactExists()`, `assertSpecStructure()`, `assertPlanStructure()`, `assertToolCalls()` (with bash command content matchers), `assertCodeBehavior()`.

- **`tests/integration/lib/skills.ts`**: `loadSkill(name)` reads `skills/<name>/SKILL.md` from repo root. `loadAgent(name)` reads `agents/<name>.agent.md`.

### Success Criteria:

#### Automated Verification:
- [ ] `cd tests/integration && npm install` succeeds
- [ ] `cd tests/integration && npx tsc --noEmit` passes with no type errors

#### Manual Verification:
- [ ] Library modules import correctly in a test file
- [ ] `loadSkill("paw-spec")` returns the SKILL.md content

---

## Phase 2: Fixture & Tests

Create the test fixture and write 3+ integration tests.

### Changes Required:

- **`tests/integration/fixtures/minimal-ts/`**: Minimal Express + TypeScript app. `package.json` (express, typescript, jest deps), `tsconfig.json`, `src/app.ts` (Express app exporting app), `src/routes/index.ts` (GET / → `{ status: "ok" }`), `tests/app.test.ts` (basic route test), `README.md`.

- **`tests/integration/tests/skills/paw-spec.test.ts`**: Test that loads paw-spec skill, sends "Add /health endpoint" brief, asserts Spec.md exists with FR-*/SC-* patterns. Uses `RuleBasedAnswerer` with `pawCommonRules`.

- **`tests/integration/tests/skills/paw-planning.test.ts`**: Seeds a Spec.md fixture, loads paw-planning skill, sends planning prompt, asserts ImplementationPlan.md exists with at least one phase section.

- **`tests/integration/fixtures/seeds/spec/Spec.md`**: Pre-built spec for a simple /health endpoint feature (used by planning test).

- **`tests/integration/tests/skills/negative.test.ts`**: Tests fail-closed answerer behavior (unmatched question throws) and tool policy behavior (git push denied).

- **`package.json` (root)**: Add `test:integration` script that runs `cd tests/integration && npm test`.

### Success Criteria:

#### Automated Verification:
- [ ] `npm run test:integration` from repo root executes all tests
- [ ] At least 3 tests pass
- [ ] `npm run lint` still passes (integration tests are outside eslint scope)

#### Manual Verification:
- [ ] `PAW_TEST_DEBUG=1 npm run test:integration` shows agent output
- [ ] `PAW_TEST_KEEP_WORKSPACE=1 npm run test:integration` preserves temp dirs

---

## Phase 3: Documentation

### Changes Required:
- **`.paw/work/integration-testing-framework/Docs.md`**: Technical reference (load `paw-docs-guidance`)
- **`DEVELOPING.md`**: Add "Integration Tests" section with: prerequisites, running tests, debug mode, writing new tests, architecture overview

### Success Criteria:
- [ ] DEVELOPING.md integration test section is accurate and complete
- [ ] Docs.md captures implementation decisions and architecture

---

## References
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/225
- Spec: `.paw/work/integration-testing-framework/Spec.md`
- POC: `poc/sdk/` (validated SDK patterns)
