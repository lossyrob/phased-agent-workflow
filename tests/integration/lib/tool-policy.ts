import { resolve } from "path";

type Decision =
  | { action: "allow" }
  | { action: "deny"; reason: string }
  | { action: "stub"; result: unknown };

/** Sandbox enforcement for test sessions. */
export class ToolPolicy {
  private readonly allowedRoots: string[];
  private readonly normalizedRoots: string[];

  constructor(private workspaceRoot: string, extraRoots: string[] = []) {
    this.workspaceRoot = resolve(workspaceRoot);
    this.allowedRoots = [...new Set([this.workspaceRoot, ...extraRoots.map((root) => resolve(root))])];
    this.normalizedRoots = this.allowedRoots.map((root) => `${root}/`);
  }

  private isInsideWorkspace(filePath: string): boolean {
    const resolved = resolve(this.workspaceRoot, filePath);
    return this.allowedRoots.some((root, index) => {
      return resolved === root || resolved.startsWith(this.normalizedRoots[index]);
    });
  }

  private parseInput(raw: unknown): Record<string, unknown> {
    if (typeof raw === "string") {
      try { return JSON.parse(raw); } catch { return {}; }
    }
    return (raw as Record<string, unknown>) ?? {};
  }

  private extractRmTargets(cmd: string): string[] {
    const tokens = cmd.split(/\s+/).filter(Boolean);
    const targets: string[] = [];
    let seenRm = false;

    for (const token of tokens) {
      if (!seenRm) {
        if (token === "rm") {
          seenRm = true;
        }
        continue;
      }

      if (["&&", "||", ";", "|"].includes(token)) {
        break;
      }
      if (token === "--" || token.startsWith("-")) {
        continue;
      }

      targets.push(token.replace(/^['"]|['"]$/g, ""));
    }

    return targets;
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
        const targets = this.extractRmTargets(cmd);
        if (targets.length === 0 || targets.some((target) => !this.isInsideWorkspace(target))) {
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
