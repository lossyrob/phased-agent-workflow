import { after, describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { join } from "path";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { loadSkill } from "../../lib/skills.js";
import { seedReviewArtifacts } from "./review-terminal-state-tracking.test-helper.js";

const LIVE_TURN_TIMEOUT = 180_000;

function buildGithubPrompt(skillContent: string, identifier: string, hardened: boolean): string {
  return [
    "You are executing the paw-review-github skill. Follow the skill exactly.",
    "",
    "CRITICAL RULES:",
    `- Read .paw/reviews/${identifier}/ReviewContext.md and .paw/reviews/${identifier}/ReviewComments.md`,
    "- This is a non-GitHub review context, so do not call GitHub tools",
    hardened
      ? "- Because hardened review state exists, update ReviewContext.md terminal state and output:github status when manual posting instructions are added"
      : "- Because hardened review state is absent, explicitly report legacy best-effort mode and inactive hardened protections",
    "- Do NOT ask the user questions",
    "",
    "Skill documentation:",
    skillContent,
  ].join("\n");
}

describe("review terminal state tracking", { timeout: 240_000 }, () => {
  const contexts: TestContext[] = [];

  after(async () => {
    for (const ctx of contexts) {
      await destroyTestContext(ctx);
    }
  });

  it("records manual posting as terminal external review state for non-GitHub contexts", async () => {
    const skillContent = await loadSkill("paw-review-github");
    const identifier = "feature-review-state-test";

    const ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "review-terminal-state-tracking",
      systemPrompt: buildGithubPrompt(skillContent, identifier, true),
      answerer: new RuleBasedAnswerer([(req) => req.choices?.[0] ?? "yes"], false),
      excludedTools: ["skill", "sql"],
    });
    contexts.push(ctx);

    await seedReviewArtifacts(ctx.fixture.workDir, identifier, true);

    await ctx.session.sendAndWait({
      prompt: [
        `Process .paw/reviews/${identifier}/ReviewComments.md for posting.`,
        "This is a local branch review, so provide manual posting instructions instead of calling GitHub.",
        "Update ReviewContext.md terminal state to reflect that outcome.",
      ].join("\n"),
    }, LIVE_TURN_TIMEOUT);

    const reviewComments = await readFile(join(ctx.fixture.workDir, ".paw/reviews", identifier, "ReviewComments.md"), "utf-8");
    const reviewContext = await readFile(join(ctx.fixture.workDir, ".paw/reviews", identifier, "ReviewContext.md"), "utf-8");

    assert.match(reviewComments, /## Manual Posting Instructions/);
    assert.match(reviewContext, /`output:github` \| `resolved` \| `stage`/);
    assert.match(reviewContext, /### Terminal External Review State[\s\S]*- `manual-posting-provided`/);
    assert.match(reviewContext, /Pending Review ID:\s*`none`/i);
    assert.match(reviewContext, /Reconciliation:\s*current/i);
  });

  it("does not append duplicate manual posting instructions when terminal state already exists", async () => {
    const skillContent = await loadSkill("paw-review-github");
    const identifier = "feature-review-state-idempotent";

    const ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "review-terminal-state-tracking-idempotent",
      systemPrompt: buildGithubPrompt(skillContent, identifier, true),
      answerer: new RuleBasedAnswerer([(req) => req.choices?.[0] ?? "yes"], false),
      excludedTools: ["skill", "sql"],
    });
    contexts.push(ctx);

    await seedReviewArtifacts(ctx.fixture.workDir, identifier, true, {
      outputGithubStatus: "resolved",
      terminalState: "manual-posting-provided",
      includeManualPostingInstructions: true,
    });

    await ctx.session.sendAndWait({
      prompt: [
        `Process .paw/reviews/${identifier}/ReviewComments.md for posting.`,
        "This review already has manual posting instructions for a local branch review.",
        "Preserve the existing terminal state and avoid duplicating the manual posting section.",
      ].join("\n"),
    }, LIVE_TURN_TIMEOUT);

    const reviewComments = await readFile(join(ctx.fixture.workDir, ".paw/reviews", identifier, "ReviewComments.md"), "utf-8");
    const reviewContext = await readFile(join(ctx.fixture.workDir, ".paw/reviews", identifier, "ReviewContext.md"), "utf-8");

    const manualSections = reviewComments.match(/^## Manual Posting Instructions$/gm) ?? [];
    assert.strictEqual(manualSections.length, 1);
    assert.match(reviewContext, /`output:github` \| `resolved` \| `stage`/);
    assert.match(reviewContext, /### Terminal External Review State[\s\S]*- `manual-posting-provided`/);
    assert.match(reviewContext, /Pending Review ID:\s*`none`/i);
  });
});
