import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile, readdir } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

const REPO_ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const SKILL_ROOT = resolve(REPO_ROOT, "skills", "paw-review-compare");
const [skill, dispatch, guide, data] = await Promise.all([
  readFile(resolve(SKILL_ROOT, "SKILL.md"), "utf-8"),
  readFile(resolve(SKILL_ROOT, "references", "dispatch.md"), "utf-8"),
  readFile(resolve(REPO_ROOT, "docs", "guide", "review-comparison.md"), "utf-8"),
  readFile(resolve(SKILL_ROOT, "references", "profiles.json"), "utf-8"),
]);

interface Settings {
  model: string;
  reasoning_effort: string;
  context_tier?: string;
}

interface Profile {
  id: string;
  method: "sot" | "system";
  models: Settings[];
  interaction_mode?: string;
  interactive?: boolean;
  perspectives?: string[];
  perspective_cap?: number;
}

interface Assignments {
  roles: string[];
  slots: number[][];
}

const catalog: {
  non_specialist: Settings;
  profiles: Profile[];
  assignments: Record<Profile["method"], Assignments>;
} = JSON.parse(data);

function assignedSettings(profile: Profile, ordinal: number): Map<string, Settings> {
  const { roles, slots } = catalog.assignments[profile.method];
  const row = slots[(ordinal - 1) % slots.length];
  return new Map(roles.map((role, index) => [role, profile.models[row[index]]]));
}

describe("review comparison profiles (deterministic data, no live dispatch)", () => {
  it("defines the four authorized model/effort pools and non-specialist settings", () => {
    assert.deepStrictEqual(catalog.non_specialist, {
      model: "gpt-6-astra", reasoning_effort: "high", context_tier: "long_context",
    });
    assert.deepStrictEqual(catalog.profiles.map(p => [p.id, p.method, p.models]), [
      ["sot-astra-opus", "sot", [
        { model: "gpt-6-astra", reasoning_effort: "medium" },
        { model: "claude-opus-5", reasoning_effort: "medium" },
      ]],
      ["sot-sonnet-terra", "sot", [
        { model: "claude-sonnet-5", reasoning_effort: "high" },
        { model: "gpt-5.6-terra", reasoning_effort: "high" },
      ]],
      ["system-astra-opus", "system", [
        { model: "gpt-6-astra", reasoning_effort: "medium" },
        { model: "claude-opus-5", reasoning_effort: "medium" },
      ]],
      ["system-sonnet-terra", "system", [
        { model: "claude-sonnet-5", reasoning_effort: "high" },
        { model: "gpt-5.6-terra", reasoning_effort: "high" },
      ]],
    ]);
  });

  it("pins exactly the current nine built-in SoT identities and four system approaches", async () => {
    const builtIns = (await readdir(resolve(REPO_ROOT, "skills", "paw-sot", "references", "specialists")))
      .filter(name => name.endsWith(".md") && !name.startsWith("_"))
      .map(name => name.slice(0, -3)).sort();
    assert.strictEqual(builtIns.length, 9);
    assert.deepStrictEqual(catalog.assignments.sot.roles, builtIns);
    const system = await readFile(resolve(REPO_ROOT, "skills", "paw-system-review", "SKILL.md"), "utf-8");
    const approaches = [...system.matchAll(/\| `(\w+)` \| `REVIEW-[A-Z]+\.md` \|/g)].map(match => match[1]);
    assert.deepStrictEqual(catalog.assignments.system.roles, approaches);
    assert.strictEqual(approaches.length, 4);
  });

  it("has complete binary assignment rows without added or duplicated roles", () => {
    assert.strictEqual(catalog.assignments.sot.slots.length, 2);
    assert.strictEqual(catalog.assignments.system.slots.length, 4);
    for (const { roles, slots } of Object.values(catalog.assignments)) {
      assert.strictEqual(new Set(roles).size, roles.length);
      for (const row of slots) {
        assert.strictEqual(row.length, roles.length);
        assert.ok(row.every(index => index === 0 || index === 1));
      }
    }
    assert.match(skill, /positive integer/);
    assert.match(skill, /Reject missing, fractional, or nonpositive ordinals/);
    assert.ok(skill.includes("slots[(n - 1) % slots.length]"));
    assert.match(skill, /each cell indexes the profile's two-element `models` array/);
    assert.match(skill, /Do not reorder roles or change the map within a case/);
  });

  it("alternates 5/4 SoT specialists and 10/8 perspective instances across repeated cases", () => {
    for (const profile of catalog.profiles.filter(p => p.method === "sot")) {
      assert.strictEqual(profile.interaction_mode, "debate");
      assert.strictEqual(profile.interactive, false);
      const perspectives = profile.id === "sot-astra-opus" ? [] : ["premortem", "retrospective"];
      assert.deepStrictEqual(profile.perspectives, perspectives);
      assert.strictEqual(profile.perspective_cap, perspectives.length ? 2 : undefined);
      const instancesPerRole = Math.max(1, perspectives.length);
      for (let ordinal = 1; ordinal <= 8; ordinal++) {
        const assignments = assignedSettings(profile, ordinal);
        const counts = profile.models.map(settings =>
          [...assignments.values()].filter(actual => actual.model === settings.model).length,
        );
        assert.deepStrictEqual(counts, ordinal % 2 ? [5, 4] : [4, 5]);
        const expectedInstances = profile.id === "sot-astra-opus"
          ? (ordinal % 2 ? [5, 4] : [4, 5])
          : (ordinal % 2 ? [10, 8] : [8, 10]);
        assert.deepStrictEqual(counts.map(count => count * instancesPerRole), expectedInstances);
        assert.deepStrictEqual(assignments, assignedSettings(profile, ordinal + 2));
      }
    }
    assert.match(dispatch, /fixed across every debate round, continuation, and both perspective instances/);
    assert.match(skill, /18 instances split 10\/8.*8\/10/);
    assert.match(skill, /never claim 9\/9 or double the roster/);
  });

  it("rotates every system role through both models with a stable 2/2 case assignment", () => {
    const expectedFirstModelRoles = [
      ["forward", "counterexample"], ["counterexample", "relational"],
      ["relational", "simplicity"], ["forward", "simplicity"],
    ];
    for (const profile of catalog.profiles.filter(p => p.method === "system")) {
      assert.strictEqual(profile.perspectives, undefined);
      for (let ordinal = 1; ordinal <= 8; ordinal++) {
        const assignment = assignedSettings(profile, ordinal);
        assert.deepStrictEqual(
          [...assignment].filter(([, settings]) => settings.model === profile.models[0].model).map(([role]) => role),
          expectedFirstModelRoles[(ordinal - 1) % 4],
        );
        for (const settings of profile.models) {
          assert.strictEqual([...assignment.values()].filter(value => value.model === settings.model).length, 2);
        }
        assert.deepStrictEqual(assignment, assignedSettings(profile, ordinal + 4));
      }
      for (const role of catalog.assignments.system.roles) {
        const settings = [1, 2, 3, 4].map(ordinal => assignedSettings(profile, ordinal).get(role));
        for (const model of profile.models) {
          assert.strictEqual(settings.filter(value => value?.model === model.model).length, 2);
        }
      }
    }
    assert.match(skill, /Preserve the simplicity reviewer's model\/effort.*context reconstitution/);
    assert.match(dispatch, /no peer remedies trigger.*`not-needed`.*without waking\/reconstituting/);
  });
});

describe("review comparison static protocol contracts", () => {
  it("is separately discoverable with only reference data, not a new runtime", async () => {
    assert.match(skill, /^name: paw-review-compare$/m);
    assert.match(skill, /Use only when explicitly asked to run paw-review-compare/);
    assert.deepStrictEqual((await readdir(SKILL_ROOT)).sort(), ["SKILL.md", "references"]);
    assert.deepStrictEqual((await readdir(resolve(SKILL_ROOT, "references"))).sort(), ["dispatch.md", "profiles.json"]);
    for (const file of ["dispatch.md", "profiles.json"]) {
      assert.ok(skill.includes(`references/${file}`));
    }
    const manifest = JSON.parse(await readFile(resolve(REPO_ROOT, "package.json"), "utf-8"));
    assert.strictEqual(manifest.contributes.chatSkills.filter(
      (entry: { path: string }) => entry.path === "./vscode-assets/skills/paw-review-compare/SKILL.md",
    ).length, 1);
    const plugin = JSON.parse(await readFile(resolve(REPO_ROOT, "plugin.json"), "utf-8"));
    assert.strictEqual(plugin.skills, "skills/");
    assert.match(guide, /tests.*without launching reviewers/);
  });

  it("routes full implementation reference analysis separately from planning artifact review", () => {
    assert.match(dispatch, /fully qualified `paw-workflow:PAW-Review`/);
    assert.match(dispatch, /do not substitute a generic agent or run only SoT/);
    assert.match(dispatch, /understanding -> baseline research -> resumed understanding\/derived specification -> SoT evaluation -> initial feedback -> critic -> critique response\/finalization/);
    assert.match(dispatch, /`Review Mode: society-of-thought`, never an outer profile ID/);
    assert.match(dispatch, /final report is `ReviewComments.md`/);
    assert.match(dispatch, /do not substitute the inner synthesis/);
    assert.match(dispatch, /existing `paw-sot` engine with `type: artifacts`, actual supplied proposal\/document coordinates/);
    assert.match(dispatch, /Do not launch PAW-Review, create a PR\/diff, invent `Spec.md` or `ImplementationPlan.md`/);
    assert.match(dispatch, /For either target.*`paw-system-review`/);
    assert.match(skill, /caller chooses which planning reviews are enabled/);
    assert.match(skill, /not valid inner `Review Mode` values/);
  });

  it("translates only existing PAW controls while requiring actual native settings at every launch", async () => {
    const understanding = await readFile(resolve(REPO_ROOT, "skills", "paw-review-understanding", "SKILL.md"), "utf-8");
    const sot = await readFile(resolve(REPO_ROOT, "skills", "paw-sot", "SKILL.md"), "utf-8");
    for (const [field, context] of [
      ["Review Specialists", "specialists"],
      ["Review Interaction Mode", "interaction_mode"],
      ["Review Interactive", "interactive"],
      ["Review Specialist Models", "specialist_models"],
      ["Review Perspectives", "perspectives"],
      ["Review Perspective Cap", "perspective_cap"],
    ]) {
      assert.ok(understanding.includes(`**${field}**`), `Nonexistent PAW field: ${field}`);
      assert.ok(sot.includes(`\`${context}\``), `Nonexistent SoT field: ${context}`);
      assert.ok(dispatch.includes(`\`${field}\` | \`${context}\``));
    }
    assert.match(dispatch, /actual launch arguments/);
    assert.match(dispatch, /Do not assume nested inheritance/);
    assert.match(dispatch, /Never invent fields.*Review Specialist Reasoning Effort/);
    assert.match(dispatch, /Logging a request is not proof of dispatch/);
    assert.match(dispatch, /dispatch is not proof of resolved runtime identity or capacity/);
    assert.match(dispatch, /required control is unavailable.*before dispatch rather than silently drop it/);
    assert.match(skill, /every native launch.*nested stages and debate\/continuation calls/);
    assert.match(skill, /`long_context` is not proof of an exact one-million-token capacity/);
  });

  it("retains built-in SoT provenance and mechanics instead of silently changing the roster", () => {
    assert.match(dispatch, /Explicit names alone do not bypass project\/user persona precedence/);
    assert.match(dispatch, /frontmatter `model` can override model pins/);
    assert.match(dispatch, /including shared rules and profile 2's two perspective sources/);
    assert.match(dispatch, /Report unintended customization\/source overrides or roster drift before starting/);
    assert.match(dispatch, /cannot be selected without modifying the installation.*blocked reference arm/);
    assert.match(dispatch, /`none` must not become `auto` or `baseline`/);
    assert.match(dispatch, /initial sweep uses nine unoverlaid instances for profile 1 and nine per perspective for profile 2/);
    assert.match(dispatch, /Preserve the existing SoT debate, synthesis, adaptive termination, continuation budgets, and tradeoff mechanics/);
    assert.match(dispatch, /Do not add arbitrary round limits, retry budgets, moderator invocations, or replacement reviewers/);
  });

  it("preserves independent raw targets, workspaces, and artifacts across four arms", () => {
    assert.match(skill, /four separate output areas, `arms\/A\/` through `arms\/D\/`/);
    assert.match(skill, /Never overwrite old cases/);
    assert.match(skill, /Do not provide sibling paths or `Case.md` as arm input/);
    assert.match(skill, /Each arm builds its \*\*own\*\* evidence map, derived specification, research questions/);
    assert.match(skill, /Never pass those derived artifacts or another run's findings between arms/);
    assert.match(skill, /four isolated lead contexts/);
    assert.match(skill, /Output directories alone do not isolate checkout state/);
    assert.match(dispatch, /Never switch a shared checkout/);
    assert.match(dispatch, /silently recompute a different merge-base\/diff scope/);
    assert.match(skill, /verify target pins.*roster\/assignment conformance/);
  });

  it("enforces artifact-only reference output even on GitHub and preserves failed arms honestly", () => {
    assert.match(dispatch, /`Requested Output Action: artifact-only` even for GitHub/);
    assert.match(dispatch, /do not invoke `paw-review-github`/);
    assert.match(dispatch, /Keep actual platform identity/);
    assert.match(dispatch, /cannot honor artifact-only output, stop that arm before analysis/);
    assert.match(skill, /invocation that failed to start provides no review coverage/);
    assert.match(skill, /explicitly coordinator-attributed `Run.md`, never a fabricated method report/);
    assert.match(skill, /Do not silently rerun a costly arm/);
    assert.match(skill, /Keep unavailable evidence distinct from proven nonconformance/);
  });

  it("gates independent content-first assessment on terminal reports without feedback contamination", () => {
    assert.match(skill, /all four arms have finalized reports or recorded terminal incompleteness/);
    assert.match(skill, /separate assisting assessor using `non_specialist` settings/);
    assert.match(skill, /No results or judgments may flow back into an arm/);
    assert.match(skill, /withhold `Case.md`, profile labels, model names, and timing metadata until/);
    assert.match(skill, /Preserve raw artifacts and note recognizable method\/path\/style cues/);
    assert.match(skill, /Do not claim a blind experiment/);
    assert.match(skill, /bounded permitted verification/);
    assert.match(skill, /Do not conduct an additional whole-codebase review/);
    assert.match(skill, /assessor-only discoveries separately; never retroactively credit/);
    assert.match(skill, /absent finding is not proof that an arm analyzed and cleared/);
  });

  it("compares evidence and burden without fabricated metrics or automatic publication", () => {
    for (const phrase of [
      "consequential system-level catches", "unsupported claims/false positives",
      "missed or duplicated findings", "remedy proportionality and burden",
      "actionability", "preserved uncertainty", "documented coverage",
    ]) {
      assert.ok(skill.includes(phrase), `Missing comparison criterion: ${phrase}`);
    }
    assert.match(skill, /More comments or greater confidence is not automatically better/);
    assert.match(skill, /Separate observed elapsed time from actual review work/);
    assert.match(skill, /Do not invent tokens, dollar savings, accuracy, or universal performance/);
    assert.match(skill, /links to all four original final reports/);
    assert.match(skill, /recommendation that may be inconclusive/);
    assert.match(skill, /Selecting a report does not dispose of consequential findings from another arm/);
    assert.match(skill, /Method preference is not current-head acceptance/);
    assert.match(skill, /do not relabel system-review output as a PAW Review report/);
    assert.match(skill, /this comparison does not satisfy those gates or authorize posting/);
  });
});
