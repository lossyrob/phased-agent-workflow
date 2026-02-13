/**
 * Workflow test T8: code-research
 *
 * Tests the paw-code-research skill by having the agent analyze
 * a codebase and produce a CodeResearch.md artifact with file:line references.
 *
 * Requires: Copilot CLI auth
 * Runtime: ~30-90 seconds
 */
import { describe, it, after } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { join } from "path";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { loadSkill } from "../../lib/skills.js";
import { assertArtifactExists } from "../../lib/assertions.js";
import { Judge } from "../../lib/judge.js";

describe("code research workflow", { timeout: 180_000 }, () => {
  let ctx: TestContext;
  let judge: Judge;

  after(async () => {
    if (ctx) { await destroyTestContext(ctx); }
    if (judge) { await judge.stop(); }
  });

  it("produces a CodeResearch.md with file:line references", async () => {
    const skillContent = await loadSkill("paw-code-research");
    const workId = "test-research";

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.[0] ?? "yes",
    ], false);

    ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "code-research",
      systemPrompt: [
        "You are a PAW code research agent. Analyze the codebase and document findings.",
        "",
        "RULES:",
        `- Write findings to .paw/work/${workId}/CodeResearch.md`,
        "- Include file:line references for all findings",
        "- Document: project structure, entry points, testing approach, build system",
        "- Do NOT modify any code",
        "- Do NOT ask the user questions",
        "",
        "Skill reference:",
        skillContent,
      ].join("\n"),
      answerer,
    });

    await ctx.session.sendAndWait({
      prompt: [
        "Research this codebase and create a CodeResearch.md documenting:",
        "1. Project structure and entry points",
        "2. How tests are run (commands, framework)",
        "3. Build system and dependencies",
        "4. Any existing middleware or route patterns",
        "",
        `Write the research artifact to .paw/work/${workId}/CodeResearch.md`,
      ].join("\n"),
    }, 120_000);

    // Assert artifact exists
    const content = await assertArtifactExists(ctx.fixture.workDir, workId, "CodeResearch.md");

    // Should contain file references (file.ts:N or file.js:N pattern)
    assert.match(
      content,
      /\w+\.\w+:\d+|`[^`]+\.\w+`/m,
      "CodeResearch.md should contain file references",
    );

    // Should reference key files from the fixture
    assert.match(content, /app\.ts|package\.json|tsconfig/im, "Should reference project files");

    // Judge evaluation
    judge = new Judge();
    await judge.start();

    const researchRubric = [
      "Evaluate this code research artifact:",
      "- completeness: Does it cover project structure, entry points, testing, build system? (1-5)",
      "- accuracy: Are file references correct and specific? (1-5)",
      "- usefulness: Would this help someone plan an implementation? (1-5)",
      "- structure: Is it well-organized with clear sections? (1-5)",
    ].join("\n");

    const verdict = await judge.evaluate({
      context: "Agent researched a minimal Express/TypeScript app and documented its structure.",
      artifact: content,
      rubric: researchRubric,
    });

    if (!verdict.pass) {
      throw new Error(
        `Judge FAILED code research:\n  ${JSON.stringify(verdict.scores)}\n  ${verdict.rationale}`,
      );
    }
  });
});
