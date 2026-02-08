/**
 * Workflow test: paw-implement executes a plan phase, creating actual code.
 *
 * Seeds: Spec.md + ImplementationPlan.md (health endpoint)
 * Exercises: Code creation, test execution, plan checkbox update
 * Verification: Structural assertions + LLM judge
 *
 * Requires: Copilot CLI auth
 * Runtime: ~90-180 seconds (agent runs npm test)
 */
import { describe, it, after } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { join } from "path";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { loadSkill } from "../../lib/skills.js";
import { assertToolCalls } from "../../lib/assertions.js";
import { Judge, RUBRICS } from "../../lib/judge.js";

describe("paw-implement workflow", { timeout: 300_000 }, () => {
  let ctx: TestContext;
  let judge: Judge;

  after(async () => {
    if (ctx) { await destroyTestContext(ctx); }
    if (judge) { await judge.stop(); }
  });

  it("implements a plan phase creating working code", async () => {
    const skillContent = await loadSkill("paw-implement");
    const workId = "test-health";

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.[0] ?? "yes",
    ], false);

    ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "paw-implement",
      systemPrompt: buildImplPrompt(skillContent, workId),
      answerer,
    });

    // Seed spec + plan
    await ctx.fixture.seedWorkflowState(workId, "plan");

    // Install fixture dependencies so the agent can run npm test
    // (the fixture is a real Express app)
    await installFixtureDeps(ctx.fixture.workDir);

    await ctx.session.sendAndWait({
      prompt: [
        `Read the implementation plan at .paw/work/${workId}/ImplementationPlan.md`,
        "Execute Phase 1: add the health endpoint and test.",
        "",
        "After making changes:",
        "1. Run `npm test` to verify",
        "2. Update the phase status checkbox in the plan",
        "3. Commit your changes with a descriptive message",
      ].join("\n"),
    }, 240_000);

    // Verify code was created/modified
    const appContent = await readFile(join(ctx.fixture.workDir, "src/app.ts"), "utf-8");
    assert.match(appContent, /health/i, "app.ts should contain health endpoint");

    // Verify tests were run (agent may use npm test, npm run test, node --test, npx, etc.)
    assertToolCalls(ctx.toolLog, {
      bashMustInclude: [/npm\s+(test|run\s+test)|node\s+--test|npx.*test/],
      bashMustNotInclude: [/git push/, /gh pr create/],
    });

    // LLM Judge — evaluate the implementation
    judge = new Judge();
    await judge.start();

    let testContent = "";
    try {
      testContent = await readFile(join(ctx.fixture.workDir, "tests/app.test.js"), "utf-8");
    } catch { /* test file may not exist */ }

    const verdict = await judge.evaluate({
      context: [
        "Agent was asked to add a GET /health endpoint to an Express app.",
        "The endpoint should return { status: 'ok' } with 200 status.",
      ].join("\n"),
      artifact: [
        "=== src/app.ts ===",
        appContent,
        "",
        "=== tests/app.test.js ===",
        testContent || "(no test file found)",
      ].join("\n"),
      rubric: RUBRICS.implementation,
    });

    if (!verdict.pass) {
      throw new Error(
        `Judge FAILED implementation:\n  Scores: ${JSON.stringify(verdict.scores)}\n  ${verdict.rationale}`,
      );
    }
  });
});

async function installFixtureDeps(workDir: string): Promise<void> {
  const { execSync } = await import("child_process");
  execSync("npm install --silent", { cwd: workDir, stdio: "pipe" });
}

function buildImplPrompt(skillContent: string, workId: string): string {
  return [
    "You are a PAW implementation agent. Execute plan phases by writing code.",
    "",
    "IMPORTANT RULES:",
    `- Read the plan from .paw/work/${workId}/ImplementationPlan.md`,
    "- Make the code changes described in the plan",
    "- Run tests to verify your changes work",
    "- Commit changes locally with a descriptive message",
    "- Do NOT push to git or create PRs",
    "- Do NOT ask the user questions — use your best judgment",
    "",
    "Reference skill documentation:",
    skillContent,
  ].join("\n");
}
