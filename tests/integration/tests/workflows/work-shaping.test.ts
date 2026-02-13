/**
 * Workflow test T10: work-shaping
 *
 * Tests the paw-work-shaping skill by providing a vague idea and verifying
 * the agent produces a structured WorkShaping.md artifact.
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

describe("work shaping workflow", { timeout: 180_000 }, () => {
  let ctx: TestContext;

  after(async () => {
    if (ctx) { await destroyTestContext(ctx); }
  });

  it("produces a WorkShaping.md from a vague idea", async () => {
    const skillContent = await loadSkill("paw-work-shaping");
    const workId = "test-shaping";

    // Work-shaping asks clarifying questions — answer them to move forward
    const answerer = new RuleBasedAnswerer([
      // For scope/approach questions, pick first choice or say "keep it simple"
      (req) => {
        if (req.choices?.length) { return req.choices[0]; }
        return null;
      },
      // Freeform answers for open questions
      (req) => {
        if (/scope|feature|detail|descri/i.test(req.question)) {
          return "Keep it simple — just basic request counting with an in-memory counter.";
        }
        if (/requirement|constraint|non.?functional/i.test(req.question)) {
          return "No persistence needed. In-memory only. No auth.";
        }
        if (/user|who|audience/i.test(req.question)) {
          return "Internal developers for debugging.";
        }
        return "yes";
      },
    ], false);

    ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "work-shaping",
      systemPrompt: [
        "You are a PAW work-shaping agent. Help clarify vague ideas into structured work items.",
        "",
        "RULES:",
        `- Write the output to .paw/work/${workId}/WorkShaping.md`,
        "- Ask a MAXIMUM of 3 clarifying questions, then produce the artifact",
        "- The artifact should have: Problem Statement, Proposed Approach, Key Decisions, Scope",
        "- Do NOT ask more than 3 questions total",
        "",
        "Skill reference:",
        skillContent,
      ].join("\n"),
      answerer,
    });

    await ctx.session.sendAndWait({
      prompt: [
        "I have a vague idea I want to shape into a work item:",
        "",
        '"I want to add some kind of request tracking to our API so we can see how much traffic we\'re getting."',
        "",
        "Ask me a few clarifying questions, then produce a WorkShaping.md artifact.",
        `Write the artifact to .paw/work/${workId}/WorkShaping.md`,
      ].join("\n"),
    }, 120_000);

    // Assert WorkShaping.md exists
    const content = await assertArtifactExists(ctx.fixture.workDir, workId, "WorkShaping.md");

    // Should have structured sections
    assert.match(
      content,
      /problem|objective|goal|statement/im,
      "WorkShaping.md should have a problem/objective section",
    );

    assert.match(
      content,
      /approach|proposal|solution|scope/im,
      "WorkShaping.md should describe an approach or scope",
    );

    // Verify the answerer was actually consulted (agent asked questions)
    assert.ok(
      answerer.log.length >= 1,
      `Expected at least 1 clarifying question, got ${answerer.log.length}`,
    );
  });
});
