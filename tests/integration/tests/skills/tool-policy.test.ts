/**
 * Tests for tool policy — sandbox enforcement.
 * These tests don't require SDK auth and run offline.
 */
import { describe, it } from "node:test";
import assert from "node:assert";
import { ToolPolicy } from "../../lib/tool-policy.js";
import { BROAD_STAGING, REWRITE_COMMAND, evasiveGh, rewriteGhCommand } from "../../lib/shell-match.js";

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

    it("routes quoted gh to the stub and denies spellings the rewrite cannot route", () => {
      const post = "api repos/paw-fixture/review-target/pulls/7/reviews -X POST -f body=fixture";
      for (const word of ["gh", '"gh"', "'gh'"]) {
        const command = `cd repo && ${word} ${post}`;
        assert.strictEqual(bash(command), "allow", command);
        assert.strictEqual(rewriteGhCommand(command, stub), `cd repo && "${stub}" ${post}`, command);
      }
      assert.strictEqual(rewriteGhCommand('echo "$("gh" pr view 7)"; gh', stub), `echo "$("${stub}" pr view 7)"; "${stub}"`);
      for (const word of ["\\gh", 'g"h"', "'g'h", "g\\h"]) {
        const command = `${word} ${post}`;
        assert.deepStrictEqual(evasiveGh(command), [word], command);
        assert.strictEqual(bash(command), "deny", command);
        assert.strictEqual(policy.check({ toolName: "bash", input: { command } }).action, "deny", command);
      }
      assert.deepStrictEqual(evasiveGh("gh pr view 7 && git log --oneline | grep high"), []);
    });

    it("denies MCP and web tools", () => {
      for (const toolName of ["github-mcp-server-pull_request_read", "web_fetch", "mcp", "url"]) {
        assert.strictEqual(offline.check({ toolName, input: {} }).action, "deny", toolName);
      }
      assert.strictEqual(offline.check({ toolName: "view", input: { path: "/tmp/x" } }).action, "allow");
    });
  });

  it("denies quoted gh pr create and git push behind global options", () => {
    for (const command of ['"gh" pr create --fill', "'gh' issue create -t x", 'git -C "fixture worktree" push origin main', "git --no-pager -c a.b=c push"]) {
      assert.strictEqual(policy.check({ toolName: "bash", input: { command } }).action, "deny", command);
    }
  });
});

describe("shell matchers", () => {
  it("G12: history rewrites are recognized behind git global options", () => {
    for (const command of [
      "git commit --amend --no-edit",
      'git -C "fixture worktree" commit --amend --no-edit',
      'git -C "fixture worktree" push --force',
      "git -C /tmp/wt -c user.name='A B' rebase main",
      "git --git-dir=/tmp/wt/.git reset --hard HEAD~1",
      "git --no-pager -C wt update-ref -d refs/none",
      "cd wt && git -C . push -f origin x",
    ]) {
      assert.ok(REWRITE_COMMAND.test(command), command);
    }
    for (const command of ['git -C "fixture worktree" commit -m "fix: amend docs"', "git -C wt push origin feature", "git -C wt reset --soft HEAD", "git log --grep rebase"]) {
      assert.ok(!REWRITE_COMMAND.test(command), command);
    }
  });

  it("G1: broad staging is recognized behind git global options", () => {
    for (const command of ["git add -A", 'git -C "fixture worktree" add .', "git -C wt add --all", "git -C wt commit -a -m x"]) {
      assert.ok(BROAD_STAGING.test(command), command);
    }
    for (const command of ["git -C wt add src/a.ts .paw/work/x/Plan.md", 'git -C wt commit -m "x"']) {
      assert.ok(!BROAD_STAGING.test(command), command);
    }
  });
});
