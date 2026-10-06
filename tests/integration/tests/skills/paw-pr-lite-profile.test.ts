import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../../");

async function readRepoFile(relPath: string): Promise<string> {
  return readFile(resolve(REPO_ROOT, relPath), "utf-8");
}

describe("paw-pr PAW Lite pre-flight profile", () => {
  it("selects the PAW Lite profile from explicit identity, paw-lite invocation, or Plan.md fallback", async () => {
    const pawPr = await readRepoFile("skills/paw-pr/SKILL.md");

    assert.match(pawPr, /### Pre-flight Profile/);
    assert.match(
      pawPr,
      /`Workflow Identity` in WorkflowContext\.md, when present: `paw-lite` → \*\*PAW Lite\*\*; other values → \*\*Standard\*\*/,
      "explicit Workflow Identity should decide the profile when present",
    );
    assert.match(
      pawPr,
      /\*\*PAW Lite\*\* if loaded from `paw-lite` Stage 5, or `\.paw\/work\/<work-id>\/Plan\.md` exists without `ImplementationPlan\.md`/,
      "paw-lite invocation and the Plan.md-without-ImplementationPlan.md fallback should select PAW Lite",
    );
    assert.match(
      pawPr,
      /Else \*\*Standard\*\*: Required Checks and Workflow Mode Handling apply as written/,
      "all other runs should keep the standard checks",
    );
  });

  it("defines Lite requirements without standard PAW artifacts or ImplementationPlan phases", async () => {
    const pawPr = await readRepoFile("skills/paw-pr/SKILL.md");

    assert.match(pawPr, /### PAW Lite Profile/);
    assert.match(pawPr, /Replaces Phase Implementation, Artifacts Exist, and Open Questions Resolved/);
    assert.match(pawPr, /no open SQL todos for Lite work items/);
    assert.match(pawPr, /every `Plan\.md` work item delivered on the target branch/);
    assert.match(pawPr, /No phase, phase PR, or Phase Candidates checks/);
    assert.match(pawPr, /`Plan\.md` required; `WorkShaping\.md` and `reviews\/` optional/);
    assert.match(
      pawPr,
      /`CodeResearch\.md`, `ImplementationPlan\.md`, `Spec\.md`, `SpecResearch\.md`, `Docs\.md` not required in any Workflow Mode — never create or backfill them to pass pre-flight/,
    );
    assert.match(
      pawPr,
      /\*\*Workflow Mode\*\* `full` or `minimal`: report a non-blocking warning that Lite requirements were applied/,
    );
    assert.match(pawPr, /`Plan\.md` `## Open Questions` \(if present\) empty or resolved/);
  });

  it("covers Lite artifacts in PR descriptions and never-commit lifecycle", async () => {
    const pawPr = await readRepoFile("skills/paw-pr/SKILL.md");

    assert.match(pawPr, /### PAW Lite \(overrides Workflow Mode\)/);
    assert.match(pawPr, /Reference `Plan\.md`, plus `WorkShaping\.md` when present/);
    assert.match(pawPr, /`never-commit`: summarize the `Plan\.md` approach, work items, and key decisions in the PR body/);
  });

  it("keeps standard full/minimal/custom pre-flight requirements unchanged", async () => {
    const pawPr = await readRepoFile("skills/paw-pr/SKILL.md");

    for (const line of [
      "- All phases in ImplementationPlan.md marked complete",
      "- All phase PRs merged (prs strategy) or commits pushed (local strategy)",
      "**Artifacts Exist** (check existence per Workflow Mode):",
      "- CodeResearch.md (required: all modes)",
      "- ImplementationPlan.md (required: all modes)",
      "- Spec.md (required: full mode; optional: minimal/custom)",
      "- SpecResearch.md (optional: all modes)",
      "- Docs.md (required: full mode; optional: minimal/custom)",
      "- CodeResearch `## Open Questions` → resolved in Plan or code",
      "- ImplementationPlan `## Open Questions` → empty",
      "- Reference all artifacts: Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md, Docs.md",
      "- Reference only core artifacts: CodeResearch.md, ImplementationPlan.md",
      "- Adapt references based on Custom Workflow Instructions",
    ]) {
      assert.ok(pawPr.includes(line), `paw-pr standard profile should still contain: ${line}`);
    }
  });

  it("points paw-lite Stage 5 at the paw-pr Lite profile", async () => {
    const pawLite = await readRepoFile("skills/paw-lite/SKILL.md");
    const stage5 = pawLite.slice(pawLite.indexOf("### Stage 5: PR"), pawLite.indexOf("## Artifact Structure"));

    assert.match(stage5, /Load the `paw-pr` skill/);
    assert.match(stage5, /Use its PAW Lite pre-flight profile/);
    assert.match(stage5, /`Workflow Mode` adds no artifact requirements/);
    assert.match(
      stage5,
      /Never create standard PAW artifacts \(`CodeResearch\.md`, `ImplementationPlan\.md`, `Spec\.md`, `Docs\.md`\) to pass pre-flight/,
    );
  });
});
