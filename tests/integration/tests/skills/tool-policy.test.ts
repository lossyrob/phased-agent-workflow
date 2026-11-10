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

  it("allows rm -rf for relative paths inside workspace", () => {
    const localPolicy = new ToolPolicy("/tmp/paw-test-workspace/repo");
    const result = localPolicy.check({
      toolName: "bash",
      input: { command: "rm -rf node_modules" },
    });
    assert.strictEqual(result.action, "allow");
  });

  it("denies rm -rf for relative paths escaping workspace", () => {
    const localPolicy = new ToolPolicy("/tmp/paw-test-workspace/repo");
    const result = localPolicy.check({
      toolName: "bash",
      input: { command: "rm -rf ../outside" },
    });
    assert.strictEqual(result.action, "deny");
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

  it("allows file create inside a secondary allowed root", () => {
    const multiRootPolicy = new ToolPolicy(
      "/tmp/paw-test-workspace/caller",
      ["/tmp/paw-test-workspace/execution"],
    );
    const result = multiRootPolicy.check({
      toolName: "create",
      input: { path: "/tmp/paw-test-workspace/execution/src/new-file.ts" },
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

  describe("offline with a gh stub", () => {
    const stub = "/tmp/paw-test-workspace-ws/bin/gh";
    const offline = new ToolPolicy("/tmp/paw-test-workspace", [], { offlineWithGhStub: stub });
    const bash = (command: string) => offline.check({ toolName: "bash", input: { command } }).action;

    it("allows the stub and plain gh", () => {
      assert.strictEqual(bash(`"${stub}" pr view 7 --json title`), "allow");
      assert.strictEqual(bash("gh pr diff 7"), "allow");
    });

    it("denies another gh binary, curl and the GitHub API host", () => {
      assert.strictEqual(bash("/opt/homebrew/bin/gh api repos/o/r/pulls/7/reviews -X POST"), "deny");
      assert.strictEqual(bash("curl -s https://example.com"), "deny");
      assert.strictEqual(bash("echo api.github.com"), "deny");
    });

    it("denies MCP and web tools", () => {
      for (const toolName of ["github-mcp-server-pull_request_read", "web_fetch", "mcp", "url"]) {
        assert.strictEqual(offline.check({ toolName, input: {} }).action, "deny", toolName);
      }
      assert.strictEqual(offline.check({ toolName: "view", input: { path: "/tmp/x" } }).action, "allow");
    });
  });
});
