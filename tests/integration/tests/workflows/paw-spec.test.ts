/**
 * Workflow test: paw-spec creates a valid Spec.md from a feature brief.
 *
 * This is the simplest end-to-end workflow test. It:
 * 1. Creates an isolated git repo from the minimal-ts fixture
 * 2. Loads the paw-spec skill as the system prompt
 * 3. Sends a feature brief to the agent
 * 4. Asserts the agent created a Spec.md with proper structure (FRs, SCs)
 *
 * Requires: Copilot CLI auth (copilot auth status)
 * Runtime: ~30-60 seconds depending on model
 */
import { describe, it, after } from "node:test";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { loadSkill } from "../../lib/skills.js";
import { assertSpecStructure, assertToolCalls } from "../../lib/assertions.js";

describe("paw-spec workflow", { timeout: 120_000 }, () => {
  let ctx: TestContext;

  after(async () => {
    if (ctx) { await destroyTestContext(ctx); }
  });

  it("creates a valid Spec.md from a feature brief", async () => {
    const skillContent = await loadSkill("paw-spec");
    const workId = "test-logging";

    // The spec skill may ask clarifying questions — answer permissively
    const answerer = new RuleBasedAnswerer([
      // If it asks about scope, keep it simple
      (req) => {
        if (/scope|clarif|confirm|proceed|ready/i.test(req.question)) {
          if (req.choices?.length) { return req.choices[0]; }
          return "yes";
        }
        return null;
      },
      // Catch-all: pick first choice or say "yes"
      (req) => req.choices?.[0] ?? "yes",
    ], false);

    ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "paw-spec",
      systemPrompt: buildSpecPrompt(skillContent, workId),
      answerer,
    });

    const response = await ctx.session.sendAndWait({
      prompt: [
        "Write a specification for the following feature brief:",
        "",
        "## Feature: Request Logging Middleware",
        "",
        "Add a simple request logging middleware to the Express app that logs",
        "the HTTP method, URL path, and response status code for each request.",
        "Logs should go to stdout. This is for development debugging only.",
        "",
        `Write the spec to .paw/work/${workId}/Spec.md`,
      ].join("\n"),
    }, 90_000);

    // Verify the agent produced a structurally valid spec
    await assertSpecStructure(ctx.fixture.workDir, workId, {
      hasOverview: true,
      hasFunctionalRequirements: true,
      hasSuccessCriteria: true,
      minFRCount: 2,
    });

    // Verify it used file creation tools (not just printed text)
    assertToolCalls(ctx.toolLog, {
      forbidden: ["git_push"],
      bashMustNotInclude: [/git push/],
    });
  });
});

function buildSpecPrompt(skillContent: string, workId: string): string {
  return [
    "You are a PAW specification writer. Your job is to write a feature specification.",
    "",
    "IMPORTANT RULES:",
    `- Write the spec to the file .paw/work/${workId}/Spec.md`,
    "- Create the directory structure if it doesn't exist",
    "- The spec MUST include: Overview, Functional Requirements (FR-001, FR-002, etc.), and Success Criteria (SC-001, SC-002, etc.)",
    "- Do NOT push to git or create PRs",
    "- Do NOT ask the user questions — use your best judgment",
    "",
    "Reference skill documentation:",
    skillContent,
  ].join("\n");
}
