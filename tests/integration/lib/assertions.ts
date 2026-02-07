import assert from "node:assert";
import { readFile, access } from "fs/promises";
import { join } from "path";
import { ToolCallLog } from "./trace.js";

/** Assert an artifact file exists and is non-empty. Returns its content. */
export async function assertArtifactExists(
  workDir: string,
  workId: string,
  artifactName: string,
): Promise<string> {
  const artifactPath = join(workDir, ".paw/work", workId, artifactName);
  try {
    await access(artifactPath);
  } catch {
    assert.fail(`Artifact not found: ${artifactPath}`);
  }
  const content = await readFile(artifactPath, "utf-8");
  assert.ok(content.length > 0, `Artifact ${artifactName} is empty`);
  return content;
}

/** Assert Spec.md has expected structural elements. */
export async function assertSpecStructure(
  workDir: string,
  workId: string,
  expected: {
    hasOverview?: boolean;
    hasFunctionalRequirements?: boolean;
    hasSuccessCriteria?: boolean;
    minFRCount?: number;
  },
): Promise<void> {
  const content = await assertArtifactExists(workDir, workId, "Spec.md");

  if (expected.hasOverview) {
    assert.match(content, /overview/im, "Missing overview concept");
  }
  if (expected.hasFunctionalRequirements) {
    assert.match(content, /FR-\d+/m, "Missing functional requirements");
  }
  if (expected.hasSuccessCriteria) {
    assert.match(content, /SC-\d+/m, "Missing success criteria");
  }
  if (expected.minFRCount) {
    const count = (content.match(/FR-\d+/gm) || []).length;
    assert.ok(
      count >= expected.minFRCount,
      `Expected ${expected.minFRCount}+ FRs, got ${count}`,
    );
  }
}

/** Assert ImplementationPlan.md has expected phase structure. */
export async function assertPlanStructure(
  workDir: string,
  workId: string,
  expected: {
    minPhases?: number;
    hasSuccessCriteria?: boolean;
  },
): Promise<void> {
  const content = await assertArtifactExists(workDir, workId, "ImplementationPlan.md");

  if (expected.minPhases) {
    const phases = (content.match(/^## Phase \d+/gm) || []).length;
    assert.ok(
      phases >= expected.minPhases,
      `Expected ${expected.minPhases}+ phases, got ${phases}`,
    );
  }
  if (expected.hasSuccessCriteria) {
    assert.match(content, /success criteria/im, "Missing success criteria");
  }
}

/** Assert on tool call patterns. */
export function assertToolCalls(
  log: ToolCallLog,
  assertions: {
    required?: string[];
    forbidden?: string[];
    bashMustInclude?: RegExp[];
    bashMustNotInclude?: RegExp[];
  },
): void {
  const called = new Set(log.calls.map((c) => c.name));

  for (const tool of assertions.required ?? []) {
    assert.ok(called.has(tool), `Expected tool call: ${tool}`);
  }
  for (const tool of assertions.forbidden ?? []) {
    assert.ok(!called.has(tool), `Forbidden tool called: ${tool}`);
  }

  const bashCmds = log.bashCommands();
  for (const pattern of assertions.bashMustInclude ?? []) {
    assert.ok(
      bashCmds.some((cmd) => pattern.test(cmd)),
      `No bash call matching ${pattern}`,
    );
  }
  for (const pattern of assertions.bashMustNotInclude ?? []) {
    assert.ok(
      !bashCmds.some((cmd) => pattern.test(cmd)),
      `Bash call matches forbidden ${pattern}`,
    );
  }
}
