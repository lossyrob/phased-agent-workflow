/**
 * Tests for tool policy — sandbox enforcement.
 * These tests don't require SDK auth and run offline.
 */
import { describe, it } from "node:test";
import assert from "node:assert";
import { ToolPolicy } from "../../lib/tool-policy.js";

describe("ToolPolicy", () => {
  const policy = new ToolPolicy("/tmp/paw-test-workspace");

  it("denies git push", () => {
    const result = policy.check({
      toolName: "bash",
      input: { command: "git push origin main" },
    });
    assert.strictEqual(result.action, "deny");
  });

  it("denies gh pr create", () => {
    const result = policy.check({
      toolName: "bash",
      input: { command: "gh pr create --title test" },
    });
    assert.strictEqual(result.action, "deny");
  });

  it("denies gh issue create", () => {
    const result = policy.check({
      toolName: "bash",
      input: { command: "gh issue create --title test" },
    });
    assert.strictEqual(result.action, "deny");
  });

  it("denies rm -rf outside workspace", () => {
    const result = policy.check({
      toolName: "bash",
      input: { command: "rm -rf /home/user/important" },
    });
    assert.strictEqual(result.action, "deny");
  });

  it("denies rm -fr outside workspace", () => {
    const result = policy.check({
      toolName: "bash",
      input: { command: "rm -fr /home/user/important" },
    });
    assert.strictEqual(result.action, "deny");
  });

  it("denies rm -r -f outside workspace", () => {
    const result = policy.check({
      toolName: "bash",
      input: { command: "rm -r -f /home/user/important" },
    });
    assert.strictEqual(result.action, "deny");
  });

  it("allows rm -rf inside workspace", () => {
    const result = policy.check({
      toolName: "bash",
      input: { command: "rm -rf /tmp/paw-test-workspace/node_modules" },
    });
    assert.strictEqual(result.action, "allow");
  });

  it("denies file create outside workspace", () => {
    const result = policy.check({
      toolName: "create",
      input: { path: "/home/user/malicious.txt" },
    });
    assert.strictEqual(result.action, "deny");
  });

  it("denies path traversal via ..", () => {
    const result = policy.check({
      toolName: "create",
      input: { path: "/tmp/paw-test-workspace/../../../etc/passwd" },
    });
    assert.strictEqual(result.action, "deny");
  });

  it("allows file create inside workspace", () => {
    const result = policy.check({
      toolName: "create",
      input: { path: "/tmp/paw-test-workspace/src/new-file.ts" },
    });
    assert.strictEqual(result.action, "allow");
  });

  it("allows safe bash commands", () => {
    const result = policy.check({
      toolName: "bash",
      input: { command: "npm test" },
    });
    assert.strictEqual(result.action, "allow");
  });

  it("allows git operations that aren't push", () => {
    const result = policy.check({
      toolName: "bash",
      input: { command: "git status && git add ." },
    });
    assert.strictEqual(result.action, "allow");
  });
});
