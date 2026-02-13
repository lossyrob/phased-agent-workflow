import { mkdtemp, cp, rm, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { simpleGit, type SimpleGit } from "simple-git";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const FIXTURES_DIR = resolve(__dirname, "../fixtures");

/** Manages an isolated temp git repository for a single test. */
export class TestFixture {
  readonly workDir: string;
  private git: SimpleGit;

  private constructor(workDir: string) {
    this.workDir = workDir;
    this.git = simpleGit(workDir);
  }

  /** Clone a fixture template into a fresh temp directory. */
  static async clone(templateName: string): Promise<TestFixture> {
    const templateDir = join(FIXTURES_DIR, templateName);
    const workDir = await mkdtemp(join(tmpdir(), "paw-test-"));

    await cp(templateDir, workDir, { recursive: true });

    const fixture = new TestFixture(workDir);
    await fixture.git.init();
    await fixture.git.addConfig("user.email", "test@paw.dev");
    await fixture.git.addConfig("user.name", "PAW Test");
    await fixture.git.add(".");
    await fixture.git.commit("Initial commit");

    return fixture;
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
  async getBranch(): Promise<string> {
    return (await this.git.branch()).current;
  }

  /** Clean up the temp directory. */
  async cleanup(): Promise<void> {
    await rm(this.workDir, { recursive: true, force: true });
  }
}
