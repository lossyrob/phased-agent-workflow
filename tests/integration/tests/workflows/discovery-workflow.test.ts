/**
 * Workflow tests for PAW Discovery workflow stages.
 *
 * Tests the Discovery workflow stages:
 * - Extraction: produces Extraction.md from input documents
 * - Mapping: delegates to paw-code-research and produces CapabilityMap.md
 * - Correlation: cross-references themes and capabilities into Correlation.md
 * - Prioritization: applies 5-factor scoring to produce Roadmap.md
 *
 * Each test seeds prerequisite artifacts from previous stages.
 *
 * Requires: Copilot CLI auth (copilot auth status)
 * Runtime: ~60-120 seconds per test depending on model
 */
import { describe, it, after } from "node:test";
import assert from "node:assert";
import { mkdir, writeFile, readFile } from "fs/promises";
import { join } from "path";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { loadSkill } from "../../lib/skills.js";
import { assertToolCalls } from "../../lib/assertions.js";
import { Judge } from "../../lib/judge.js";

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

// ============================================================================
// Mapping Stage Tests
// ============================================================================

describe("discovery workflow - mapping", { timeout: 240_000 }, () => {
  let ctx: TestContext;
  let judge: Judge;

  after(async () => {
    if (ctx) { await destroyTestContext(ctx); }
    if (judge) { await judge.stop(); }
  });

  it("produces CapabilityMap.md with paw-code-research delegation", async () => {
    const mappingSkill = await loadSkill("paw-discovery-mapping");
    const workId = "test-mapping";

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.[0] ?? "yes",
    ], false);

    ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "discovery-mapping",
      systemPrompt: buildMappingPrompt(mappingSkill, workId),
      answerer,
    });

    // Seed prerequisite artifacts
    const contextDir = join(ctx.fixture.workDir, `.paw/discovery/${workId}`);
    await mkdir(contextDir, { recursive: true });

    // Seed DiscoveryContext.md
    await writeFile(join(contextDir, "DiscoveryContext.md"), `---
work_id: ${workId}
created: 2024-01-15
current_stage: mapping
review_policy: every-stage
---

# Discovery Context

## Configuration
- **Work ID**: ${workId}
- **Review Policy**: every-stage
`);

    // Seed Extraction.md (prerequisite from extraction stage)
    await writeFile(join(contextDir, "Extraction.md"), `---
source_documents:
  - product-roadmap.md
  - meeting-notes.txt
theme_count: 4
date: 2024-01-15
status: complete
---

# Extraction: Test Discovery

## Summary
Extracted 4 themes from product roadmap and engineering meeting notes.

## Features

### F1: User Authentication
OAuth2 login with Google and GitHub providers. SSO support for enterprise.
- Source: product-roadmap.md, Section "User Authentication"

### F2: Performance Optimization
Dashboard performance improvements and database query optimization.
- Source: product-roadmap.md, Section "Performance"

## Needs

### N1: Mobile Support
Dedicated mobile view with touch-optimized controls.
- Source: product-roadmap.md, Section "Mobile Support"

## Constraints

### C1: Tech Debt
Address deprecated dependencies before new features.
- Source: meeting-notes.txt, Discussion Point 4
`);

    // Run mapping
    await ctx.session.sendAndWait({
      prompt: [
        "Run the Discovery mapping stage.",
        "",
        `The discovery work directory is: .paw/discovery/${workId}/`,
        "Read Extraction.md to understand the themes.",
        "Research the codebase capabilities (you can delegate to paw-code-research).",
        "",
        `Write the capability map to .paw/discovery/${workId}/CapabilityMap.md`,
        "Include YAML frontmatter with capability_count.",
        "Document feature-level capabilities with file:line evidence.",
      ].join("\n"),
    }, 180_000);

    // Assert CapabilityMap.md exists and has proper structure
    const capabilityMapPath = join(contextDir, "CapabilityMap.md");
    let capabilityMapContent: string;
    try {
      capabilityMapContent = await readFile(capabilityMapPath, "utf-8");
    } catch {
      assert.fail(`CapabilityMap.md not found at ${capabilityMapPath}`);
    }

    // Should have YAML frontmatter
    assert.match(
      capabilityMapContent,
      /^---\n/,
      "CapabilityMap.md should start with YAML frontmatter",
    );

    // Should have capability count in frontmatter
    assert.match(
      capabilityMapContent,
      /capability_count:\s*\d+/im,
      "CapabilityMap.md should have capability_count in frontmatter",
    );

    // Should have capabilities section
    assert.match(
      capabilityMapContent,
      /capabilit|CAP-\d+/im,
      "CapabilityMap.md should document capabilities",
    );

    // Should reference themes from Extraction.md
    assert.ok(
      capabilityMapContent.includes("F1") ||
      capabilityMapContent.includes("F2") ||
      capabilityMapContent.includes("N1") ||
      capabilityMapContent.includes("theme") ||
      capabilityMapContent.includes("Theme"),
      "CapabilityMap.md should reference extracted themes",
    );

    // Verify no forbidden operations
    assertToolCalls(ctx.toolLog, {
      forbidden: ["git_push"],
      bashMustNotInclude: [/git push/],
    });

    // Judge evaluation for quality
    judge = new Judge();
    await judge.start();

    const mappingRubric = [
      "Evaluate this capability map artifact:",
      "- completeness: Does it identify major capabilities? (1-5)",
      "- theme_integration: Does it relate capabilities to extracted themes? (1-5)",
      "- evidence: Does it provide file references for capabilities? (1-5)",
      "- structure: Is it well-organized with clear sections? (1-5)",
    ].join("\n");

    const verdict = await judge.evaluate({
      context: "Agent mapped codebase capabilities against extracted themes from a Discovery workflow.",
      artifact: capabilityMapContent,
      rubric: mappingRubric,
    });

    if (!verdict.pass) {
      throw new Error(
        `Judge FAILED capability mapping:\n  ${JSON.stringify(verdict.scores)}\n  ${verdict.rationale}`,
      );
    }
  });
});

function buildMappingPrompt(skillContent: string, workId: string): string {
  return [
    "You are a PAW Discovery mapping agent. Your job is to map codebase capabilities to extracted themes.",
    "",
    "IMPORTANT RULES:",
    `- Read Extraction.md from .paw/discovery/${workId}/`,
    "- Research the codebase for feature-level capabilities",
    "- You can use the Task tool to delegate to paw-code-research for detailed investigation",
    `- Write output to .paw/discovery/${workId}/CapabilityMap.md`,
    "- Include YAML frontmatter with: capability_count (number), related_themes (count)",
    "- Document capabilities at feature level with file:line evidence",
    "- Map capabilities to themes from Extraction.md",
    "- Do NOT push to git or create PRs",
    "",
    "Reference skill documentation:",
    skillContent,
  ].join("\n");
}

// ============================================================================
// Correlation Stage Tests
// ============================================================================

describe("discovery workflow - correlation", { timeout: 180_000 }, () => {
  let ctx: TestContext;
  let judge: Judge;

  after(async () => {
    if (ctx) { await destroyTestContext(ctx); }
    if (judge) { await judge.stop(); }
  });

  it("produces Correlation.md with theme-capability matrix", async () => {
    const correlationSkill = await loadSkill("paw-discovery-correlation");
    const workId = "test-correlation";

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.[0] ?? "yes",
    ], false);

    ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "discovery-correlation",
      systemPrompt: buildCorrelationPrompt(correlationSkill, workId),
      answerer,
    });

    // Seed prerequisite artifacts
    const contextDir = join(ctx.fixture.workDir, `.paw/discovery/${workId}`);
    await mkdir(contextDir, { recursive: true });

    // Seed DiscoveryContext.md
    await writeFile(join(contextDir, "DiscoveryContext.md"), `---
work_id: ${workId}
created: 2024-01-15
current_stage: correlation
review_policy: every-stage
---

# Discovery Context

## Configuration
- **Work ID**: ${workId}
- **Review Policy**: every-stage
`);

    // Seed Extraction.md
    await writeFile(join(contextDir, "Extraction.md"), `---
source_documents:
  - product-roadmap.md
theme_count: 4
date: 2024-01-15
status: complete
---

# Extraction: Test Correlation

## Features

### F1: User Authentication
OAuth2 login with Google and GitHub providers.

### F2: API Rate Limiting
Implement rate limiting to prevent API abuse.

## Needs

### N1: Health Check Endpoint
System health endpoint for monitoring.

### N2: Error Logging
Centralized error logging and alerting.
`);

    // Seed CapabilityMap.md (prerequisite from mapping stage)
    await writeFile(join(contextDir, "CapabilityMap.md"), `---
date: 2024-01-15
work_id: ${workId}
capability_count: 3
related_themes: 2
status: complete
---

# Capability Map: Test Correlation

## Summary
Identified 3 existing capabilities in the Express/TypeScript codebase.

## Major Capabilities

### CAP-1: Express Middleware Pipeline
- **What it does**: Request processing with middleware chain
- **How it could integrate**: Can add auth middleware for F1
- **Evidence**: \`src/app.ts:10\`
- **Related Themes**: F1, F2

### CAP-2: Health Check Route
- **What it does**: Basic /health endpoint returning status
- **How it could integrate**: Already addresses N1
- **Evidence**: \`src/routes.ts:5\`
- **Related Themes**: N1

### CAP-3: Error Handler Middleware
- **What it does**: Catches unhandled errors, returns 500
- **How it could integrate**: Could extend for N2 logging
- **Evidence**: \`src/app.ts:25\`
- **Related Themes**: N2

## Integration Potential

| Theme | Existing Capability | Integration Assessment |
|-------|--------------------|-----------------------|
| F1 | CAP-1 | Can add auth middleware |
| F2 | CAP-1 | Can add rate limit middleware |
| N1 | CAP-2 | Already supported |
| N2 | CAP-3 | Needs extension |

## Gaps

None - all themes have some capability correlation.
`);

    // Run correlation
    await ctx.session.sendAndWait({
      prompt: [
        "Run the Discovery correlation stage.",
        "",
        `The discovery work directory is: .paw/discovery/${workId}/`,
        "Read Extraction.md and CapabilityMap.md.",
        "Cross-reference themes with capabilities.",
        "",
        `Write the correlation to .paw/discovery/${workId}/Correlation.md`,
        "Include a correlation matrix showing theme-capability relationships.",
        "Categorize each correlation as: Match, Gap, Combination, or Partial.",
      ].join("\n"),
    }, 120_000);

    // Assert Correlation.md exists and has proper structure
    const correlationPath = join(contextDir, "Correlation.md");
    let correlationContent: string;
    try {
      correlationContent = await readFile(correlationPath, "utf-8");
    } catch {
      assert.fail(`Correlation.md not found at ${correlationPath}`);
    }

    // Should have YAML frontmatter
    assert.match(
      correlationContent,
      /^---\n/,
      "Correlation.md should start with YAML frontmatter",
    );

    // Should have correlation matrix or theme-capability relationships
    assert.match(
      correlationContent,
      /matrix|theme|capability|correlation/im,
      "Correlation.md should contain correlation analysis",
    );

    // Should categorize correlations
    assert.match(
      correlationContent,
      /match|gap|combination|partial/im,
      "Correlation.md should categorize correlations",
    );

    // Should reference theme IDs
    assert.ok(
      correlationContent.includes("F1") ||
      correlationContent.includes("F2") ||
      correlationContent.includes("N1"),
      "Correlation.md should reference theme IDs from Extraction.md",
    );

    // Should reference capability IDs
    assert.ok(
      correlationContent.includes("CAP-1") ||
      correlationContent.includes("CAP-2") ||
      correlationContent.includes("CAP-3"),
      "Correlation.md should reference capability IDs from CapabilityMap.md",
    );

    // Verify no forbidden operations
    assertToolCalls(ctx.toolLog, {
      forbidden: ["git_push"],
      bashMustNotInclude: [/git push/],
    });

    // Judge evaluation for quality
    judge = new Judge();
    await judge.start();

    const correlationRubric = [
      "Evaluate this correlation artifact:",
      "- completeness: Does it cover all themes and capabilities? (1-5)",
      "- categorization: Are correlations properly typed (match/gap/etc)? (1-5)",
      "- rationale: Does it explain why each correlation exists? (1-5)",
      "- structure: Is it well-organized with clear matrix? (1-5)",
    ].join("\n");

    const verdict = await judge.evaluate({
      context: "Agent correlated extracted themes with mapped capabilities in a Discovery workflow.",
      artifact: correlationContent,
      rubric: correlationRubric,
    });

    if (!verdict.pass) {
      throw new Error(
        `Judge FAILED correlation:\n  ${JSON.stringify(verdict.scores)}\n  ${verdict.rationale}`,
      );
    }
  });
});

function buildCorrelationPrompt(skillContent: string, workId: string): string {
  return [
    "You are a PAW Discovery correlation agent. Your job is to cross-reference themes with capabilities.",
    "",
    "IMPORTANT RULES:",
    `- Read Extraction.md and CapabilityMap.md from .paw/discovery/${workId}/`,
    `- Write output to .paw/discovery/${workId}/Correlation.md`,
    "- Include YAML frontmatter with: theme_count, capability_count, match_count, gap_count",
    "- Create a correlation matrix showing theme-capability relationships",
    "- Categorize each as: Match (direct), Gap (no match), Combination (multiple), Partial",
    "- Provide rationale for each correlation",
    "- Do NOT push to git or create PRs",
    "",
    "Reference skill documentation:",
    skillContent,
  ].join("\n");
}

// ============================================================================
// Prioritization Stage Tests
// ============================================================================

describe("discovery workflow - prioritization", { timeout: 180_000 }, () => {
  let ctx: TestContext;
  let judge: Judge;

  after(async () => {
    if (ctx) { await destroyTestContext(ctx); }
    if (judge) { await judge.stop(); }
  });

  it("produces Roadmap.md with 5-factor prioritization", async () => {
    const prioritizeSkill = await loadSkill("paw-discovery-prioritize");
    const workId = "test-prioritize";

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.[0] ?? "yes",
      // Accept the roadmap without adjustments
      (req) => {
        if (/adjust|change|modify/i.test(req.question)) {
          return "no, proceed with the roadmap as presented";
        }
        return "yes";
      },
    ], false);

    ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "discovery-prioritize",
      systemPrompt: buildPrioritizePrompt(prioritizeSkill, workId),
      answerer,
    });

    // Seed prerequisite artifacts
    const contextDir = join(ctx.fixture.workDir, `.paw/discovery/${workId}`);
    await mkdir(contextDir, { recursive: true });

    // Seed DiscoveryContext.md
    await writeFile(join(contextDir, "DiscoveryContext.md"), `---
work_id: ${workId}
created: 2024-01-15
current_stage: prioritization
review_policy: every-stage
---

# Discovery Context

## Configuration
- **Work ID**: ${workId}
- **Review Policy**: every-stage
`);

    // Seed Extraction.md
    await writeFile(join(contextDir, "Extraction.md"), `---
source_documents:
  - product-roadmap.md
theme_count: 4
date: 2024-01-15
status: complete
---

# Extraction: Test Prioritization

## Features

### F1: User Authentication
OAuth2 login with Google and GitHub. High user demand, core workflow.

### F2: API Rate Limiting
Prevent API abuse. Medium priority, security enhancement.

## Needs

### N1: Health Check Endpoint
System health for monitoring. Low effort, already partial.

### N2: Error Logging
Centralized logging. Medium effort, enables debugging.
`);

    // Seed CapabilityMap.md
    await writeFile(join(contextDir, "CapabilityMap.md"), `---
date: 2024-01-15
work_id: ${workId}
capability_count: 3
status: complete
---

# Capability Map: Test Prioritization

## Major Capabilities

### CAP-1: Express Middleware
Request processing chain. Evidence: \`src/app.ts:10\`

### CAP-2: Health Route
Basic health endpoint. Evidence: \`src/routes.ts:5\`

### CAP-3: Error Handler
Error middleware. Evidence: \`src/app.ts:25\`
`);

    // Seed Correlation.md (prerequisite from correlation stage)
    await writeFile(join(contextDir, "Correlation.md"), `---
date: 2024-01-15
work_id: ${workId}
theme_count: 4
capability_count: 3
match_count: 1
gap_count: 1
partial_count: 2
status: complete
---

# Correlation: Test Prioritization

## Summary
4 themes correlated with 3 capabilities. 1 direct match, 1 gap, 2 partial.

## Correlation Matrix

| Theme | Type | Related Capabilities | Confidence | Notes |
|-------|------|---------------------|------------|-------|
| F1 | Partial | CAP-1 | High | Middleware exists, need auth logic |
| F2 | Partial | CAP-1 | High | Middleware exists, need rate limit |
| N1 | Match | CAP-2 | High | Already implemented |
| N2 | Gap | - | Medium | Need new logging system |

## Direct Matches

### N1 → CAP-2: Health Check
Already implemented, just needs verification.

## Gaps

### N2: Error Logging
No existing capability. Requires new logging infrastructure.

## Partial Matches

### F1 ↔ CAP-1: Auth via Middleware
Middleware pipeline exists. Need OAuth2 implementation.

### F2 ↔ CAP-1: Rate Limiting via Middleware  
Middleware pipeline exists. Need rate limiting logic.
`);

    // Run prioritization
    await ctx.session.sendAndWait({
      prompt: [
        "Run the Discovery prioritization stage.",
        "",
        `The discovery work directory is: .paw/discovery/${workId}/`,
        "Read Correlation.md for theme-capability relationships.",
        "Apply 5-factor prioritization: Value, Effort, Dependencies, Risk, Leverage.",
        "",
        `Write the roadmap to .paw/discovery/${workId}/Roadmap.md`,
        "Categorize items as: MVP-Critical, MVP-Nice-to-Have, or Post-MVP.",
        "Include prioritization scores and rationale for each item.",
      ].join("\n"),
    }, 120_000);

    // Assert Roadmap.md exists and has proper structure
    const roadmapPath = join(contextDir, "Roadmap.md");
    let roadmapContent: string;
    try {
      roadmapContent = await readFile(roadmapPath, "utf-8");
    } catch {
      assert.fail(`Roadmap.md not found at ${roadmapPath}`);
    }

    // Should have YAML frontmatter
    assert.match(
      roadmapContent,
      /^---\n/,
      "Roadmap.md should start with YAML frontmatter",
    );

    // Should have priority categories
    assert.match(
      roadmapContent,
      /mvp.*critical|critical|priority|high|medium|low/im,
      "Roadmap.md should have priority categorization",
    );

    // Should reference themes
    assert.ok(
      roadmapContent.includes("F1") ||
      roadmapContent.includes("F2") ||
      roadmapContent.includes("N1") ||
      roadmapContent.includes("Auth") ||
      roadmapContent.includes("auth"),
      "Roadmap.md should reference themes",
    );

    // Should have prioritization factors or rationale
    assert.match(
      roadmapContent,
      /value|effort|risk|depend|leverage|rationale|why/im,
      "Roadmap.md should include prioritization factors or rationale",
    );

    // Verify no forbidden operations
    assertToolCalls(ctx.toolLog, {
      forbidden: ["git_push"],
      bashMustNotInclude: [/git push/],
    });

    // Judge evaluation for quality
    judge = new Judge();
    await judge.start();

    const prioritizeRubric = [
      "Evaluate this roadmap artifact:",
      "- completeness: Does it prioritize all themes from correlation? (1-5)",
      "- categorization: Are items properly categorized (MVP-Critical, etc)? (1-5)",
      "- rationale: Does it explain priority decisions with factors? (1-5)",
      "- actionability: Could someone start implementing from this? (1-5)",
    ].join("\n");

    const verdict = await judge.evaluate({
      context: "Agent prioritized Discovery workflow items into a roadmap using 5-factor analysis.",
      artifact: roadmapContent,
      rubric: prioritizeRubric,
    });

    if (!verdict.pass) {
      throw new Error(
        `Judge FAILED prioritization:\n  ${JSON.stringify(verdict.scores)}\n  ${verdict.rationale}`,
      );
    }
  });
});

function buildPrioritizePrompt(skillContent: string, workId: string): string {
  return [
    "You are a PAW Discovery prioritization agent. Your job is to create a prioritized roadmap.",
    "",
    "IMPORTANT RULES:",
    `- Read Correlation.md from .paw/discovery/${workId}/`,
    `- Write output to .paw/discovery/${workId}/Roadmap.md`,
    "- Apply 5-factor prioritization: Value, Effort, Dependencies, Risk, Leverage",
    "- Include YAML frontmatter with: mvp_critical_count, mvp_nice_to_have_count, post_mvp_count",
    "- Categorize each item as: MVP-Critical, MVP-Nice-to-Have, or Post-MVP",
    "- Provide rationale for each prioritization decision",
    "- Do NOT push to git or create PRs",
    "",
    "Reference skill documentation:",
    skillContent,
  ].join("\n");
}
