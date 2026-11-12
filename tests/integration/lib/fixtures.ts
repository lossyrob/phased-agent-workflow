import { access, chmod, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { simpleGit, type SimpleGit } from "simple-git";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const FIXTURES_DIR = resolve(__dirname, "../fixtures");

export { rewriteGhCommand } from "./shell-match.js";

/** The pull request the PAW Review stub `gh` serves. */
export interface ReviewStubPr {
  repository: string;
  number: number;
  url: string;
  title: string;
  body: string;
  author: string;
  baseRefName: string;
  headRefName: string;
  baseRefOid: string;
  headRefOid: string;
}

export interface ReviewStubState {
  nextId: number;
  reviews: Array<{ id: number; state: string; body?: string; commit_id?: string }>;
  comments: Array<{ id: number; pull_request_review_id: number | null; path?: string; line?: unknown; body?: string }>;
  writes: Array<Record<string, unknown>>;
}

/** Manages an isolated temp git repository for a single test. */
export class TestFixture {
  readonly workspaceDir: string;
  readonly workDir: string;
  private git: SimpleGit;
  private readonly worktreePaths = new Set<string>();

  private constructor(workspaceDir: string, workDir: string) {
    this.workspaceDir = workspaceDir;
    this.workDir = workDir;
    this.git = simpleGit(workDir);
  }

  /** Clone a fixture template into a fresh temp directory. */
  static async clone(templateName: string): Promise<TestFixture> {
    const templateDir = join(FIXTURES_DIR, templateName);
    const workspaceDir = await mkdtemp(join(tmpdir(), "paw-test-"));
    const workDir = join(workspaceDir, "repo");

    await mkdir(workDir, { recursive: true });
    await cp(templateDir, workDir, { recursive: true });

    const fixture = new TestFixture(workspaceDir, workDir);
    await fixture.git.init();
    await fixture.git.addConfig("user.email", "test@paw.dev");
    await fixture.git.addConfig("user.name", "PAW Test");
    await fixture.git.add(".");
    await fixture.git.commit("Initial commit");

    return fixture;
  }

  private gitAt(checkoutPath: string = this.workDir): SimpleGit {
    return checkoutPath === this.workDir ? this.git : simpleGit(checkoutPath);
  }

  /** Seed pre-built workflow artifacts into the work directory. */
  async seedWorkflowState(workId: string, stage: "spec" | "plan" | "planning-review" | "phase1"): Promise<void> {
    const seedDir = join(FIXTURES_DIR, "seeds", stage);
    const targetDir = join(this.workDir, ".paw/work", workId);
    await mkdir(targetDir, { recursive: true });
    await cp(seedDir, targetDir, { recursive: true });
    await this.git.add(".paw/");
    await this.git.commit(`Seed workflow state: ${stage}`);
  }

  /** Get current branch name. */
  async getBranch(checkoutPath: string = this.workDir): Promise<string> {
    return (await this.gitAt(checkoutPath).branch()).current;
  }

  /** Get current HEAD SHA. */
  async getHead(checkoutPath: string = this.workDir): Promise<string> {
    return (await this.gitAt(checkoutPath).raw(["rev-parse", "HEAD"])).trim();
  }

  /** Get porcelain status output for a checkout. */
  async getStatus(checkoutPath: string = this.workDir): Promise<string> {
    return (await this.gitAt(checkoutPath).raw(["status", "--short"])).trim();
  }

  /** Create and checkout a local branch in the selected checkout. */
  async checkoutBranch(branch: string, opts?: { checkoutPath?: string; create?: boolean }): Promise<void> {
    const git = this.gitAt(opts?.checkoutPath);
    if (opts?.create) {
      await git.checkoutLocalBranch(branch);
      return;
    }
    await git.checkout(branch);
  }

  /** Create a sibling git worktree for execution-checkout tests. */
  async addWorktree(workId: string, targetBranch: string): Promise<string> {
    const slug = workId.replace(/[^a-z0-9.-]+/gi, "-").replace(/^-+|-+$/g, "") || "execution";
    const worktreePath = join(this.workspaceDir, `worktree-${slug}`);
    await this.git.raw(["worktree", "add", "-b", targetBranch, worktreePath]);
    this.worktreePaths.add(worktreePath);
    return worktreePath;
  }

  /** Read a file relative to a checkout. */
  async readRelativeFile(checkoutPath: string, relativePath: string): Promise<string> {
    return readFile(join(checkoutPath, relativePath), "utf-8");
  }

  /** Check whether a relative path exists in a checkout. */
  async pathExists(checkoutPath: string, relativePath: string): Promise<boolean> {
    try {
      await access(join(checkoutPath, relativePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Give the fixture a local bare repository as `origin` so a workflow can push
   * without touching the network. Returns the bare repository path.
   */
  async addLocalRemote(): Promise<string> {
    const remotePath = join(this.workspaceDir, "origin.git");
    await simpleGit().raw(["init", "--bare", remotePath]);
    await this.git.addRemote("origin", remotePath);
    const branch = await this.getBranch();
    await this.git.raw(["push", "-u", "origin", branch]);
    return remotePath;
  }

  /**
   * Install a stub `gh` that records its arguments and pretends `gh pr create`
   * succeeded. After a create, `gh pr view` and `gh pr list` report that PR with its
   * base and head; before one, `view` fails and `list` is empty. Returns the stub's
   * path and the call log path.
   *
   * Never put the stub on PATH: the Copilot CLI process inherits PATH and uses the
   * real `gh` for its own sign-in, and shadowing it makes the CLI fall back to the
   * OS keychain and prompt the user. Route the agent's shell commands to the stub
   * with `rewriteGhCommand` and the harness `rewriteCommand` option instead.
   */
  async installGhStub(): Promise<{ stubPath: string; logPath: string }> {
    const binDir = join(this.workspaceDir, "bin");
    const logPath = join(this.workspaceDir, "gh-calls.log");
    await mkdir(binDir, { recursive: true });
    const statePath = join(this.workspaceDir, "gh-pr.json");
    const script = [
      "#!/bin/sh",
      `printf '%s\\n' "$*" >> "${logPath}"`,
      `state="${statePath}"`,
      'url="https://github.com/example/fixture/pull/1"',
      'if [ "$1" = "pr" ] && [ "$2" = "create" ]; then',
      // Remember base and head so `pr view` and `pr list` can report them.
      '  base=main; head=$(git branch --show-current)',
      "  while [ $# -gt 0 ]; do",
      '    case "$1" in',
      '      --base|-B) base="$2"; shift ;;',
      '      --base=*) base="${1#--base=}" ;;',
      '      --head|-H) head="$2"; shift ;;',
      '      --head=*) head="${1#--head=}" ;;',
      "    esac",
      "    shift",
      "  done",
      `  printf '{"number":1,"state":"OPEN","isDraft":false,"url":"%s","baseRefName":"%s","headRefName":"%s"}\\n' "$url" "$base" "$head" > "$state"`,
      '  echo "$url"',
      'elif [ "$1" = "pr" ] && [ "$2" = "view" ]; then',
      '  if [ -f "$state" ]; then cat "$state"; else echo "no pull requests found" >&2; exit 1; fi',
      'elif [ "$1" = "pr" ] && [ "$2" = "list" ]; then',
      '  if [ -f "$state" ]; then printf \'[%s]\\n\' "$(cat "$state")"; else echo "[]"; fi',
      "fi",
      "exit 0",
      "",
    ].join("\n");
    await writeFile(join(binDir, "gh"), script);
    await chmod(join(binDir, "gh"), 0o755);
    return { stubPath: join(binDir, "gh"), logPath };
  }

  /**
   * Install the PAW Review stub `gh` (lib/gh-review-stub.cjs) for one pull request. It
   * records every call, answers reads (`pr view`, `pr diff`, `api` GETs, GraphQL queries)
   * from `pr` and git, and records writes (pending reviews, review comments, submissions)
   * in a state file instead of sending them anywhere. Route commands to it with
   * `rewriteGhCommand`; never put it on PATH (see installGhStub).
   */
  async installReviewGhStub(pr: ReviewStubPr): Promise<{ stubPath: string; logPath: string }> {
    const binDir = join(this.workspaceDir, "bin");
    await mkdir(binDir, { recursive: true });
    await writeFile(join(this.workspaceDir, "gh-review-pr.json"), JSON.stringify(pr, null, 2));
    const script = [
      "#!/bin/sh",
      `PAW_GH_STUB_DIR="${this.workspaceDir}" exec "${process.execPath}" "${join(__dirname, "gh-review-stub.cjs")}" "$@"`,
      "",
    ].join("\n");
    await writeFile(join(binDir, "gh"), script);
    await chmod(join(binDir, "gh"), 0o755);
    return { stubPath: join(binDir, "gh"), logPath: join(this.workspaceDir, "gh-calls.log") };
  }

  /** Writes the PAW Review stub `gh` recorded: reviews, review comments, and raw write calls. */
  async reviewGhState(): Promise<ReviewStubState> {
    try {
      return JSON.parse(await readFile(join(this.workspaceDir, "gh-review-state.json"), "utf-8")) as ReviewStubState;
    } catch {
      return { nextId: 0, reviews: [], comments: [], writes: [] };
    }
  }

  /** Read the stub gh call log, one invocation per entry. */
  async ghCalls(): Promise<string[]> {
    try {
      const raw = await readFile(join(this.workspaceDir, "gh-calls.log"), "utf-8");
      return raw.split("\n").filter((line) => line && !/(^| )--help\b/.test(line));
    } catch {
      return [];
    }
  }

  /** Clean up the temp directory. */
  async cleanup(): Promise<void> {
    for (const worktreePath of this.worktreePaths) {
      try {
        await this.git.raw(["worktree", "remove", "--force", worktreePath]);
      } catch {
        // Best effort; removing the workspace dir below cleans any leftovers.
      }
    }
    try {
      await this.git.raw(["worktree", "prune"]);
    } catch {
      // Best effort; rm below is the real cleanup.
    }
    await rm(this.workspaceDir, { recursive: true, force: true });
  }
}
