/**
 * Workflow test: sot-perspectives
 *
 * Tests the SoT engine's perspective overlay feature by running a review
 * with explicit perspectives and verifying output structure.
 *
 * Requires: Copilot CLI auth
 * Runtime: ~2-3 minutes
 */
import { describe, it, after } from "node:test";
import assert from "node:assert";
import { readFile, readdir, mkdir } from "fs/promises";
import { join } from "path";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { loadSkill } from "../../lib/skills.js";

describe("sot perspective overlays", { timeout: 300_000 }, () => {
  let ctx: TestContext;

  after(async () => {
    if (ctx) { await destroyTestContext(ctx); }
  });

  it("produces perspective-attributed findings with correct file naming", async () => {
    const sotSkill = await loadSkill("paw-sot");
    const outputDir = "reviews";

    const answerer = new RuleBasedAnswerer([
      // Accept defaults for any interactive prompts
      (req) => req.choices?.[0] ?? "continue",
    ], false);

    ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "sot-perspectives",
      systemPrompt: [
        "You are a SoT review engine. Execute a society-of-thought review with perspective overlays.",
        "",
        "RULES:",
        "- Use ONLY the security and testing specialists (2 specialists)",
        "- Use perspectives: premortem, red-team (2 perspectives, explicit names)",
        "- Use interaction_mode: parallel",
        "- Use interactive: false",
        `- Write all output files to ${outputDir}/`,
        "- The review type is 'diff' reviewing the src/ directory",
        "- Do NOT ask the user questions",
        "- Do NOT enter moderator mode",
        "- Complete the full review including synthesis",
        "",
        "When writing findings, include the **Perspective** field in each finding header.",
        "When writing REVIEW-SYNTHESIS.md, include the Perspective Diversity section.",
        "",
        "Skill reference:",
        sotSkill,
      ].join("\n"),
      answerer,
    });

    // Create output directory
    const reviewsDir = join(ctx.fixture.workDir, outputDir);
    await mkdir(reviewsDir, { recursive: true });

    await ctx.session.sendAndWait({
      prompt: [
        "Run a society-of-thought review with these settings:",
        "- type: diff",
        "- coordinates: src/ directory",
        `- output_dir: ${outputDir}/`,
        "- specialists: security, testing",
        "- interaction_mode: parallel",
        "- interactive: false",
        "- perspectives: premortem, red-team",
        "- perspective_cap: 2",
        "",
        "Execute the review and produce all output files including REVIEW-SYNTHESIS.md.",
      ].join("\n"),
    }, 240_000);

    // Read output directory
    const outputFiles = await readdir(reviewsDir);

    // Assert REVIEW-SYNTHESIS.md exists
    assert.ok(
      outputFiles.includes("REVIEW-SYNTHESIS.md"),
      `Expected REVIEW-SYNTHESIS.md in output files, got: ${outputFiles.join(", ")}`,
    );

    // Assert perspective-attributed review files exist (REVIEW-{SPECIALIST}-{PERSPECTIVE}.md pattern)
    // Use expected filenames to avoid false-positives on hyphenated specialist names
    const expectedPerspectivePatterns = [
      /^REVIEW-security-(premortem|red-team|baseline)\.md$/,
      /^REVIEW-testing-(premortem|red-team|baseline)\.md$/,
    ];
    const perspectiveFiles = outputFiles.filter(f =>
      expectedPerspectivePatterns.some(p => p.test(f)),
    );
    assert.ok(
      perspectiveFiles.length > 0,
      `Expected perspective-attributed review files (REVIEW-{SPECIALIST}-{PERSPECTIVE}.md), got: ${outputFiles.join(", ")}`,
    );

    // Read synthesis and check structure
    const synthesis = await readFile(join(reviewsDir, "REVIEW-SYNTHESIS.md"), "utf-8");

    // Should contain Perspective Diversity section
    assert.match(
      synthesis,
      /perspective diversity/im,
      "REVIEW-SYNTHESIS.md should contain a Perspective Diversity section",
    );

    // Should contain perspective metadata in Review Summary
    assert.match(
      synthesis,
      /perspectives?:/im,
      "REVIEW-SYNTHESIS.md Review Summary should contain perspective metadata",
    );

    // Check that at least one review file contains the **Perspective** field
    let foundPerspectiveField = false;
    for (const file of outputFiles) {
      if (file === "REVIEW-SYNTHESIS.md" || file === ".gitignore") continue;
      const content = await readFile(join(reviewsDir, file), "utf-8");
      if (/\*\*Perspective\*\*/.test(content)) {
        foundPerspectiveField = true;
        break;
      }
    }
    assert.ok(
      foundPerspectiveField,
      "At least one review file should contain the **Perspective** field in findings",
    );
  });

  it("produces standard output with no perspective artifacts when perspectives: none", async () => {
    const sotSkill = await loadSkill("paw-sot");
    const outputDir = "reviews-none";

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.[0] ?? "continue",
    ], false);

    ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "sot-perspectives-none",
      systemPrompt: [
        "You are a SoT review engine. Execute a society-of-thought review WITHOUT perspective overlays.",
        "",
        "RULES:",
        "- Use ONLY the security and testing specialists (2 specialists)",
        "- Use perspectives: none",
        "- Use interaction_mode: parallel",
        "- Use interactive: false",
        `- Write all output files to ${outputDir}/`,
        "- The review type is 'diff' reviewing the src/ directory",
        "- Do NOT ask the user questions",
        "- Do NOT enter moderator mode",
        "- Complete the full review including synthesis",
        "",
        "When perspectives is none, do NOT include the **Perspective** field in findings.",
        "When writing REVIEW-SYNTHESIS.md, do NOT include a Perspective Diversity section.",
        "",
        "Skill reference:",
        sotSkill,
      ].join("\n"),
      answerer,
    });

    const reviewsDir = join(ctx.fixture.workDir, outputDir);
    await mkdir(reviewsDir, { recursive: true });

    await ctx.session.sendAndWait({
      prompt: [
        "Run a society-of-thought review with these settings:",
        "- type: diff",
        "- coordinates: src/ directory",
        `- output_dir: ${outputDir}/`,
        "- specialists: security, testing",
        "- interaction_mode: parallel",
        "- interactive: false",
        "- perspectives: none",
        "",
        "Execute the review and produce all output files including REVIEW-SYNTHESIS.md.",
      ].join("\n"),
    }, 240_000);

    const outputFiles = await readdir(reviewsDir);

    // Assert REVIEW-SYNTHESIS.md exists
    assert.ok(
      outputFiles.includes("REVIEW-SYNTHESIS.md"),
      `Expected REVIEW-SYNTHESIS.md in output files, got: ${outputFiles.join(", ")}`,
    );

    // Assert standard naming (REVIEW-{SPECIALIST}.md, no perspective suffix)
    const standardFiles = outputFiles.filter(f =>
      /^REVIEW-(security|testing)\.md$/.test(f),
    );
    assert.ok(
      standardFiles.length > 0,
      `Expected standard review files (REVIEW-{SPECIALIST}.md), got: ${outputFiles.join(", ")}`,
    );

    // Assert NO perspective-suffixed files exist
    const perspectiveFiles = outputFiles.filter(f =>
      /^REVIEW-.+-.+\.md$/.test(f) && f !== "REVIEW-SYNTHESIS.md",
    );
    assert.strictEqual(
      perspectiveFiles.length,
      0,
      `Expected no perspective-attributed files with perspectives: none, got: ${perspectiveFiles.join(", ")}`,
    );

    // Read synthesis and verify no Perspective Diversity section
    const synthesis = await readFile(join(reviewsDir, "REVIEW-SYNTHESIS.md"), "utf-8");
    assert.doesNotMatch(
      synthesis,
      /perspective diversity/im,
      "REVIEW-SYNTHESIS.md should NOT contain a Perspective Diversity section when perspectives: none",
    );

    // Verify no **Perspective** field in individual review files
    for (const file of standardFiles) {
      const content = await readFile(join(reviewsDir, file), "utf-8");
      assert.doesNotMatch(
        content,
        /\*\*Perspective\*\*/,
        `${file} should NOT contain **Perspective** field when perspectives: none`,
      );
    }
  });
});
