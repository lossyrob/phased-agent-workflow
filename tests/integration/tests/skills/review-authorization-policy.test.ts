import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile, readdir } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../../");

async function readRepoFile(relativePath: string): Promise<string> {
  return readFile(resolve(REPO_ROOT, relativePath), "utf-8");
}

async function readReviewPromptSurface(): Promise<string> {
  const skillRoot = resolve(REPO_ROOT, "skills");
  const skillNames = (await readdir(skillRoot)).filter(name => name.startsWith("paw-review-"));
  const skillContents = await Promise.all(
    skillNames.map(name => readFile(resolve(skillRoot, name, "SKILL.md"), "utf-8")),
  );
  const agent = await readRepoFile("agents/PAW-Review.agent.md");
  const prompt = await readRepoFile("prompts/paw-review.prompt.md");
  return [agent, prompt, ...skillContents].join("\n");
}

describe("PAW Review authorization policy", () => {
  it("classifies invariants, defaults, and user-configurable policy", async () => {
    const specification = await readRepoFile("paw-review-specification.md");

    assert.match(specification, /## Authorization Policy Inventory/);
    assert.match(specification, /\*\*True invariants\*\*/);
    assert.match(specification, /\*\*Defaults\*\*/);
    assert.match(specification, /\*\*User-configurable\*\*/);
    assert.match(
      specification,
      /Explicit user direction overrides a PAW-owned default.*does not override a true invariant or create an unavailable platform capability/is,
    );
  });

  it("removes pending-only prohibitions across PAW Review prompt surfaces", async () => {
    const content = await readReviewPromptSurface();

    assert.doesNotMatch(content, /pending (?:GitHub )?reviews? are NEVER auto-submitted/i);
    assert.doesNotMatch(content, /NEVER submit the pending review automatically/i);
    assert.doesNotMatch(content, /never auto-submit/i);
  });

  it("keeps pending as the default and honors explicit repeated authorization", async () => {
    const workflow = await readRepoFile("skills/paw-review-workflow/SKILL.md");
    const github = await readRepoFile("skills/paw-review-github/SKILL.md");

    assert.match(workflow, /GitHub reviews are pending by default/i);
    assert.match(
      workflow,
      /Repeating the same authorization for the same target, head, and event confirms it/i,
    );
    assert.match(github, /Repeated authorization before submission confirms the same mutation/i);
    assert.match(
      github,
      /Repeated authorization after submission returns the recorded submitted state without creating or submitting another review/i,
    );
  });

  it("separates Azure DevOps output preflight from hosted read preflight", async () => {
    const agent = await readRepoFile("agents/PAW-Review.agent.md");
    const workflow = await readRepoFile("skills/paw-review-workflow/SKILL.md");
    const understanding = await readRepoFile("skills/paw-review-understanding/SKILL.md");

    assert.match(agent, /report it before the Understanding stage/i);
    assert.match(workflow, /Classify the review platform as `github`, `azure-devops`, or `local`/i);
    assert.match(
      workflow,
      /Do not probe Azure DevOps submission APIs, mutation permissions, or output endpoints solely to manufacture output capability/i,
    );
    assert.match(workflow, /Output capability and hosted read capability are separate/i);
    assert.match(workflow, /successful reads never enable posting or voting/i);
    assert.match(understanding, /references\/azure-devops-read-context\.md/i);
    assert.match(understanding, /block rather than silently degrading/i);
    assert.match(
      workflow,
      /If authorization is ambiguous or an explicitly requested mutation is unavailable, report the conflict before analysis/i,
    );
  });

  it("persists the authorization contract in ReviewContext.md", async () => {
    const understanding = await readRepoFile("skills/paw-review-understanding/SKILL.md");

    for (const field of [
      "Review Platform",
      "Output Capability",
      "Requested Output Action",
      "Feedback Scope Filter",
      "Submission Authorization",
      "Submission Event",
      "Authorized Target",
      "Authorized Head Commit",
      "Authorized Pending Review",
      "Authorization Conflict",
      "Preflight Status",
    ]) {
      assert.match(understanding, new RegExp(`\\*\\*${field}\\*\\*`));
    }
  });

  it("fails closed unless the live GitHub authorization tuple matches", async () => {
    const github = await readRepoFile("skills/paw-review-github/SKILL.md");

    assert.match(github, /APPROVE.*REQUEST_CHANGES.*COMMENT/s);
    assert.match(github, /repository \+ PR \+ live head \+ pending review ID \+ event/);
    assert.match(github, /Leave any pending review untouched for manual inspection/i);
    assert.match(github, /fresh analysis and authorization are required/i);
    assert.match(github, /Do not submit or recreate the review/i);
    assert.match(github, /A submitted review is terminal for this workflow run/i);
  });

  it("reuses one pending review and binds its concrete ID before submission", async () => {
    const github = await readRepoFile("skills/paw-review-github/SKILL.md");

    assert.match(
      github,
      /Otherwise, use a concrete `Authorized Pending Review` ID from ReviewContext\.md/i,
    );
    assert.match(github, /If both artifacts contain concrete IDs and they differ, block/i);
    assert.match(github, /Do not create a duplicate/i);
    assert.match(
      github,
      /If `Authorized Pending Review` is `bind-created-review`, replace it with the re-resolved pending review ID before evaluating submission/i,
    );
    assert.match(
      github,
      /If `Authorized Pending Review` is `bind-created-review`, replace it in ReviewContext\.md with the returned ID/i,
    );
  });

  it("persists recoverable review identity before adding comments", async () => {
    const github = await readRepoFile("skills/paw-review-github/SKILL.md");
    const createIndex = github.indexOf("1. Create one pending review");
    const persistIndex = github.indexOf("2. Immediately record the returned review ID");
    const verifyIndex = github.indexOf("4. Re-resolve the recorded ID");
    const commentIndex = github.indexOf("5. Add each missing postable inline comment");

    assert.ok(createIndex >= 0);
    assert.ok(createIndex < persistIndex);
    assert.ok(persistIndex < verifyIndex);
    assert.ok(verifyIndex < commentIndex);
    assert.match(github, /Add only missing comments and record each returned comment ID/i);
  });

  it("keeps Azure DevOps and local output capability-aware and artifact-only", async () => {
    const github = await readRepoFile("skills/paw-review-github/SKILL.md");
    const docs = await readRepoFile("docs/specification/review.md");

    assert.match(github, /platform is Azure DevOps or local/i);
    assert.match(github, /Do not call GitHub mutation tools/i);
    assert.match(
      github,
      /An explicit unsupported submission request must have been reported before the Understanding stage/i,
    );
    assert.match(
      docs,
      /Azure DevOps acquires hosted PR\/CI read context but stays artifact-only for output/i,
    );
  });

  it("treats feedback scope and tone as explicit user-configurable policy", async () => {
    const feedback = await readRepoFile("skills/paw-review-feedback/SKILL.md");

    assert.match(feedback, /By default, transform all findings/i);
    assert.match(feedback, /Honor explicit scope or output filters recorded in ReviewContext\.md/i);
    assert.match(feedback, /honor explicit tone direction/i);
    assert.match(
      feedback,
      /Summary follows the persisted professional tone direction; otherwise it is positive and constructive by default/i,
    );
    assert.doesNotMatch(feedback, /ALL findings from evaluation artifacts must be transformed/i);
    assert.doesNotMatch(feedback, /Summary must be positive and constructive/i);
    assert.doesNotMatch(feedback, /Summary comment is positive and constructive/i);
  });
});
