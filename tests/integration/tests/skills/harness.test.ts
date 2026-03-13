/**
 * Tests for fixture management and assertions.
 * These tests don't require SDK auth and run offline.
 */
import { describe, it, afterEach } from "node:test";
import assert from "node:assert";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { TestFixture } from "../../lib/fixtures.js";
import { createCallerAndExecution } from "../../lib/multi-checkout.js";
import { assertArtifactExists, assertSpecStructure, assertToolCalls } from "../../lib/assertions.js";
import { isForwardCompatibleProtocolMismatch } from "../../lib/harness.js";
import { ToolCallLog } from "../../lib/trace.js";
import { loadSkill } from "../../lib/skills.js";

describe("TestFixture", () => {
  let fixture: TestFixture | null = null;

  afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = null;
    }
  });

  it("clones template to temp directory", async () => {
    fixture = await TestFixture.clone("minimal-ts");
    assert.ok(fixture.workDir.includes("paw-test-"), "Should be in temp dir");

    const branch = await fixture.getBranch();
    assert.ok(branch, "Should have a git branch");
  });

  it("seeds workflow state", async () => {
    fixture = await TestFixture.clone("minimal-ts");
    await fixture.seedWorkflowState("test-feature", "spec");

    const specPath = join(fixture.workDir, ".paw/work/test-feature/Spec.md");
    const { readFile } = await import("fs/promises");
    const content = await readFile(specPath, "utf-8");
    assert.ok(content.includes("Health Endpoint"), "Should contain seeded spec");
  });

  it("creates a separate execution worktree without mutating caller state", async () => {
    const checkouts = await createCallerAndExecution("minimal-ts", "test-worktree", "feature/test-worktree");
    fixture = checkouts.fixture;

    assert.notStrictEqual(checkouts.caller.path, checkouts.execution.path);
    const callerBranch = await checkouts.caller.branch();
    assert.ok(callerBranch.length > 0, "caller checkout should have a branch");
    assert.notStrictEqual(callerBranch, "feature/test-worktree");
    assert.strictEqual(await checkouts.caller.status(), "");
    assert.strictEqual(await checkouts.execution.branch(), "feature/test-worktree");
  });

  it("keeps artifact writes scoped to the execution checkout path", async () => {
    const checkouts = await createCallerAndExecution("minimal-ts", "test-scope", "feature/test-scope");
    fixture = checkouts.fixture;

    await mkdir(join(checkouts.execution.path, ".paw/work/test-scope"), { recursive: true });
    await writeFile(
      join(checkouts.execution.path, ".paw/work/test-scope/Spec.md"),
      "# Scoped spec\n\nExecution checkout only.\n",
    );

    assert.strictEqual(await checkouts.execution.exists(".paw/work/test-scope/Spec.md"), true);
    assert.strictEqual(await checkouts.caller.exists(".paw/work/test-scope/Spec.md"), false);
  });
});

describe("assertions", () => {
  let fixture: TestFixture | null = null;

  afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = null;
    }
  });

  it("assertArtifactExists finds seeded artifacts", async () => {
    fixture = await TestFixture.clone("minimal-ts");
    await fixture.seedWorkflowState("test-feature", "spec");

    const content = await assertArtifactExists(fixture.workDir, "test-feature", "Spec.md");
    assert.ok(content.length > 0);
  });

  it("assertArtifactExists fails for missing artifacts", async () => {
    fixture = await TestFixture.clone("minimal-ts");

    await assert.rejects(
      () => assertArtifactExists(fixture!.workDir, "nonexistent", "Spec.md"),
      /Artifact not found/,
    );
  });

  it("assertSpecStructure validates seeded spec", async () => {
    fixture = await TestFixture.clone("minimal-ts");
    await fixture.seedWorkflowState("test-feature", "spec");

    await assertSpecStructure(fixture.workDir, "test-feature", {
      hasOverview: true,
      hasFunctionalRequirements: true,
      hasSuccessCriteria: true,
      minFRCount: 2,
    });
  });

  it("assertToolCalls detects required tools", () => {
    const log = new ToolCallLog();
    log.start("bash", { command: "npm test" });
    log.start("create", { path: "/tmp/file.ts" });

    assertToolCalls(log, {
      required: ["bash", "create"],
    });
  });

  it("assertToolCalls detects forbidden tools", () => {
    const log = new ToolCallLog();
    log.start("bash", { command: "git push origin main" });

    assert.throws(
      () => assertToolCalls(log, { forbidden: ["bash"] }),
      /Forbidden tool called/,
    );
  });

  it("assertToolCalls checks bash command content", () => {
    const log = new ToolCallLog();
    log.start("bash", { command: "npm run build && npm test" });

    assertToolCalls(log, {
      bashMustInclude: [/npm test/],
      bashMustNotInclude: [/git push/],
    });
  });
});

describe("skill loader", () => {
  it("loads paw-spec skill", async () => {
    const content = await loadSkill("paw-spec");
    assert.ok(content.length > 0, "Skill content should not be empty");
    assert.ok(content.includes("Specification"), "Should contain Specification keyword");
  });

  it("loads paw-planning skill", async () => {
    const content = await loadSkill("paw-planning");
    assert.ok(content.length > 0);
    assert.ok(content.includes("Planning") || content.includes("Implementation"));
  });

  it("throws for nonexistent skill", async () => {
    await assert.rejects(
      () => loadSkill("nonexistent-skill"),
      { code: "ENOENT" },
    );
  });
});

describe("harness protocol compatibility", () => {
  it("accepts the observed one-version-forward protocol mismatch", () => {
    assert.strictEqual(
      isForwardCompatibleProtocolMismatch(
        new Error("SDK protocol version mismatch: SDK expects version 2, but server reports version 3. Please update your SDK or server to ensure compatibility."),
      ),
      true,
    );
  });

  it("rejects larger protocol gaps", () => {
    assert.strictEqual(
      isForwardCompatibleProtocolMismatch(
        new Error("SDK protocol version mismatch: SDK expects version 2, but server reports version 4. Please update your SDK or server to ensure compatibility."),
      ),
      false,
    );
  });
});
