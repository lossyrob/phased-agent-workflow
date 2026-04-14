import { after, describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { join } from "path";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { loadSkill } from "../../lib/skills.js";
import { seedReviewArtifacts } from "./review-terminal-state-tracking.test-helper.js";

const LIVE_TURN_TIMEOUT = 180_000;

describe("review legacy control-state mode", { timeout: 240_000 }, () => {
  const contexts: TestContext[] = [];

  after(async () => {
    for (const ctx of contexts) {
      await destroyTestContext(ctx);
    }
  });

  it("keeps non-GitHub review posting usable without control state and reports legacy mode", async () => {
    const skillContent = await loadSkill("paw-review-github");
    const identifier = "feature-review-legacy-test";

    const ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "review-legacy-control-state-mode",
      systemPrompt: [
        "You are executing the paw-review-github skill. Follow the skill exactly.",
        "",
        "CRITICAL RULES:",
        `- Read .paw/reviews/${identifier}/ReviewContext.md and .paw/reviews/${identifier}/ReviewComments.md`,
        "- This is a non-GitHub review context, so do not call GitHub tools",
        "- Because review control state is absent, explicitly report legacy best-effort mode and inactive control-state protections",
        "- Do NOT ask the user questions",
        "",
        "Skill documentation:",
        skillContent,
      ].join("\n"),
      answerer: new RuleBasedAnswerer([(req) => req.choices?.[0] ?? "yes"], false),
      excludedTools: ["skill", "sql"],
    });
    contexts.push(ctx);

    await seedReviewArtifacts(ctx.fixture.workDir, identifier, false);

    const response = await ctx.session.sendAndWait({
      prompt: [
        `Process .paw/reviews/${identifier}/ReviewComments.md for posting.`,
        "This is a local branch review, so provide manual posting instructions instead of calling GitHub.",
      ].join("\n"),
    }, LIVE_TURN_TIMEOUT);

    const content = response?.data?.content ?? "";
    const reviewComments = await readFile(join(ctx.fixture.workDir, ".paw/reviews", identifier, "ReviewComments.md"), "utf-8");

    assert.match(content, /legacy/i);
    assert.match(content, /control-state protections[\s\S]*inactive/i);
    assert.match(reviewComments, /## Manual Posting Instructions/);
  });
});
