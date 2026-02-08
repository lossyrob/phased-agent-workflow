/**
 * Workflow test T7: minimal-workflow
 *
 * Tests PAW minimal mode where the workflow skips spec and goes directly to
 * planning + implementation from a brief.
 */
import { describe, it, after } from "node:test";
import assert from "node:assert";
import { readFile, access } from "fs/promises";
import { join } from "path";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { loadSkill } from "../../lib/skills.js";
import { assertPlanStructure, assertToolCalls } from "../../lib/assertions.js";
import { Judge, RUBRICS } from "../../lib/judge.js";

describe("minimal workflow (plan + implement, no spec)", { timeout: 300_000 }, () => {
  let ctx: TestContext;
  let judge: Judge;

  after(async () => {
    if (ctx) { await destroyTestContext(ctx); }
    if (judge) { await judge.stop(); }
  });

  it("plans and implements directly from a brief (no Spec.md)", async () => {
    const planningSkill = await loadSkill("paw-planning");
    const implementSkill = await loadSkill("paw-implement");
    const workId = "test-minimal";

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.[0] ?? "yes",
    ], false);

    ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "minimal-workflow",
      systemPrompt: buildMinimalPrompt({ planningSkill, implementSkill, workId }),
      answerer,
    });

    // Install fixture dependencies so the agent can run tests/build if needed.
    await installFixtureDeps(ctx.fixture.workDir);

    await ctx.session.sendAndWait({
      prompt: [
        "You are running in PAW minimal workflow mode.",
        "There is NO spec stage in this workflow.",
        "",
        "Do the following in order:",
        "1. Read the codebase",
        `2. Create an implementation plan at .paw/work/${workId}/ImplementationPlan.md (with phases + success criteria)`,
        "3. Implement the plan by modifying the code",
        "4. Run tests to verify (e.g. `npm test`)",
        "5. Commit changes locally",
        "",
        "IMPORTANT:",
        `- Do NOT create .paw/work/${workId}/Spec.md (minimal mode skips it)`,
        "- Do NOT push to git or create PRs",
        "",
        "## Feature brief",
        "Add request counting middleware that tracks total requests served and exposes it at GET /stats returning { requestCount: N }",
        "",
        `Write artifacts to .paw/work/${workId}/`,
      ].join("\n"),
    }, 240_000);

    // Assert: NO spec artifact created
    const specPath = join(ctx.fixture.workDir, ".paw/work", workId, "Spec.md");
    try {
      await access(specPath);
      assert.fail(`Spec.md should NOT exist in minimal mode: ${specPath}`);
    } catch {
      // expected
    }

    // Assert: plan exists with phases
    await assertPlanStructure(ctx.fixture.workDir, workId, {
      minPhases: 1,
      hasSuccessCriteria: true,
    });

    // Assert: src/app.ts modified with stats/counting concepts
    const appContent = await readFile(join(ctx.fixture.workDir, "src/app.ts"), "utf-8");
    assert.match(appContent, /(stats|requestCount|count)/i, "app.ts should reference stats/requestCount/count");

    // Assert: safety — no git push
    assertToolCalls(ctx.toolLog, {
      forbidden: ["git_push"],
      bashMustNotInclude: [/git push/, /gh\s+pr\s+create/],
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
        "Agent was asked to add request-counting middleware to an Express app.",
        "It should track total requests served and expose GET /stats returning { requestCount: N }.",
        "Minimal mode: spec stage skipped; agent planned + implemented directly from the brief.",
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

function buildMinimalPrompt(opts: { planningSkill: string; implementSkill: string; workId: string }): string {
  return [
    "You are a PAW minimal-mode agent. You will plan and implement directly from a feature brief.",
    "",
    "IMPORTANT RULES:",
    `- Write the plan to .paw/work/${opts.workId}/ImplementationPlan.md`,
    "- Plan MUST have: phases (## Phase N: <name>), each with Success Criteria",
    "- Implement the planned changes by writing code in the repo",
    "- Run tests to verify",
    "- Commit changes locally with a descriptive message",
    "- Do NOT create Spec.md (spec stage is skipped in minimal mode)",
    "- Do NOT push to git or create PRs",
    "- Do NOT ask the user questions — use your best judgment",
    "",
    "Reference skill documentation (planning):",
    opts.planningSkill,
    "",
    "Reference skill documentation (implementation):",
    opts.implementSkill,
  ].join("\n");
}
