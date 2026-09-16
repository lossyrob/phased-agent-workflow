import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile, readdir } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

const REPO_ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const SKILL_ROOT = resolve(REPO_ROOT, "skills", "paw-system-review");
const [skill, guidance, guide] = await Promise.all([
  readFile(resolve(SKILL_ROOT, "SKILL.md"), "utf-8"),
  readFile(resolve(SKILL_ROOT, "references", "reviewer-guidance.md"), "utf-8"),
  readFile(resolve(REPO_ROOT, "docs", "guide", "system-review.md"), "utf-8"),
]);

function section(content: string, heading: string): string {
  const normalized = content.replace(/\r\n/g, "\n");
  const marker = `## ${heading}\n`;
  const start = normalized.indexOf(marker);
  assert.ok(start >= 0, `Missing section: ${heading}`);
  return normalized.slice(start + marker.length).split("\n## ")[0];
}

describe("experimental system review static contracts (no live reviewers)", () => {
  it("ships a standalone opt-in skill through existing discovery surfaces", async () => {
    assert.match(skill, /^name: paw-system-review$/m);
    assert.match(skill, /Use only when the caller explicitly selects paw-system-review/);
    assert.match(skill, /Do not invoke PAW Review, `paw-sot`, or a full PAW initialization/);
    assert.match(skill, /\[reviewer guidance\]\(references\/reviewer-guidance\.md\)/);
    assert.deepStrictEqual((await readdir(SKILL_ROOT)).sort(), ["SKILL.md", "references"]);

    const manifest = JSON.parse(await readFile(resolve(REPO_ROOT, "package.json"), "utf-8"));
    assert.strictEqual(
      manifest.contributes.chatSkills.filter(
        (entry: { path: string }) => entry.path === "./vscode-assets/skills/paw-system-review/SKILL.md",
      ).length,
      1,
    );
    const plugin = JSON.parse(await readFile(resolve(REPO_ROOT, "plugin.json"), "utf-8"));
    assert.strictEqual(plugin.skills, "skills/");
  });

  it("supports minimal planning and implementation inputs without fabricated verification", () => {
    assert.match(skill, /`planning` or `implementation`/);
    assert.match(skill, /Accept minimal planning input/);
    assert.match(skill, /missing context, and reduced coverage/);
    assert.match(skill, /Include relevant planning documentation with an implementation when available/);
    assert.match(guidance, /In \*\*planning\*\*.*current source, authoritative intent, relevant contracts/);
    assert.match(guidance, /Do not claim nonexistent implementation has been verified/);
    assert.match(guidance, /In \*\*implementation\*\*.*actual change/);
    assert.match(guidance, /Specifications and plans remain open to challenge in both modes/);
    assert.match(skill, /do not invent owners or contact others/);
  });

  it("maps evidence without turning observed code or a shared interpretation into authority", () => {
    const map = section(skill, "1. Compact shared evidence map");
    for (const category of [
      "owner-stated requirements",
      "documented guarantees",
      "observed behavior",
      "inference",
    ]) {
      assert.ok(map.includes(`**${category}**`));
    }
    assert.match(map, /Code cannot establish its own intended specification/);
    assert.match(map, /document's existence alone does not prove owner approval/);
    assert.match(map, /not an anticipated-bug list/);
    assert.match(map, /no whole-repo census.*zero-open-question gate/);
    assert.match(map, /without a fixed one-hop dependency limit/);
    assert.match(skill, /independently inspect relevant source and contracts.*context absent from the map/);
  });

  it("defines exactly four broad approaches in isolated first-pass contexts", () => {
    const passes = section(skill, "2. Fixed independent passes");
    const roster = [...passes.matchAll(/\| `(\w+)` \| `(REVIEW-[A-Z]+\.md)` \|/g)]
      .map(match => [match[1], match[2]]);
    assert.deepStrictEqual(roster, [
      ["forward", "REVIEW-FORWARD.md"],
      ["counterexample", "REVIEW-COUNTEREXAMPLE.md"],
      ["relational", "REVIEW-RELATIONAL.md"],
      ["simplicity", "REVIEW-SIMPLICITY.md"],
    ]);
    for (const [role] of roster) {
      assert.ok(section(guidance, role).length > 100);
    }
    assert.match(passes, /exactly four separate general-purpose reviewer contexts/);
    assert.match(passes, /isolated sequential execution is acceptable/);
    assert.match(passes, /separate contexts are unavailable, report incomplete/);
    assert.match(passes, /not domain boundaries/);
    assert.match(passes, /only that reviewer's approach section/);
    assert.match(passes, /no recursive delegation/);
    assert.match(passes, /not to read other reviewers' findings, prior review findings, or concurrent comparison-run findings/);
    assert.match(passes, /Do not forward early results/);
    assert.match(passes, /return only its path and completion status/);
    assert.match(skill, /Exclude prior or concurrent review findings.*through finalization/);
    assert.match(guidance, /During your first pass, do not read other reviewers' reports/);
    assert.match(guidance, /comparison-run findings throughout this run/);
  });

  it("gates one simplicity assessment on complete initial reports and proposed peer remedies", () => {
    const passes = section(skill, "2. Fixed independent passes");
    const adjudication = section(skill, "3. Adjudication and bounded remedy assessment");
    const peerRemedies = adjudication.match(/- \*\*Peer remedies present:\*\* (.*)/)?.[1];
    assert.ok(peerRemedies, "Missing peer-remedy assessment branch");
    assert.match(passes, /all four initial reports are durably written and complete/);
    assert.match(passes, /before sharing findings or starting remedy assessment/);
    assert.match(passes, /report is missing or incomplete.*return without claiming completion or crossing this barrier/);
    assert.match(peerRemedies, /Give the same simplicity reviewer/);
    assert.match(peerRemedies, /Reuse its context where supported/);
    assert.match(peerRemedies, /record the discontinuity/);
    assert.match(peerRemedies, /Do not rerun its first pass/);
    assert.match(adjudication, /`REMEDY-ASSESSMENT.md` separate.*never overwrite/);
    assert.match(peerRemedies, /Assess the proposed remedies once/);
    assert.match(peerRemedies, /assessment cannot complete.*mark the final result incomplete/);
    assert.match(guidance, /all four initial reports are durably written and complete, and at least one other reviewer proposes a remedy/);
    for (const outcome of [
      "Valid defect, proportionate remedy",
      "Valid defect, oversized remedy",
      "Unadopted requirement or stricter posture",
      "Justified complexity",
    ]) {
      assert.ok(section(guidance, "Remedy assessment").includes(outcome));
    }
  });

  it("records no peer remedies after the barrier without a no-op simplicity call", () => {
    const adjudication = section(skill, "3. Adjudication and bounded remedy assessment");
    const noPeerRemedies = adjudication.match(/- \*\*No peer remedies:\*\* (.*)/)?.[1];
    assert.ok(noPeerRemedies, "Missing no-peer-remedy branch");
    assert.match(adjudication, /After the barrier, read all initial reports and check for proposed remedies from the forward, counterexample, and relational reviewers/);
    assert.match(adjudication, /simplicity reviewer's own remedies alone do not trigger a second reviewer call/);
    assert.match(noPeerRemedies, /The lead writes `REMEDY-ASSESSMENT.md` with status `not-needed`/);
    assert.match(noPeerRemedies, /the reason, references to those three source reports/);
    assert.match(noPeerRemedies, /explicit attribution to the review lead/);
    assert.match(noPeerRemedies, /Do not wake or reconstitute the simplicity reviewer/);
    assert.match(noPeerRemedies, /Continue adjudication.*does not imply a clean overall review/);
    assert.match(guide, /After all four reports are durably complete.*forward, counterexample, and relational reports/);
    assert.match(guide, /`not-needed`.*reason, source-report references, and explicit lead attribution/);
    assert.match(guide, /without waking or reconstituting the simplicity reviewer/);
    assert.match(guide, /Remedies in the simplicity report alone do not trigger another reviewer call/);
    assert.doesNotMatch(guidance, /Record no proposed remedies if none exist/);
  });

  it("makes material unjustified complexity actionable without overriding owner authority", () => {
    const simplicity = section(guidance, "simplicity");
    assert.match(simplicity, /project-wide context/);
    assert.match(simplicity, /Existing code is evidence, not automatic proof of owner acceptance/);
    assert.match(simplicity, /incremental protection\/capability.*lifecycle, operational, and maintenance burden/);
    assert.match(simplicity, /agent-inferred stricter risk posture/);
    assert.match(simplicity, /defense in depth.*future-proofing.*not sufficient justification/);
    assert.match(simplicity, /need not prove elimination of every conceivable risk/);
    assert.match(simplicity, /Preserve explicit owner authority and mandatory constraints/);
    assert.match(simplicity, /BOTH planning and final implementation review/);
    assert.match(simplicity, /`MUST-FIX`.*even when functional behavior is correct/);
    assert.match(simplicity, /material burden, insufficient justification, and a credible simpler complete approach/);
    assert.match(simplicity, /minor cleanup advisory/);
    assert.match(guidance, /a functional failure is not required/);
  });

  it("requires checkable arguments and evidence-based dispositions rather than voting or slogans", () => {
    const shared = section(guidance, "Shared review rules");
    for (const phrase of [
      "claim", "source evidence", "reasoning connecting evidence to consequence",
      "reachability and assumptions", "rebuttal or falsification conditions",
      "severity and confidence", "minimum complete correction",
    ]) {
      assert.ok(shared.includes(phrase), `Missing finding requirement: ${phrase}`);
    }
    assert.match(skill, /Check decisive premises against pinned source\/contracts or bounded authorized checks/);
    assert.match(skill, /do not dismiss a valid defect because its proposed fix is excessive/);
    assert.match(skill, /Neither majority vote nor an unverified security label overrides evidence/);
    assert.match(skill, /not authorize rewriting an owner decision or waiving a mandatory constraint/);
    assert.match(skill, /traceable dispositions for every initial finding/);
    assert.match(skill, /merged\/rejected\/unresolved items and preserved dissent/);
    assert.match(skill, /not recurring full reviews or new rounds/);
    assert.match(skill, /No finding quotas/);
  });

  it("bounds all writes and checks and forbids provider output in both modes", () => {
    const boundaries = section(skill, "Inputs and boundaries");
    assert.match(boundaries, /Explicit caller-owned, target- and run-specific directory/);
    assert.match(boundaries, /Do not initialize workflow state, alter ignore files, or silently write into the reviewed checkout/);
    assert.match(boundaries, /Preserve existing runs/);
    assert.match(boundaries, /source edits, checkout switching, fetches, dependency installation/);
    assert.match(boundaries, /Inspect prospective checks for writes or external effects/);
    assert.match(boundaries, /report the limitation or request permission/);
    assert.match(boundaries, /Both modes are artifact-only.*never create pending or submitted provider reviews, post comments, or change issue\/PR state/);
    assert.match(boundaries, /without invoking posting, apply-fix, scheduling, comparative judging, or owner-routing workflows/);
    assert.match(guidance, /Follow the supplied verification permissions and output boundary/);
  });

  it("pins source and document identity and reports drift, incomplete work, and model unknowns", () => {
    assert.match(skill, /base\/head commits and diff scope/);
    assert.match(skill, /document versions and current-source revision/);
    assert.match(skill, /hashes or authorized snapshots/);
    assert.match(skill, /staged, unstaged, and relevant untracked content/);
    assert.match(skill, /Pin supporting document revisions too/);
    assert.match(skill, /check that mutable inputs still match the recorded versions/);
    assert.match(skill, /Never mix revisions silently or treat a stale\/incomplete run as current complete coverage/);
    assert.match(skill, /preserve the run without automatically rerunning/);
    assert.match(skill, /Use caller\/harness defaults unless explicit authorized model settings are supplied/);
    assert.match(skill, /mark unavailable resolved identity as unknown/);
    assert.match(skill, /Do not infer it from a persona or model's self-description/);
    assert.match(skill, /Actual method.*experimental/);
    assert.match(skill, /checks not permitted or not performed/);
    assert.doesNotMatch(skill + guidance, /\b(?:gpt-\d|claude-(?:opus|sonnet)-\d|gemini-\d)/i);
  });

  it("documents every output and experimental limitations without claiming live validation", () => {
    const artifacts = [...new Set(skill.match(/(?:EvidenceMap|REVIEW-[A-Z]+|REMEDY-ASSESSMENT)\.md/g))].sort();
    assert.deepStrictEqual(artifacts, [
      "EvidenceMap.md", "REMEDY-ASSESSMENT.md", "REVIEW-COUNTEREXAMPLE.md", "REVIEW-FORWARD.md",
      "REVIEW-RELATIONAL.md", "REVIEW-SIMPLICITY.md", "REVIEW-SYNTHESIS.md",
    ]);
    for (const artifact of artifacts) {
      assert.ok(guide.includes(`\`${artifact}\``), `Undocumented artifact: ${artifact}`);
    }
    assert.match(guide, /quality equivalence.*latency improvement.*not been established/i);
    assert.match(guide, /non-live checks cover the prompt contracts and packaging, not live reviewer compliance/);
    assert.match(guide, /no cross-run findings until both finish/);
  });
});
