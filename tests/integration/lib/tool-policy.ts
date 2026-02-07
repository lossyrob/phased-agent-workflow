import { resolve } from "path";

type Decision =
  | { action: "allow" }
  | { action: "deny"; reason: string }
  | { action: "stub"; result: unknown };

/** Sandbox enforcement for test sessions. */
export class ToolPolicy {
  private normalizedRoot: string;

  constructor(private workspaceRoot: string) {
    this.normalizedRoot = resolve(workspaceRoot) + "/";
  }

  private isInsideWorkspace(filePath: string): boolean {
    const resolved = resolve(this.workspaceRoot, filePath);
    return resolved === this.workspaceRoot || resolved.startsWith(this.normalizedRoot);
  }

  private parseInput(raw: unknown): Record<string, unknown> {
    if (typeof raw === "string") {
      try { return JSON.parse(raw); } catch { return {}; }
    }
    return (raw as Record<string, unknown>) ?? {};
  }

  check(call: { toolName: string; input: unknown }): Decision {
    const input = this.parseInput(call.input);

    if (call.toolName === "bash") {
      const cmd = String(input?.command ?? "");

      if (/\bgit\s+push\b/i.test(cmd)) {
        return { action: "deny", reason: "git push disabled in tests" };
      }
      if (/\bgh\s+(pr|issue)\s+create\b/i.test(cmd)) {
        return { action: "deny", reason: "GitHub CLI writes disabled in tests" };
      }
      // Block rm with recursive+force flags in any order (rm -rf, rm -fr, rm -r -f, etc.)
      if (/\brm\b/.test(cmd) && /\s-[a-z]*r[a-z]*\b/.test(cmd) && /\s-[a-z]*f[a-z]*\b/.test(cmd)) {
        if (!cmd.includes(this.workspaceRoot)) {
          return { action: "deny", reason: "rm -rf outside workspace forbidden" };
        }
      }
    }

    // Block file writes outside workspace (resolve to prevent path traversal)
    if (call.toolName === "create" || call.toolName === "edit") {
      const filePath = String(input?.path ?? "");
      if (filePath && !this.isInsideWorkspace(filePath)) {
        return { action: "deny", reason: `File write outside workspace: ${filePath}` };
      }
    }

    return { action: "allow" };
  }
}
