import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../..");

async function readRepoFile(relativePath: string): Promise<string> {
  return readFile(resolve(REPO_ROOT, relativePath), "utf-8");
}

type ParsedItem = { id: string; status: string; kind: string };

function parseControlStateFixture(content: string): {
  todoMirror: string;
  reconciliation: string;
  items: ParsedItem[];
  terminalMarkers: string[];
} {
  const todoMirror = content.match(/^TODO Mirror:\s*(.+)$/m)?.[1]?.trim() ?? "";
  const reconciliation = content.match(/^Reconciliation:\s*(.+)$/m)?.[1]?.trim() ?? "";
  const items = [...content.matchAll(/^- `([^`]+)` \| `([^`]+)` \| `([^`]+)`$/gm)]
    .map(([, id, status, kind]) => ({ id, status, kind }));
  const terminalSection = content.split("### Terminal External Review State")[1] ?? "";
  const terminalMarkers = [...terminalSection.matchAll(/^- `([^`]+)`$/gm)]
    .map(([, marker]) => marker);

  return { todoMirror, reconciliation, items, terminalMarkers };
}

function serializeControlStateFixture(parsed: {
  todoMirror: string;
  reconciliation: string;
  items: ParsedItem[];
  terminalMarkers: string[];
}): string {
  const lines = [
    "## Control State",
    "",
    `TODO Mirror: ${parsed.todoMirror}`,
    `Reconciliation: ${parsed.reconciliation}`,
    "",
    "### Required Workflow Items",
    ...parsed.items.map((item) => `- \`${item.id}\` | \`${item.status}\` | \`${item.kind}\``),
    "",
    "### Terminal External Review State",
    ...parsed.terminalMarkers.map((marker) => `- \`${marker}\``),
  ];

  return lines.join("\n");
}

describe("control-state contract content", () => {
  it("defines a shared control-state core for workflow and review references", async () => {
    const workflow = await readRepoFile("skills/paw-workflow/references/control-state-contract.md");
    const review = await readRepoFile("skills/paw-review-workflow/references/control-state-contract.md");

    for (const content of [workflow, review]) {
      assert.match(content, /## Shared Core/);
      assert.match(content, /legacy best-effort mode/i);
      assert.match(content, /TODOs are an execution mirror|built-in TODOs are a mirror/i);
      assert.match(content, /- \\`<item-id>\\` \| \\`<status>\\` \| \\`<kind>\\`/);
      assert.match(content, /`pending`/);
      assert.match(content, /`in_progress`/);
      assert.match(content, /`blocked`/);
      assert.match(content, /`resolved`/);
      assert.match(content, /`not_applicable`/);
      assert.match(content, /`not_run`/);
      assert.match(content, /`current`/);
      assert.match(content, /`stale`/);
      assert.match(content, /`external_unverified`/);
      assert.match(content, /## Control State/);
    }

    assert.match(workflow, /phase:<n>:<slug>/);
    assert.match(workflow, /Workflow Identity: paw/);
    assert.match(workflow, /Workflow Identity: paw-lite/);
    assert.match(workflow, /## PAW Lite WorkflowContext Embedding/);
    assert.match(workflow, /`implementation` \| `pending` \| `activity`/);
    assert.match(workflow, /procedure:planning-review/);
    assert.match(
      workflow,
      /Use `not_applicable` for `spec`, `spec-review`, and `transition:after-spec-review` when `Workflow Mode` is `minimal`; otherwise use `pending`\./,
    );
    assert.match(
      workflow,
      /Use `pending` for `planning-docs-review`, `transition:after-planning-docs-review`, and `procedure:planning-review` when `Planning Docs Review` is `enabled`; otherwise use `not_applicable`\./,
    );
    assert.match(
      workflow,
      /Use `pending` for `final-review`, `transition:after-final-review`, and `procedure:final-review` when `Final Agent Review` is `enabled`; otherwise use `not_applicable`\./,
    );
    assert.match(review, /output:feedback/);
    assert.match(review, /pending-review-created/);
    assert.match(review, /manual-posting-provided/);
    assert.match(review, /must contain exactly one current marker/i);
  });

  it("documents control-state templates in init and review-understanding", async () => {
    const init = await readRepoFile("skills/paw-init/SKILL.md");
    const review = await readRepoFile("skills/paw-review-understanding/SKILL.md");

    assert.match(init, /## Control State/);
    assert.match(init, /Workflow Identity: <workflow_identity or "paw">/);
    assert.match(init, /TODO Mirror:\s*active-required-items/i);
    assert.match(
      init,
      /`spec` \| `<pending\|not_applicable>` \| `activity`/,
    );
    assert.match(
      init,
      /Use `not_applicable` for `spec`, `spec-review`, and `transition:after-spec-review` when `Workflow Mode` is `minimal`; otherwise use `pending`\./,
    );
    assert.match(
      init,
      /After planning defines named implementation phases, append `phase:<n>:<slug>` items under `### Required Workflow Items`\./,
    );
    assert.doesNotMatch(
      init,
      /- add `phase:<n>:<slug>` items after planning defines named implementation phases/,
    );
    assert.match(
      init,
      /`planning-docs-review` \| `<pending\|not_applicable>` \| `activity`/,
    );
    assert.match(
      init,
      /Use `pending` for `planning-docs-review`, `transition:after-planning-docs-review`, and `procedure:planning-review` when `Planning Docs Review` is `enabled`; otherwise use `not_applicable`\./,
    );
    assert.match(
      init,
      /Use `pending` for `final-review`, `transition:after-final-review`, and `procedure:final-review` when `Final Agent Review` is `enabled`; otherwise use `not_applicable`\./,
    );
    assert.match(
      init,
      /When `Workflow Identity` is `paw-lite`, replace the standard `## Control State` section above with:/,
    );
    assert.match(
      init,
      /`implementation` \| `pending` \| `activity`/,
    );
    assert.match(
      init,
      /Keep `workflow_mode=custom`, `review_strategy=local`, `review_policy=final-pr-only`, and `planning_docs_review=disabled` unless the current request explicitly supplies different supported values\./,
    );
    assert.match(init, /transition:after-plan-review/);
    assert.match(init, /procedure:planning-review/);

    assert.match(review, /## Control State/);
    assert.match(review, /output:critique-response/);
    assert.match(review, /Pending Review ID:\s*`none`/i);
  });

  it("parses serialized control-state fixtures idempotently", () => {
    const fixture = [
      "## Control State",
      "",
      "TODO Mirror: active-required-items",
      "Reconciliation: current",
      "",
      "### Required Workflow Items",
      "- `spec` | `resolved` | `activity`",
      "- `plan-review` | `blocked` | `activity`",
      "- `transition:after-plan-review` | `pending` | `transition`",
      "",
      "### Terminal External Review State",
      "- `none`",
      "- `pending-review-created`",
    ].join("\n");

    const parsed = parseControlStateFixture(fixture);
    const reparsed = parseControlStateFixture(serializeControlStateFixture(parsed));

    assert.deepStrictEqual(reparsed, parsed);
  });
});
