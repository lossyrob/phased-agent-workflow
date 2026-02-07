type Decision =
  | { action: "allow" }
  | { action: "deny"; reason: string }
  | { action: "stub"; result: unknown };

/** Sandbox enforcement for test sessions. */
export class ToolPolicy {
  constructor(private workspaceRoot: string) {}

  check(call: { toolName: string; input: unknown }): Decision {
    const input = call.input as Record<string, unknown>;

    if (call.toolName === "bash") {
      const cmd = String(input?.command ?? "");

      if (/\bgit\s+push\b/i.test(cmd)) {
        return { action: "deny", reason: "git push disabled in tests" };
      }
      if (/\bgh\s+(pr|issue)\s+create\b/i.test(cmd)) {
        return { action: "deny", reason: "GitHub CLI writes disabled in tests" };
      }
      if (/\brm\s+-rf\b/.test(cmd) && !cmd.includes(this.workspaceRoot)) {
        return { action: "deny", reason: "rm -rf outside workspace forbidden" };
      }
    }

    // Block file writes outside workspace
    if (call.toolName === "create" || call.toolName === "edit") {
      const path = String(input?.path ?? "");
      if (path && !path.startsWith(this.workspaceRoot)) {
        return { action: "deny", reason: `File write outside workspace: ${path}` };
      }
    }

    return { action: "allow" };
  }
}
