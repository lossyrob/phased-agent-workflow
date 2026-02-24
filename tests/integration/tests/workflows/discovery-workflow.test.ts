/**
 * Workflow test: Discovery workflow produces Extraction.md from input documents.
 *
 * Tests the paw-discovery-extraction skill by:
 * 1. Creating an isolated git repo with input documents
 * 2. Running extraction to produce Extraction.md
 * 3. Asserting the artifact has proper structure (themes, source attribution)
 *
 * Requires: Copilot CLI auth (copilot auth status)
 * Runtime: ~60-120 seconds depending on model
 */
import { describe, it, after } from "node:test";
import assert from "node:assert";
import { mkdir, writeFile, readFile } from "fs/promises";
import { join } from "path";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { loadSkill } from "../../lib/skills.js";
import { assertToolCalls } from "../../lib/assertions.js";

describe("discovery workflow - extraction", { timeout: 180_000 }, () => {
  let ctx: TestContext;

  after(async () => {
    if (ctx) { await destroyTestContext(ctx); }
  });

  it("produces an Extraction.md from input documents", async () => {
    const extractionSkill = await loadSkill("paw-discovery-extraction");
    const workId = "test-discovery";

    // Extraction may ask clarifying questions
    const answerer = new RuleBasedAnswerer([
      (req) => {
        if (req.choices?.length) { return req.choices[0]; }
        return null;
      },
      (req) => {
        if (/proceed|confirm|ready|continue/i.test(req.question)) {
          return "yes";
        }
        return "yes";
      },
    ], false);

    ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "discovery-extraction",
      systemPrompt: buildExtractionPrompt(extractionSkill, workId),
      answerer,
    });

    // Seed input documents
    const inputsDir = join(ctx.fixture.workDir, `.paw/discovery/${workId}/inputs`);
    await mkdir(inputsDir, { recursive: true });

    // Create sample input documents
    await writeFile(join(inputsDir, "product-roadmap.md"), `
# Q1 Product Roadmap

## Theme: User Authentication
We need to implement OAuth2 login with Google and GitHub.
Users have requested SSO support for enterprise accounts.

## Theme: Performance
The dashboard loads too slowly. We need to optimize database queries.
Consider adding caching for frequently accessed data.

## Theme: Mobile Support
Our mobile users struggle with the current responsive design.
Build a dedicated mobile view with touch-optimized controls.
`);

    await writeFile(join(inputsDir, "meeting-notes.txt"), `
Engineering Meeting - Dec 15

Discussion Points:
1. Auth sprint planning - OAuth is top priority per product
2. Performance issues - slow queries on user dashboard identified
3. Mobile - PM wants this for Q2 but eng thinks sooner
4. Tech debt - need to address deprecated dependencies

Action Items:
- Sarah: Spike on OAuth2 implementation
- Mike: Profile slow queries
- Team: Mobile feasibility assessment
`);

    // Create DiscoveryContext.md
    const contextDir = join(ctx.fixture.workDir, `.paw/discovery/${workId}`);
    await writeFile(join(contextDir, "DiscoveryContext.md"), `---
work_id: ${workId}
created: 2024-01-15
current_stage: extraction
review_policy: every-stage
---

# Discovery Context

## Configuration
- **Work ID**: ${workId}
- **Review Policy**: every-stage
`);

    // Run extraction
    await ctx.session.sendAndWait({
      prompt: [
        "Run the Discovery extraction stage on the input documents.",
        "",
        `The discovery work directory is: .paw/discovery/${workId}/`,
        "Input documents are in the inputs/ folder.",
        "",
        `Write the extraction output to .paw/discovery/${workId}/Extraction.md`,
        "Include YAML frontmatter with source_documents and theme_count.",
      ].join("\n"),
    }, 120_000);

    // Assert Extraction.md exists and has proper structure
    const extractionPath = join(contextDir, "Extraction.md");
    let extractionContent: string;
    try {
      extractionContent = await readFile(extractionPath, "utf-8");
    } catch {
      assert.fail(`Extraction.md not found at ${extractionPath}`);
    }

    // Should have YAML frontmatter
    assert.match(
      extractionContent,
      /^---\n/,
      "Extraction.md should start with YAML frontmatter",
    );

    // Should mention source documents
    assert.match(
      extractionContent,
      /source_documents|source_document/im,
      "Extraction.md frontmatter should list source documents",
    );

    // Should have themes with source attribution
    assert.match(
      extractionContent,
      /theme|requirement|finding/im,
      "Extraction.md should contain extracted themes or requirements",
    );

    // Should reference at least one of the input documents
    assert.ok(
      extractionContent.includes("roadmap") ||
      extractionContent.includes("meeting") ||
      extractionContent.includes("product"),
      "Extraction.md should reference input documents",
    );

    // Verify no forbidden operations
    assertToolCalls(ctx.toolLog, {
      forbidden: ["git_push"],
      bashMustNotInclude: [/git push/],
    });
  });
});

function buildExtractionPrompt(skillContent: string, workId: string): string {
  return [
    "You are a PAW Discovery extraction agent. Your job is to extract themes and requirements from input documents.",
    "",
    "IMPORTANT RULES:",
    `- Read input documents from .paw/discovery/${workId}/inputs/`,
    `- Write output to .paw/discovery/${workId}/Extraction.md`,
    "- Include YAML frontmatter with: source_documents (list), theme_count (number)",
    "- Extract themes with source attribution (which document, which section)",
    "- Group related requirements under themes",
    "- Do NOT push to git or create PRs",
    "",
    "Reference skill documentation:",
    skillContent,
  ].join("\n");
}
