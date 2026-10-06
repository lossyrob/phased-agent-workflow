/**
 * Workflow test: paw-pr pre-flight profiles
 *
 * Drives paw-pr pre-flight (stopping before stop-tracking, push, or PR
 * creation) against seeded work items to verify:
 * - A PAW Lite run (Plan.md only, Workflow Mode: custom) passes under the
 *   Lite profile without demanding standard PAW artifacts
 * - A PAW Lite run whose context says Workflow Mode: full (never-commit)
 *   passes with a warning instead of demanding Spec.md/Docs.md
 * - Standard full mode still blocks on missing CodeResearch.md, Spec.md, Docs.md
 * - Standard minimal mode still blocks on missing CodeResearch.md only
 *
 * The Lite scenarios do not tell the agent it was loaded from paw-lite, so
 * detection relies on the on-disk fallback (Plan.md without ImplementationPlan.md).
 *
 * Requires: Copilot CLI auth
 * Runtime: ~8-9 minutes
 */
import { describe, it, after } from "node:test";
import assert from "node:assert";
import { execSync } from "child_process";
import { access, mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { simpleGit } from "simple-git";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { loadSkill } from "../../lib/skills.js";
import { assertToolCalls } from "../../lib/assertions.js";

type Lifecycle = "commit-and-clean" | "never-commit";

interface Scenario {
  label: string;
  workflowMode: "full" | "minimal" | "custom";
  lifecycle: Lifecycle;
  artifacts: Record<string, string>;
}

interface PreflightResult {
  raw: string;
  profile: string;
  status: string;
  missing: string;
  warnings: string;
}

const STANDARD_ARTIFACTS = ["CodeResearch.md", "ImplementationPlan.md", "Spec.md", "SpecResearch.md", "Docs.md"];

const LITE_PLAN = [
  "# Plan: Health Endpoint",
  "",
  "## Approach",
  "Add a GET /health route to the Express app and cover it with a test.",
  "",
  "## Work Items",
  "- [x] add-health-route: Add GET /health returning { healthy: true } in src/app.ts",
  "- [x] add-health-test: Add a test in tests/app.test.js asserting the /health route is defined",
  "",
  "## Key Decisions",
  "- Keep the route inline in src/app.ts; no new modules.",
  "",
  "## Open Questions",
  "None.",
  "",
].join("\n");

const COMPLETE_IMPLEMENTATION_PLAN = [
  "# Implementation Plan: Health Endpoint",
  "",
  "## Overview",
  "Add a GET /health route to the Express app.",
  "",
  "## Phase Status",
  "- [x] **Phase 1: Health Route** - Complete",
  "",
  "---",
  "",
  "## Phase 1: Health Route",
  "",
  "### Changes Required",
  "- `src/app.ts`: add GET /health returning { healthy: true }",
  "- `tests/app.test.js`: assert the /health route is defined",
  "",
  "### Success Criteria",
  "- [x] `npm test` passes",
  "",
  "### Status",
  "- State: Complete",
  "",
  "## Phase Candidates",
  "- None",
  "",
  "## Open Questions",
  "None.",
  "",
].join("\n");

const APP_WITH_HEALTH = [
  'import express from "express";',
  "",
  "const app = express();",
  "",
  'app.get("/", (_req, res) => {',
  '  res.json({ status: "ok" });',
  "});",
  "",
  'app.get("/health", (_req, res) => {',
  "  res.json({ healthy: true });",
  "});",
  "",
  "export default app;",
  "",
  "if (require.main === module) {",
  "  const port = process.env.PORT || 3000;",
  "  app.listen(port, () => {",
  "    console.log(`Server running on port ${port}`);",
  "  });",
  "}",
  "",
].join("\n");

const TEST_WITH_HEALTH = [
  'const assert = require("node:assert");',
  'const { readFileSync } = require("node:fs");',
  'const { join } = require("node:path");',
  'const { describe, it } = require("node:test");',
  "",
  'describe("app", () => {',
  '  it("should be importable", () => {',
  '    assert.ok(true, "App module exists");',
  "  });",
  "",
  '  it("defines the /health route", () => {',
  '    const source = readFileSync(join(__dirname, "../src/app.ts"), "utf-8");',
  "    assert.match(source, /app\\.get\\(\"\\/health\"/);",
  "  });",
  "});",
  "",
].join("\n");

function workflowContext(workId: string, scenario: Scenario): string {
  return [
    "# WorkflowContext",
    "",
    "Work Title: Health Endpoint",
    `Work ID: ${workId}`,
    "Base Branch: main",
    `Target Branch: feature/${workId}`,
    "Execution Mode: current-checkout",
    `Workflow Mode: ${scenario.workflowMode}`,
    "Review Strategy: local",
    "Review Policy: final-pr-only",
    "Session Policy: continuous",
    "Final Agent Review: disabled",
    "Planning Docs Review: disabled",
    "Remote: origin",
    "Artifact Paths: auto-derived",
    `Artifact Lifecycle: ${scenario.lifecycle}`,
    "Custom Workflow Instructions: none",
    "Issue URL: none",
    "",
  ].join("\n");
}

async function seedRepository(workDir: string, workspaceDir: string, workId: string, scenario: Scenario): Promise<void> {
  const git = simpleGit(workDir);
  const originPath = join(workspaceDir, "origin.git");

  await git.raw(["branch", "-M", "main"]);
  await writeFile(join(workDir, ".gitignore"), "node_modules/\ndist/\n");
  await git.add(".gitignore");
  await git.commit("Ignore build output");

  await simpleGit(workspaceDir).raw(["init", "--bare", originPath]);
  await git.addRemote("origin", originPath);
  await git.push(["-u", "origin", "main"]);

  await git.checkoutLocalBranch(`feature/${workId}`);
  await writeFile(join(workDir, "src/app.ts"), APP_WITH_HEALTH);
  await writeFile(join(workDir, "tests/app.test.js"), TEST_WITH_HEALTH);
  await git.add(["src/app.ts", "tests/app.test.js"]);
  await git.commit("Add /health endpoint");

  const pawDir = join(workDir, ".paw/work", workId);
  await mkdir(pawDir, { recursive: true });
  await writeFile(join(pawDir, "WorkflowContext.md"), workflowContext(workId, scenario));
  for (const [name, content] of Object.entries(scenario.artifacts)) {
    await writeFile(join(pawDir, name), content);
  }

  if (scenario.lifecycle === "never-commit") {
    await writeFile(join(pawDir, ".gitignore"), "*\n");
  } else {
    await git.add(`.paw/work/${workId}`);
    await git.commit(`Add PAW artifacts for ${workId}`);
  }

  await git.push(["-u", "origin", `feature/${workId}`]);
  execSync("npm install --silent --no-package-lock --no-audit --no-fund", { cwd: workDir, stdio: "pipe" });
}

function buildPreflightPrompt(skillContent: string, workId: string): string {
  return [
    "You are executing the paw-pr skill for an existing PAW work item. Follow the skill's Pre-flight Validation exactly, with these test constraints:",
    "",
    `- WorkflowContext.md is at .paw/work/${workId}/WorkflowContext.md; you are on the target branch.`,
    "- You were NOT loaded from another workflow skill; determine the pre-flight profile from WorkflowContext.md and the work directory.",
    "- Run ONLY pre-flight validation. Stop before the stop-tracking operation, git push, and PR creation.",
    "- Do NOT ask the user questions. Treat any failed check as blocking and report it.",
    "- End your response with exactly this block (one value per line):",
    "",
    "PREFLIGHT RESULT",
    "profile: <paw-lite|standard>",
    "status: <passed|blocked>",
    "missing_artifacts: <comma-separated missing required artifact file names, or none>",
    "warnings: <short text, or none>",
    "",
    "Skill documentation:",
    skillContent,
  ].join("\n");
}

function parsePreflight(raw: string): PreflightResult {
  const block = raw.slice(Math.max(0, raw.lastIndexOf("PREFLIGHT RESULT")));
  const field = (name: string) => block.match(new RegExp(`${name}:\\s*(.+)`, "i"))?.[1]?.trim() ?? "";
  return {
    raw,
    profile: field("profile"),
    status: field("status"),
    missing: field("missing_artifacts"),
    warnings: field("warnings"),
  };
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe("paw-pr pre-flight profiles", { timeout: 900_000 }, () => {
  const contexts: TestContext[] = [];

  after(async () => {
    for (const ctx of contexts) {
      await destroyTestContext(ctx);
    }
  });

  async function runPreflight(scenario: Scenario): Promise<{ result: PreflightResult; ctx: TestContext; workId: string }> {
    const skill = await loadSkill("paw-pr");
    const workId = `test-preflight-${scenario.label}`;

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.find((c) => /stop|no|abort|cancel|block|report/i.test(c))
        ?? "Stop. Do not proceed; report the PREFLIGHT RESULT block.",
    ], false);

    const ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: `paw-pr-preflight-${scenario.label}`,
      systemPrompt: buildPreflightPrompt(skill, workId),
      answerer,
    });
    contexts.push(ctx);

    await seedRepository(ctx.fixture.workDir, ctx.fixture.workspaceDir, workId, scenario);

    const response = await ctx.session.sendAndWait({
      prompt: [
        `Run paw-pr pre-flight validation for work ID: ${workId}.`,
        "Report the PREFLIGHT RESULT block at the end.",
      ].join("\n"),
    }, 240_000);

    const result = parsePreflight(response?.data?.content ?? "");

    assertToolCalls(ctx.toolLog, {
      forbidden: ["git_push"],
      bashMustNotInclude: [/git push/, /gh\s+pr\s+create/],
    });

    return { result, ctx, workId };
  }

  async function assertNoFabricatedArtifacts(ctx: TestContext, workId: string): Promise<void> {
    for (const name of STANDARD_ARTIFACTS) {
      assert.ok(
        !(await exists(join(ctx.fixture.workDir, ".paw/work", workId, name))),
        `Pre-flight must not create ${name} for a PAW Lite run`,
      );
    }
    const plan = await readFile(join(ctx.fixture.workDir, ".paw/work", workId, "Plan.md"), "utf-8");
    assert.strictEqual(plan, LITE_PLAN, "Pre-flight must not modify Plan.md");
  }

  function assertNoStandardArtifactDemands(result: PreflightResult): void {
    for (const name of STANDARD_ARTIFACTS) {
      assert.ok(
        !result.missing.includes(name),
        `Lite pre-flight should not require ${name}. missing_artifacts: ${result.missing}\nResponse: ${result.raw.slice(-1500)}`,
      );
    }
  }

  it("PAW Lite (custom mode, commit-and-clean): passes with Lite artifacts only", async () => {
    const { result, ctx, workId } = await runPreflight({
      label: "lite-custom",
      workflowMode: "custom",
      lifecycle: "commit-and-clean",
      artifacts: { "Plan.md": LITE_PLAN },
    });

    assertNoStandardArtifactDemands(result);
    assert.match(result.status, /passed/i, `Expected Lite pre-flight to pass.\nResponse: ${result.raw.slice(-1500)}`);
    await assertNoFabricatedArtifacts(ctx, workId);
    assert.match(result.profile, /paw-lite/i, `Expected PAW Lite profile.\nResponse: ${result.raw.slice(-1500)}`);
  });

  it("PAW Lite with Workflow Mode: full (never-commit): passes with a warning, no full-mode demands", async () => {
    const { result, ctx, workId } = await runPreflight({
      label: "lite-full-mode",
      workflowMode: "full",
      lifecycle: "never-commit",
      artifacts: { "Plan.md": LITE_PLAN },
    });

    assertNoStandardArtifactDemands(result);
    assert.match(result.status, /passed/i, `Expected Lite pre-flight to pass.\nResponse: ${result.raw.slice(-1500)}`);
    await assertNoFabricatedArtifacts(ctx, workId);
    assert.match(result.profile, /paw-lite/i, `Expected PAW Lite profile.\nResponse: ${result.raw.slice(-1500)}`);
    assert.match(
      result.warnings,
      /workflow mode|full/i,
      `Expected a Workflow Mode warning.\nwarnings: ${result.warnings}\nResponse: ${result.raw.slice(-1500)}`,
    );
  });

  it("standard full mode: still blocks on missing CodeResearch.md, Spec.md, and Docs.md", async () => {
    const { result } = await runPreflight({
      label: "standard-full",
      workflowMode: "full",
      lifecycle: "commit-and-clean",
      artifacts: { "ImplementationPlan.md": COMPLETE_IMPLEMENTATION_PLAN },
    });

    assert.match(result.profile, /standard/i, `Expected Standard profile.\nResponse: ${result.raw.slice(-1500)}`);
    assert.match(result.status, /blocked/i, `Expected full-mode pre-flight to block.\nResponse: ${result.raw.slice(-1500)}`);
    for (const name of ["CodeResearch.md", "Spec.md", "Docs.md"]) {
      assert.ok(
        result.missing.includes(name),
        `Full mode should still require ${name}. missing_artifacts: ${result.missing}\nResponse: ${result.raw.slice(-1500)}`,
      );
    }
    assert.ok(!result.missing.includes("Plan.md"), `Standard profile should not require Plan.md. missing_artifacts: ${result.missing}`);
  });

  it("standard minimal mode: still blocks on missing CodeResearch.md only", async () => {
    const { result } = await runPreflight({
      label: "standard-minimal",
      workflowMode: "minimal",
      lifecycle: "commit-and-clean",
      artifacts: { "ImplementationPlan.md": COMPLETE_IMPLEMENTATION_PLAN },
    });

    assert.match(result.profile, /standard/i, `Expected Standard profile.\nResponse: ${result.raw.slice(-1500)}`);
    assert.match(result.status, /blocked/i, `Expected minimal-mode pre-flight to block.\nResponse: ${result.raw.slice(-1500)}`);
    assert.ok(
      result.missing.includes("CodeResearch.md"),
      `Minimal mode should still require CodeResearch.md. missing_artifacts: ${result.missing}\nResponse: ${result.raw.slice(-1500)}`,
    );
    for (const name of ["Spec.md", "Docs.md", "Plan.md"]) {
      assert.ok(
        !result.missing.includes(name),
        `Minimal mode should not require ${name}. missing_artifacts: ${result.missing}\nResponse: ${result.raw.slice(-1500)}`,
      );
    }
  });
});
