import { describe, it } from "node:test";
import assert from "node:assert";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { REMOVED_SKILLS } from "../../lib/skills.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../../");

describe("PAW agent is a thin wrapper over paw-workflow", () => {
  it("loads paw-workflow and carries no workflow rules of its own", async () => {
    const content = await readFile(resolve(REPO_ROOT, "agents/PAW.agent.md"), "utf-8");
    assert.match(content, /Load the `paw-workflow` skill/);
    for (const term of ["paw-transition", "paw-pr", "Review Policy", "review_strategy", "Stage Boundary", "paw_new_session", "{{#"]) {
      assert.ok(!content.includes(term), `PAW.agent.md should not mention ${term}`);
    }
    assert.ok(content.split("\n").length < 20, "PAW.agent.md should stay a short wrapper");
  });

  it("PAW-Review agent is a thin wrapper over paw-review-workflow", async () => {
    const content = await readFile(resolve(REPO_ROOT, "agents/PAW-Review.agent.md"), "utf-8");
    assert.match(content, /Load the `paw-review-workflow` skill/);
    assert.ok(content.split("\n").length < 12, "PAW-Review.agent.md should stay a short wrapper");
  });

  it("removed v1 skills are gone and no shipped prompt names them", async () => {
    const { readdir } = await import("fs/promises");
    const skills = await readdir(resolve(REPO_ROOT, "skills"));
    const files = [
      resolve(REPO_ROOT, "agents/PAW.agent.md"),
      resolve(REPO_ROOT, "agents/PAW-Review.agent.md"),
      ...skills.map((s) => resolve(REPO_ROOT, "skills", s, "SKILL.md")).filter((p) => existsSync(p)),
    ];
    for (const name of REMOVED_SKILLS) {
      assert.ok(!skills.includes(name), `skills/${name} should be removed`);
      const pattern = new RegExp(`\`${name}\``);
      for (const file of files) {
        assert.ok(!pattern.test(await readFile(file, "utf-8")), `${file} still names ${name}`);
      }
    }
  });

  it("paw-lite and paw-rewind are pointers into paw-workflow", async () => {
    const lite = await readFile(resolve(REPO_ROOT, "skills/paw-lite/SKILL.md"), "utf-8");
    assert.match(lite, /Load the `paw-workflow` skill[^\n]*preset `lite`/);
    const rewind = await readFile(resolve(REPO_ROOT, "skills/paw-rewind/SKILL.md"), "utf-8");
    assert.match(rewind, /Load the `paw-workflow` skill and follow its rewind procedure/);
    assert.ok(!/reset --hard/.test(rewind), "paw-rewind must not reset history (G12)");
  });
});
