import { realpathSync } from "fs";
import { resolve } from "path";

/** The path with symlinks resolved (macOS: /var → /private/var), or the path itself if it does not exist. */
function real(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

type Decision =
  | { action: "allow" }
  | { action: "deny"; reason: string }
  | { action: "stub"; result: unknown };

/** Sandbox enforcement for test sessions. */
export class ToolPolicy {
  private readonly allowedRoots: string[];
  private readonly normalizedRoots: string[];

  /**
   * @param options.allowRemoteWrites Permit `git push` and `gh pr create`. Only for
   *   fixtures whose `origin` is a local bare repository and whose `gh` is a stub
   *   (see TestFixture.addLocalRemote and installGhStub).
   */
  constructor(
    private workspaceRoot: string,
    extraRoots: string[] = [],
    private readonly options: {
      allowRemoteWrites?: boolean;
      /**
       * Keep the session off the network: deny MCP and web tools, `curl`/`wget`, and any `gh`
       * binary other than this stub. For scenarios whose GitHub is a stub (PAW Review).
       */
      offlineWithGhStub?: string;
    } = {},
  ) {
    this.workspaceRoot = resolve(workspaceRoot);
    const roots = [this.workspaceRoot, ...extraRoots.map((root) => resolve(root))];
    // A root is allowed under both its given and its symlink-resolved spelling.
    this.allowedRoots = [...new Set([...roots, ...roots.map(real)])];
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

    const stub = this.options.offlineWithGhStub;
    if (stub && (/^(github|mcp|web_fetch|web_search|url)\b/i.test(call.toolName) || /mcp-server/i.test(call.toolName))) {
      return { action: "deny", reason: "Network and MCP tools are disabled in this test; use the gh CLI" };
    }

    if (call.toolName === "bash") {
      const cmd = String(input?.command ?? "");

      if (stub) {
        if (/\b(curl|wget)\b|api\.github\.com/.test(cmd)) {
          return { action: "deny", reason: "Network access is disabled in this test" };
        }
        const ghPaths = [...cmd.matchAll(/([^\s"'`;|&()]*\/gh)(?=["'\s;|&)]|$)/g)].map((m) => m[1]);
        if (ghPaths.some((p) => p !== stub)) {
          return { action: "deny", reason: "Only the gh on the command line may be used" };
        }
      }

      if (!this.options.allowRemoteWrites && /\bgit\s+push\b/i.test(cmd)) {
        return { action: "deny", reason: "git push disabled in tests" };
      }
      if (!this.options.allowRemoteWrites && /\bgh\s+(pr|issue)\s+create\b/i.test(cmd)) {
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
