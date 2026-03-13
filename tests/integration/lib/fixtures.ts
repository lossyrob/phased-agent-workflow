import { access, cp, mkdir, mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { simpleGit, type SimpleGit } from "simple-git";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const FIXTURES_DIR = resolve(__dirname, "../fixtures");

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
