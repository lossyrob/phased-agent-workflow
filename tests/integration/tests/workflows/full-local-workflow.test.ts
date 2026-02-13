/**
 * Workflow test T6: full-local-workflow (golden path)
 *
 * The most important integration test: exercises the complete PAW workflow
 * from spec → plan → implement in a single multi-stage session.
 * Uses local strategy, final-pr-only review policy.
 *
 * Requires: Copilot CLI auth
 * Runtime: ~3-5 minutes
 */
import { describe, it, after } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { join } from "path";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { loadSkill } from "../../lib/skills.js";
import {
  assertSpecStructure,
  assertPlanStructure,
  assertToolCalls,
} from "../../lib/assertions.js";
import { Judge, RUBRICS } from "../../lib/judge.js";

describe("full local workflow (spec → plan → implement)", { timeout: 600_000 }, () => {
  let ctx: TestContext;
  let judge: Judge;

  after(async () => {
    if (ctx) { await destroyTestContext(ctx); }
    if (judge) { await judge.stop(); }
  });

  it("produces spec, plan, and working code from a brief", async () => {
    const specSkill = await loadSkill("paw-spec");
    const planSkill = await loadSkill("paw-planning");
    const implSkill = await loadSkill("paw-implement");
    const workId = "test-full-workflow";

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.[0] ?? "yes",
    ], false);

    ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "full-workflow",
      systemPrompt: buildFullWorkflowPrompt({ specSkill, planSkill, implSkill, workId }),
      answerer,
    });

    // Install fixture deps so agent can run tests
    await installDeps(ctx.fixture.workDir);

    await ctx.session.sendAndWait({
      prompt: [
        "Execute the full PAW workflow for this feature:",
        "",
        "## Feature: Health Check Endpoint",
        "",
        "Add a GET /health endpoint to the Express app that returns",
        '{ status: "ok", uptime: <seconds since start> } with 200 status.',
        "Include a test that verifies the endpoint.",
        "",
        "Stages to execute IN ORDER:",
        `1. SPEC: Write a specification to .paw/work/${workId}/Spec.md`,
        `2. PLAN: Create an implementation plan at .paw/work/${workId}/ImplementationPlan.md`,
        "3. IMPLEMENT: Make the code changes, write REAL tests (not placeholders!), run `npm test`, commit locally",
        "",
        "CRITICAL: The test file must actually test the /health endpoint — make HTTP requests and assert responses.",
        "Do NOT push or create PRs. Do NOT ask the user questions.",
      ].join("\n"),
    }, 480_000);

    // === Structural Assertions ===

    // Spec exists with proper structure
    await assertSpecStructure(ctx.fixture.workDir, workId, {
      hasOverview: true,
      hasFunctionalRequirements: true,
      hasSuccessCriteria: true,
      minFRCount: 2,
    });

    // Plan exists with phases
    await assertPlanStructure(ctx.fixture.workDir, workId, {
      minPhases: 1,
      hasSuccessCriteria: true,
    });

    // Code was modified with health endpoint
    const appContent = await readFile(join(ctx.fixture.workDir, "src/app.ts"), "utf-8");
    assert.match(appContent, /health/i, "app.ts should contain health endpoint");
    assert.match(appContent, /uptime|status/i, "app.ts should reference uptime or status");

    // Safety: no push, no PR
    assertToolCalls(ctx.toolLog, {
      forbidden: ["git_push"],
      bashMustNotInclude: [/git push/, /gh\s+pr\s+create/],
    });

    // === LLM Judge ===
    judge = new Judge();
    await judge.start();

    // Judge the spec
    const specContent = await readFile(
      join(ctx.fixture.workDir, ".paw/work", workId, "Spec.md"), "utf-8",
    );
    const specVerdict = await judge.evaluate({
      context: "Agent was asked to write a spec for a health check endpoint returning { status, uptime }.",
      artifact: specContent,
      rubric: RUBRICS.spec,
    });
    if (!specVerdict.pass) {
      throw new Error(`Judge FAILED spec:\n  ${JSON.stringify(specVerdict.scores)}\n  ${specVerdict.rationale}`);
    }

    // Judge the plan
    const planContent = await readFile(
      join(ctx.fixture.workDir, ".paw/work", workId, "ImplementationPlan.md"), "utf-8",
    );
    const planVerdict = await judge.evaluate({
      context: "Agent was asked to create a plan for implementing a health check endpoint.",
      artifact: planContent,
      rubric: RUBRICS.plan,
    });
    if (!planVerdict.pass) {
      throw new Error(`Judge FAILED plan:\n  ${JSON.stringify(planVerdict.scores)}\n  ${planVerdict.rationale}`);
    }

    // Judge the implementation
    let testContent = "";
    try {
      testContent = await readFile(join(ctx.fixture.workDir, "tests/app.test.js"), "utf-8");
    } catch {
      // Try alternative test file locations
      for (const p of ["tests/health.test.js", "tests/health.test.ts", "test/health.test.js", "test/app.test.js"]) {
        try {
          testContent = await readFile(join(ctx.fixture.workDir, p), "utf-8");
          break;
        } catch { /* try next */ }
      }
    }

    const implVerdict = await judge.evaluate({
      context: [
        "Agent implemented a GET /health endpoint returning { status: 'ok', uptime: N }.",
        "This was a multi-stage task (spec + plan + implement) so test coverage may be incomplete.",
        "Focus evaluation on whether the endpoint itself is correctly implemented.",
      ].join("\n"),
      artifact: [
        "=== src/app.ts ===",
        appContent,
        "",
        "=== test files ===",
        testContent || "(no dedicated health test file found — may use existing test)",
      ].join("\n"),
      rubric: [
        "Evaluate this implementation result from a multi-stage workflow:",
        "- endpoint_correctness: Does the /health endpoint return { status, uptime } with 200? (1-5)",
        "- code_quality: Is the code clean and well-structured? (1-5)",
        "- integration: Does the endpoint integrate properly with the Express app? (1-5)",
        "- safety: No destructive operations, no secrets, no unintended side effects? (1-5)",
      ].join("\n"),
    });
    if (!implVerdict.pass) {
      throw new Error(`Judge FAILED implementation:\n  ${JSON.stringify(implVerdict.scores)}\n  ${implVerdict.rationale}`);
    }
  });
});

async function installDeps(workDir: string): Promise<void> {
  const { execSync } = await import("child_process");
  execSync("npm install --silent", { cwd: workDir, stdio: "pipe" });
}

function buildFullWorkflowPrompt(opts: {
  specSkill: string;
  planSkill: string;
  implSkill: string;
  workId: string;
}): string {
  return [
    "You are a PAW full-workflow agent. Execute spec → plan → implement stages in sequence.",
    "",
    "CRITICAL RULES:",
    `- Write spec to .paw/work/${opts.workId}/Spec.md`,
    `- Write plan to .paw/work/${opts.workId}/ImplementationPlan.md`,
    "- Spec MUST have: Overview, FR-xxx requirements, SC-xxx success criteria",
    "- Plan MUST have: ## Phase N sections with Success Criteria",
    "- After implementing the endpoint, you MUST write a REAL test file (not a placeholder!)",
    "- The test MUST actually test the /health endpoint: make an HTTP request, assert status 200, assert response body",
    "- Run `npm test` to verify all tests pass",
    "- Commit changes locally with descriptive messages",
    "- Do NOT push to git or create PRs",
    "- Do NOT ask the user questions — use your best judgment",
    "- Create directories with mkdir -p as needed",
    "",
    "Spec skill reference:",
    opts.specSkill.slice(0, 2000),
    "",
    "Planning skill reference:",
    opts.planSkill.slice(0, 2000),
    "",
    "Implementation skill reference:",
    opts.implSkill.slice(0, 2000),
  ].join("\n");
}
