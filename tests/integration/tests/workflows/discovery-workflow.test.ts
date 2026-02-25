/**
 * Workflow tests for PAW Discovery workflow stages.
 *
 * Tests the Discovery workflow stages:
 * - Extraction: produces Extraction.md from input documents
 * - Mapping: delegates to paw-code-research and produces CapabilityMap.md
 * - Correlation: cross-references themes and capabilities into Correlation.md
 * - Journey Grounding: extracts pain points and synthesizes user journeys into JourneyMap.md
 * - Journey Grounding Review: validates JourneyMap.md quality
 * - Journey Scoping: interactive MVP depth scoping checkpoint
 * - Prioritization: applies multi-factor scoring (including journey factors) to produce Roadmap.md
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

// ============================================================================
// Journey Grounding Stage Tests
// ============================================================================

describe("discovery workflow - journey grounding", { timeout: 180_000 }, () => {
  let ctx: TestContext;
  let judge: Judge;

  after(async () => {
    if (ctx) { await destroyTestContext(ctx); }
    if (judge) { await judge.stop(); }
  });

  it("produces JourneyMap.md with pain points and user journeys", async () => {
    const groundingSkill = await loadSkill("paw-discovery-journey-grounding");
    const workId = "test-journey-grounding";

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.[0] ?? "yes",
      (req) => {
        if (/proceed|confirm|ready|continue/i.test(req.question)) {
          return "yes";
        }
        return "yes";
      },
    ], false);

    ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "discovery-journey-grounding",
      systemPrompt: buildJourneyGroundingPrompt(groundingSkill, workId),
      answerer,
    });

    // Seed prerequisite artifacts
    const contextDir = join(ctx.fixture.workDir, `.paw/discovery/${workId}`);
    const inputsDir = join(contextDir, "inputs");
    await mkdir(inputsDir, { recursive: true });

    // Seed input document with user pain points
    await writeFile(join(inputsDir, "user-research.md"), `
# User Research Summary

## Pain Points

### Login Frustration
Users report frustration with the current login process. "I have to enter my password every single time, even on my own computer." Multiple users requested remember-me functionality.

### Slow Dashboard
"The dashboard takes forever to load. I just want to see my stats quickly." Users mentioned abandoning the dashboard due to loading times.

### Mobile Issues
"I can't use the app on my phone - buttons are too small and pages don't fit." Users want a proper mobile experience.

## User Goals
- Quick access to daily stats
- Seamless authentication
- On-the-go access via mobile
`);

    // Seed DiscoveryContext.md
    await writeFile(join(contextDir, "DiscoveryContext.md"), `---
work_id: ${workId}
created: 2024-01-15
current_stage: journey_grounding
review_policy: every-stage
scoping_style: per-journey
workflow_version: "2.0"
---

# Discovery Context

## Configuration
- **Work ID**: ${workId}
- **Review Policy**: every-stage
- **Scoping Style**: per-journey
`);

    // Seed Extraction.md (required for context)
    await writeFile(join(contextDir, "Extraction.md"), `---
source_documents:
  - user-research.md
theme_count: 3
status: complete
---

# Extraction: ${workId}

## Themes

### T1: User Authentication
Users want easier login with remember-me.

### T2: Dashboard Performance
Dashboard loads too slowly.

### T3: Mobile Support
Mobile experience is poor.
`);

    // Seed Correlation.md (required for feature mapping)
    await writeFile(join(contextDir, "Correlation.md"), `---
work_id: ${workId}
theme_count: 3
status: complete
---

# Correlation: ${workId}

## Summary
3 themes correlated.

## Correlation Matrix

| Theme | ID | Type | Related Capabilities |
|-------|-----|------|---------------------|
| Authentication | F-1 | Gap | - |
| Dashboard Performance | F-2 | Partial | src/dashboard.ts |
| Mobile Support | F-3 | Gap | - |
`);

    // Run journey grounding
    await ctx.session.sendAndWait({
      prompt: [
        "Run the Discovery journey grounding stage.",
        "",
        `The discovery work directory is: .paw/discovery/${workId}/`,
        "Extract pain points from source documents in inputs/",
        "Synthesize user journeys based on pain points and themes.",
        "Map features from Correlation.md to journey steps.",
        "Apply source tracing discipline ([SOURCE] vs [SYNTHESIS]).",
        "",
        `Write the journey map to .paw/discovery/${workId}/JourneyMap.md`,
      ].join("\n"),
    }, 120_000);

    // Assert JourneyMap.md exists and has proper structure
    const journeyMapPath = join(contextDir, "JourneyMap.md");
    let journeyMapContent: string;
    try {
      journeyMapContent = await readFile(journeyMapPath, "utf-8");
    } catch {
      assert.fail(`JourneyMap.md not found at ${journeyMapPath}`);
    }

    // Should have YAML frontmatter
    assert.match(
      journeyMapContent,
      /^---\n/,
      "JourneyMap.md should start with YAML frontmatter",
    );

    // Should have pain points section
    assert.match(
      journeyMapContent,
      /pain\s*point|PP-/im,
      "JourneyMap.md should have pain points",
    );

    // Should have user journeys section
    assert.match(
      journeyMapContent,
      /journey|user\s*journey|J-/im,
      "JourneyMap.md should have user journeys",
    );

    // Should have source tracing markers
    assert.ok(
      journeyMapContent.includes("[SOURCE") || journeyMapContent.includes("[SYNTHESIS"),
      "JourneyMap.md should have source tracing markers",
    );

    // Verify no forbidden operations
    assertToolCalls(ctx.toolLog, {
      forbidden: ["git_push"],
      bashMustNotInclude: [/git push/],
    });

    // Judge evaluation for quality
    judge = new Judge();
    await judge.start();

    const groundingRubric = [
      "Evaluate this JourneyMap.md artifact:",
      "- pain_points: Are pain points extracted with quotes and sources? (1-5)",
      "- journeys: Are user journeys synthesized with clear steps? (1-5)",
      "- source_tracing: Are insights marked with [SOURCE] or [SYNTHESIS]? (1-5)",
      "- feature_mapping: Are features from Correlation.md mapped to journeys? (1-5)",
    ].join("\n");

    const verdict = await judge.evaluate({
      context: "Agent extracted pain points and synthesized user journeys with source tracing discipline.",
      artifact: journeyMapContent,
      rubric: groundingRubric,
    });

    if (!verdict.pass) {
      throw new Error(
        `Judge FAILED journey grounding:\n  ${JSON.stringify(verdict.scores)}\n  ${verdict.rationale}`,
      );
    }
  });
});

function buildJourneyGroundingPrompt(skillContent: string, workId: string): string {
  return [
    "You are a PAW Discovery journey grounding agent. Your job is to extract pain points and synthesize user journeys.",
    "",
    "IMPORTANT RULES:",
    `- Read input documents from .paw/discovery/${workId}/inputs/`,
    `- Read Extraction.md and Correlation.md from .paw/discovery/${workId}/`,
    `- Write output to .paw/discovery/${workId}/JourneyMap.md`,
    "- Extract pain points with direct quotes from source documents",
    "- Synthesize user journeys connecting pain points to feature solutions",
    "- Map features from Correlation.md to journey steps",
    "- Apply source tracing: [SOURCE: doc, location] for grounded content, [SYNTHESIS] for inferences",
    "- Include YAML frontmatter with: pain_point_count, journey_count, date, status",
    "- Do NOT push to git or create PRs",
    "",
    "Reference skill documentation:",
    skillContent,
  ].join("\n");
}

// ============================================================================
// Journey Grounding Review Tests
// ============================================================================

describe("discovery workflow - journey grounding review", { timeout: 180_000 }, () => {
  let ctx: TestContext;

  after(async () => {
    if (ctx) { await destroyTestContext(ctx); }
  });

  it("returns PASS for valid JourneyMap.md", async () => {
    const reviewSkill = await loadSkill("paw-discovery-journey-grounding-review");
    const workId = "test-journey-review";

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.[0] ?? "yes",
    ], false);

    ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "discovery-journey-grounding-review",
      systemPrompt: buildJourneyGroundingReviewPrompt(reviewSkill, workId),
      answerer,
    });

    // Seed prerequisite artifacts
    const contextDir = join(ctx.fixture.workDir, `.paw/discovery/${workId}`);
    await mkdir(contextDir, { recursive: true });

    // Seed valid JourneyMap.md
    await writeFile(join(contextDir, "JourneyMap.md"), `---
work_id: ${workId}
pain_point_count: 2
journey_count: 2
source_tracing:
  grounded: 3
  synthesized: 2
date: 2024-01-15
status: complete
---

# Journey Map: ${workId}

## Pain Points

### PP-1: Login Friction
"I have to enter my password every single time" - User frustration with authentication.
[SOURCE: user-research.md, Pain Points section]

### PP-2: Slow Dashboard
"The dashboard takes forever to load" - Performance complaint.
[SOURCE: user-research.md, Pain Points section]

## User Journeys

### J-1: Quick Stats Check

- **Goal**: View daily statistics quickly
- **Addresses**: PP-2

#### Steps
1. User opens dashboard [SYNTHESIS]
2. User waits for data to load
3. User views stats summary [SOURCE: user-research.md, User Goals]

### J-2: Seamless Login

- **Goal**: Log in without friction
- **Addresses**: PP-1

#### Steps
1. User returns to app
2. User is remembered (no password entry)
3. User proceeds to dashboard [SYNTHESIS]

## Feature-to-Journey Mapping

| Feature ID | Journey | Required For | MVP Critical |
|------------|---------|--------------|--------------|
| F-1 | J-2 | Step 2 | Yes |
| F-2 | J-1 | Step 2 | Yes |
| F-3 | J-1, J-2 | All steps | No |
`);

    // Seed Correlation.md for feature ID validation
    await writeFile(join(contextDir, "Correlation.md"), `---
work_id: ${workId}
theme_count: 3
status: complete
---

# Correlation

## Correlation Matrix

| Theme | ID | Type |
|-------|-----|------|
| Authentication | F-1 | Gap |
| Performance | F-2 | Partial |
| Mobile | F-3 | Gap |
`);

    // Run review
    const result = await ctx.session.sendAndWait({
      prompt: [
        "Run the Journey Grounding review stage.",
        "",
        `The discovery work directory is: .paw/discovery/${workId}/`,
        "Review JourneyMap.md against the quality checklist.",
        "Check: pain point extraction, journey synthesis, source tracing, feature mapping.",
        "Return verdict: PASS or REVISE with feedback.",
      ].join("\n"),
    }, 120_000);

    // Should return PASS verdict
    const responseText = result?.data?.content ?? "";
    assert.match(
      responseText,
      /pass|proceed|approved|looks good/i,
      "Review should return PASS for valid JourneyMap.md",
    );

    // Verify no forbidden operations
    assertToolCalls(ctx.toolLog, {
      forbidden: ["git_push"],
      bashMustNotInclude: [/git push/],
    });
  });
});

function buildJourneyGroundingReviewPrompt(skillContent: string, workId: string): string {
  return [
    "You are a PAW Discovery journey grounding review agent. Your job is to validate JourneyMap.md quality.",
    "",
    "IMPORTANT RULES:",
    `- Read JourneyMap.md from .paw/discovery/${workId}/`,
    `- Read Correlation.md from .paw/discovery/${workId}/ to validate feature IDs`,
    "- Apply quality checklist: pain point extraction, journey synthesis, source tracing, feature mapping",
    "- Return PASS if all criteria met, REVISE with specific feedback otherwise",
    "- Validate that feature IDs in mapping exist in Correlation.md",
    "- Do NOT push to git or create PRs",
    "",
    "Reference skill documentation:",
    skillContent,
  ].join("\n");
}

// ============================================================================
// Journey Scoping Tests
// ============================================================================

describe("discovery workflow - journey scoping", { timeout: 180_000 }, () => {
  let ctx: TestContext;

  after(async () => {
    if (ctx) { await destroyTestContext(ctx); }
  });

  it("adds MVP depth annotations to JourneyMap.md", async () => {
    const scopingSkill = await loadSkill("paw-discovery-journey-scoping");
    const workId = "test-journey-scoping";

    // Answer scoping questions with specific depths
    const answerer = new RuleBasedAnswerer([
      (req) => {
        // When asked about MVP depth for a journey
        if (/mvp|depth|scope|partial|full|minimal/i.test(req.question)) {
          return req.choices?.[0] ?? "Partial";
        }
        return req.choices?.[0] ?? "yes";
      },
    ], false);

    ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "discovery-journey-scoping",
      systemPrompt: buildJourneyScopingPrompt(scopingSkill, workId),
      answerer,
    });

    // Seed prerequisite artifacts
    const contextDir = join(ctx.fixture.workDir, `.paw/discovery/${workId}`);
    await mkdir(contextDir, { recursive: true });

    // Seed DiscoveryContext.md with scoping_style
    await writeFile(join(contextDir, "DiscoveryContext.md"), `---
work_id: ${workId}
scoping_style: per-journey
workflow_version: "2.0"
---

# Discovery Context

## Configuration
- **Scoping Style**: per-journey
`);

    // Seed JourneyMap.md without MVP depth annotations
    await writeFile(join(contextDir, "JourneyMap.md"), `---
work_id: ${workId}
pain_point_count: 2
journey_count: 2
status: complete
---

# Journey Map

## Pain Points

### PP-1: Login Friction
User frustration with password entry.

### PP-2: Slow Dashboard
Performance complaints.

## User Journeys

### J-1: Quick Stats Check

- **Goal**: View daily statistics
- **Addresses**: PP-2

#### Steps
1. Open dashboard
2. Wait for load
3. View stats

#### MVP Options
- **Full**: All statistics, charts, history
- **Partial**: Key stats only, no charts
- **Minimal**: Single number summary

### J-2: Seamless Login

- **Goal**: Frictionless login
- **Addresses**: PP-1

#### Steps
1. Return to app
2. Auto-authenticated
3. Proceed to dashboard

#### MVP Options
- **Full**: Remember-me, OAuth, SSO
- **Partial**: Remember-me only
- **Minimal**: Session persistence only

## Feature-to-Journey Mapping

| Feature ID | Journey | Required For | MVP Critical |
|------------|---------|--------------|--------------|
| F-1 | J-2 | Step 2 | TBD |
| F-2 | J-1 | Step 2 | TBD |
`);

    // Run scoping
    await ctx.session.sendAndWait({
      prompt: [
        "Run the Journey Scoping checkpoint.",
        "",
        `The discovery work directory is: .paw/discovery/${workId}/`,
        "Read JourneyMap.md and DiscoveryContext.md.",
        "For each journey, ask the user to select MVP depth (Full/Partial/Minimal).",
        "Update JourneyMap.md with MVP depth annotations.",
        "Update the Feature-to-Journey Mapping MVP Critical column.",
      ].join("\n"),
    }, 120_000);

    // Assert JourneyMap.md was updated with MVP depth
    const journeyMapPath = join(contextDir, "JourneyMap.md");
    let journeyMapContent: string;
    try {
      journeyMapContent = await readFile(journeyMapPath, "utf-8");
    } catch {
      assert.fail(`JourneyMap.md not found at ${journeyMapPath}`);
    }

    // Should have MVP Depth annotations
    assert.match(
      journeyMapContent,
      /mvp\s*depth|scoped|partial|full|minimal/im,
      "JourneyMap.md should have MVP depth annotations",
    );

    // Verify no forbidden operations
    assertToolCalls(ctx.toolLog, {
      forbidden: ["git_push"],
      bashMustNotInclude: [/git push/],
    });
  });
});

function buildJourneyScopingPrompt(skillContent: string, workId: string): string {
  return [
    "You are a PAW Discovery journey scoping agent. Your job is to interactively scope MVP depth for each journey.",
    "",
    "IMPORTANT RULES:",
    `- Read JourneyMap.md from .paw/discovery/${workId}/`,
    `- Read DiscoveryContext.md from .paw/discovery/${workId}/ for scoping_style`,
    "- For each journey, present MVP options and ask user to select depth",
    "- Update JourneyMap.md with MVP Depth field for each journey",
    "- Update Feature-to-Journey Mapping MVP Critical column based on scope",
    "- Do NOT push to git or create PRs",
    "",
    "Reference skill documentation:",
    skillContent,
  ].join("\n");
}

// ============================================================================
// Prioritization with Journey Factors Test
// ============================================================================

describe("discovery workflow - prioritization with journey factors", { timeout: 180_000 }, () => {
  let ctx: TestContext;
  let judge: Judge;

  after(async () => {
    if (ctx) { await destroyTestContext(ctx); }
    if (judge) { await judge.stop(); }
  });

  it("integrates journey factors into prioritization when JourneyMap.md exists", async () => {
    const prioritizeSkill = await loadSkill("paw-discovery-prioritize");
    const workId = "test-journey-prioritize";

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.[0] ?? "yes",
      (req) => {
        if (/adjust|change|modify/i.test(req.question)) {
          return "no, proceed with the roadmap as presented";
        }
        return "yes";
      },
    ], false);

    ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "discovery-journey-prioritize",
      systemPrompt: buildJourneyPrioritizePrompt(prioritizeSkill, workId),
      answerer,
    });

    // Seed all prerequisite artifacts including JourneyMap.md
    const contextDir = join(ctx.fixture.workDir, `.paw/discovery/${workId}`);
    await mkdir(contextDir, { recursive: true });

    // Seed DiscoveryContext.md
    await writeFile(join(contextDir, "DiscoveryContext.md"), `---
work_id: ${workId}
workflow_version: "2.0"
---
# Discovery Context
`);

    // Seed Correlation.md
    await writeFile(join(contextDir, "Correlation.md"), `---
work_id: ${workId}
status: complete
---

# Correlation

| Theme | ID | Type |
|-------|-----|------|
| Auth | F-1 | Gap |
| Performance | F-2 | Partial |
| Mobile | F-3 | Gap |
`);

    // Seed JourneyMap.md with scoped journeys
    await writeFile(join(contextDir, "JourneyMap.md"), `---
work_id: ${workId}
pain_point_count: 2
journey_count: 2
status: complete
---

# Journey Map

## Pain Points

### PP-1: Login Friction
Severity: High

### PP-2: Slow Dashboard
Severity: Medium

## User Journeys

### J-1: Quick Stats
- **MVP Depth**: Partial
- **Scoped**: Partial

### J-2: Seamless Login
- **MVP Depth**: Full
- **Scoped**: Full

## Feature-to-Journey Mapping

| Feature ID | Journey | MVP Critical |
|------------|---------|--------------|
| F-1 | J-2 | Yes |
| F-2 | J-1 | Yes |
| F-3 | J-1, J-2 | No |
`);

    // Run prioritization
    await ctx.session.sendAndWait({
      prompt: [
        "Run Discovery prioritization with journey factors.",
        "",
        `The discovery work directory is: .paw/discovery/${workId}/`,
        "Read Correlation.md and JourneyMap.md.",
        "Apply multi-factor prioritization including journey factors:",
        "- Base factors (1-5): Value, Effort, Dependencies, Risk, Leverage",
        "- Journey factors (6-8): Criticality, Pain Severity, MVP Scope",
        "",
        `Write Roadmap.md to .paw/discovery/${workId}/`,
        "Include journey-related rationale for priority decisions.",
      ].join("\n"),
    }, 120_000);

    // Assert Roadmap.md exists
    const roadmapPath = join(contextDir, "Roadmap.md");
    let roadmapContent: string;
    try {
      roadmapContent = await readFile(roadmapPath, "utf-8");
    } catch {
      assert.fail(`Roadmap.md not found at ${roadmapPath}`);
    }

    // Should reference journey-related concepts
    assert.match(
      roadmapContent,
      /journey|pain|critical|mvp|scoped/im,
      "Roadmap.md should reference journey factors",
    );

    // Verify no forbidden operations
    assertToolCalls(ctx.toolLog, {
      forbidden: ["git_push"],
      bashMustNotInclude: [/git push/],
    });

    // Judge evaluation
    judge = new Judge();
    await judge.start();

    const journeyPrioritizeRubric = [
      "Evaluate this roadmap with journey factor integration:",
      "- journey_factors: Does it consider journey criticality, pain severity, MVP scope? (1-5)",
      "- rationale: Does rationale reference journeys and pain points? (1-5)",
      "- categorization: Are MVP-critical journey features prioritized appropriately? (1-5)",
    ].join("\n");

    const verdict = await judge.evaluate({
      context: "Agent prioritized items using both base factors and journey factors from JourneyMap.md.",
      artifact: roadmapContent,
      rubric: journeyPrioritizeRubric,
    });

    if (!verdict.pass) {
      throw new Error(
        `Judge FAILED journey prioritization:\n  ${JSON.stringify(verdict.scores)}\n  ${verdict.rationale}`,
      );
    }
  });
});

function buildJourneyPrioritizePrompt(skillContent: string, workId: string): string {
  return [
    "You are a PAW Discovery prioritization agent with journey factor integration.",
    "",
    "IMPORTANT RULES:",
    `- Read Correlation.md from .paw/discovery/${workId}/`,
    `- Read JourneyMap.md from .paw/discovery/${workId}/ for journey factors`,
    `- Write output to .paw/discovery/${workId}/Roadmap.md`,
    "- Apply multi-factor prioritization:",
    "  - Base factors (1-5): Value, Effort, Dependencies, Risk, Leverage",
    "  - Journey factors (6-8): Criticality, Pain Severity, MVP Scope",
    "- Include journey rationale in priority decisions",
    "- Features marked MVP Critical in JourneyMap.md get priority boost",
    "- Do NOT push to git or create PRs",
    "",
    "Reference skill documentation:",
    skillContent,
  ].join("\n");
}
