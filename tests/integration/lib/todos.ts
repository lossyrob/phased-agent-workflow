/**
 * Reads the host session's TODO graph from the Copilot CLI session database.
 *
 * The graph is the v2 control plane, so tests assert on it directly instead of
 * parsing the agent's own account of it.
 */
import { existsSync } from "fs";
import { createRequire } from "module";
import { homedir } from "os";
import { join } from "path";

export interface TodoNode {
  id: string;
  title: string;
  description: string;
  status: string;
  dependsOn: string[];
}

export class TodoGraph {
  constructor(readonly nodes: TodoNode[]) {}

  /** First node whose id, title or description matches. */
  find(pattern: RegExp): TodoNode | undefined {
    return this.nodes.find((n) => pattern.test(n.id) || pattern.test(n.title) || pattern.test(n.description));
  }

  filter(pattern: RegExp): TodoNode[] {
    return this.nodes.filter((n) => pattern.test(n.id) || pattern.test(n.title) || pattern.test(n.description));
  }

  /** True when `node` cannot start until `upstream` is done, directly or transitively. */
  isBlockedBy(node: TodoNode, upstream: TodoNode): boolean {
    const seen = new Set<string>();
    const stack = [...node.dependsOn];
    while (stack.length > 0) {
      const id = stack.pop() as string;
      if (id === upstream.id) {
        return true;
      }
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      const next = this.nodes.find((n) => n.id === id);
      if (next) {
        stack.push(...next.dependsOn);
      }
    }
    return false;
  }

  open(): TodoNode[] {
    return this.nodes.filter((n) => n.status !== "done");
  }

  describe(): string {
    return this.nodes
      .map((n) => `${n.status.padEnd(11)} ${n.id}${n.dependsOn.length ? ` <- ${n.dependsOn.join(", ")}` : ""}`)
      .join("\n");
  }
}

/** Minimal shape of node:sqlite (Node 22+); the pinned @types/node predates it. */
type Row = Record<string, unknown>;
interface SqliteModule {
  DatabaseSync: new (path: string, options?: { readOnly?: boolean }) => {
    prepare(sql: string): { all(): Row[] };
    close(): void;
  };
}

function sessionDbPath(sessionId: string): string {
  const root = process.env.COPILOT_HOME ?? join(homedir(), ".copilot");
  return join(root, "session-state", sessionId, "session.db");
}

/** Load the TODO graph for a session. Returns an empty graph if the session wrote no todos. */
export function readTodoGraph(sessionId: string): TodoGraph {
  const dbPath = sessionDbPath(sessionId);
  if (!existsSync(dbPath)) {
    return new TodoGraph([]);
  }

  // node:sqlite is loaded lazily so suites that never read todos do not need it.
  const require = createRequire(import.meta.url);
  const { DatabaseSync } = require("node:sqlite") as SqliteModule;
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const tables = new Set(
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => String(r.name)),
    );
    if (!tables.has("todos")) {
      return new TodoGraph([]);
    }
    const deps = tables.has("todo_deps")
      ? db.prepare("SELECT todo_id, depends_on FROM todo_deps").all()
      : [];
    const nodes = db.prepare("SELECT id, title, description, status FROM todos").all().map((r) => ({
      id: String(r.id),
      title: String(r.title ?? ""),
      description: String(r.description ?? ""),
      status: String(r.status ?? ""),
      dependsOn: deps.filter((d) => String(d.todo_id) === String(r.id)).map((d) => String(d.depends_on)),
    }));
    return new TodoGraph(nodes);
  } finally {
    db.close();
  }
}
