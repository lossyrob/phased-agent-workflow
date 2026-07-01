import assert from "node:assert";

export const FORBIDDEN_RUNTIME_MARKERS = [
  "## Control State",
  "TODO Mirror:",
  "Reconciliation:",
  "### Required Workflow Items",
  "### Gate Items",
  "### Configured Procedure Items",
] as const;

const ALLOWED_WORKFLOW_CONTEXT_HEADINGS = new Set(["WorkflowContext"]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractWorkflowContextTemplate(content: string): string {
  const match = content.match(/```markdown\r?\n# WorkflowContext\r?\n[\s\S]*?\r?\n```/);
  assert.ok(match, "paw-init should contain a fenced WorkflowContext.md template");
  return match[0].replace(/^```markdown\r?\n/, "").replace(/\r?\n```$/, "");
}

export function assertNoRuntimeMarkers(content: string, label: string): void {
  for (const marker of FORBIDDEN_RUNTIME_MARKERS) {
    assert.doesNotMatch(
      content,
      new RegExp(escapeRegExp(marker)),
      `${label} should not contain runtime marker: ${marker}`,
    );
  }
}

export function assertWorkflowContextConfigOnly(content: string, label: string): void {
  assertNoRuntimeMarkers(content, label);

  const headings = [...content.matchAll(/^(#{1,6})\s+(.+?)\s*$/gm)]
    .map((match) => match[2]);
  for (const heading of headings) {
    assert.ok(
      ALLOWED_WORKFLOW_CONTEXT_HEADINGS.has(heading),
      `${label} should not contain mutable WorkflowContext section heading: ${heading}`,
    );
  }
}
