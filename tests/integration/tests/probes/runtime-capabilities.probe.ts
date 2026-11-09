/**
 * Runtime capability probe for PAW v2 (docs/specification/v2/runtime-capabilities.md).
 *
 * Not an assertion suite: it exercises the runtime and prints what it observed, so the
 * capability matrix can be filled in from evidence. Run with `npm run probe:runtime`.
 *
 * Checks:
 *  1. A skill in a skill directory is loaded by a plain host agent (no PAW agent).
 *  2. The host can delegate to a subagent, and the harness can observe it.
 *  3. The host can send a follow-up to the same subagent after it has returned,
 *     and the subagent still has its earlier context. The subagent is started in
 *     background mode: a `mode: "sync"` task returns no agent id, so it cannot be
 *     followed up (observed 2026-11-09, Copilot CLI 1.0.108).
 *  4. The TODO store supports dependencies, and the harness can observe the calls.
 *  5. A host instruction reaches files written by a subagent.
 *  6. The TODO graph survives a forced context compaction.
 */
import { mkdir, mkdtemp, readFile, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { createTestContext, destroyTestContext } from "../../lib/harness.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";

const CODEWORD = "kiwi-4271";
const SKILL_MARKER = "marmalade-probe";
const HOST_RULE = "# host-rule-7";

async function readOrNull(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const skillsRoot = await mkdtemp(join(tmpdir(), "paw-probe-skills-"));
  const skillDir = join(skillsRoot, "probe-workflow");
  await mkdir(join(skillDir, "references"), { recursive: true });
  await writeFile(
    join(skillDir, "SKILL.md"),
    [
      "---",
      "name: probe-workflow",
      "description: Probe skill for runtime capability checks. Load when asked to load the probe-workflow skill.",
      "---",
      "",
      "# Probe Workflow",
      "",
      `The marker word is \`${SKILL_MARKER}\`.`,
      "The reference word is in `references/brief.md` next to this file.",
    ].join("\n"),
  );
  await writeFile(join(skillDir, "references", "brief.md"), "The reference word is `quince-ref`.\n");

  const ctx = await createTestContext({
    fixtureName: "minimal-ts",
    skillOrAgent: "runtime-probe",
    systemPrompt: `Project rule: every new file created in this repository, by you or by any subagent you start, must begin with the line \`${HOST_RULE}\`.`,
    answerer: new RuleBasedAnswerer([(req) => req.choices?.[0] ?? "yes"], false),
    skillDirectories: [skillsRoot],
  });

  const replies: Record<string, string> = {};
  let compacted = false;
  const ask = async (key: string, prompt: string, timeout = 240_000): Promise<void> => {
    const marker = ctx.events.events.length;
    try {
      const res = await ctx.session.sendAndWait({ prompt }, timeout);
      replies[key] = String(res?.data?.content ?? "");
    } catch (err) {
      replies[key] = `ERROR: ${err instanceof Error ? err.message : String(err)}`;
    }
    const tools = ctx.events.events
      .slice(marker)
      .filter((e) => e.type === "tool.execution_start")
      .map((e) => ({
        tool: e.data.toolName,
        fromSubagent: !!e.data.parentToolCallId,
        args: JSON.stringify(e.data.arguments ?? {}).slice(0, 600),
      }));
    console.log(`\n=== ${key} ===`);
    console.log("reply:", replies[key].slice(0, 800));
    console.log("tools:", JSON.stringify(tools, null, 1));
  };

  try {
    await ask(
      "1-skill",
      "Load the probe-workflow skill. Reply with its marker word and the reference word from its references file.",
    );

    await ask(
      "2-delegate",
      [
        "Delegate this to exactly one general-purpose subagent. Do not do the work yourself.",
        "Start it in background mode so that you receive an agent id, then wait until it has finished and read its result.",
        `Tell the subagent: (a) remember the codeword ${CODEWORD} but never write it to any file;`,
        "(b) create the file notes/plan.md containing one content line: alpha.",
        "When it returns, reply with the subagent's identifier if you have one, and list the exact tool you used to start it.",
      ].join("\n"),
    );

    await ask(
      "3-follow-up",
      [
        "Send a follow-up message to the SAME subagent you started before. Do not start a new subagent.",
        "Do not repeat the codeword in your message.",
        "Ask it to: (a) append a line `beta` to notes/plan.md; (b) reply with the codeword it was told to remember.",
        "Reply with: the codeword it returned, the exact tool you used for the follow-up, and whether a new subagent was started.",
        "If your tools do not allow a follow-up to a finished subagent, say so plainly and do nothing else.",
      ].join("\n"),
    );

    await ask(
      "4-todos",
      [
        "Using your built-in todo tracking, create three todos: `plan`, `implement` (depends on `plan`), `final-pr` (depends on `implement`).",
        "Then query which todos are ready to start, and reply with the exact tool calls or SQL you used and the result.",
      ].join("\n"),
    );

    // 5. Force a compaction, then check the TODO graph is still there and still usable.
    try {
      const result = await ctx.session.rpc.compaction.compact();
      compacted = true;
      console.log("\n=== compaction ===\n", JSON.stringify(result));
    } catch (err) {
      console.log("\n=== compaction ===\nERROR:", err instanceof Error ? err.message : String(err));
    }
    await ask(
      "5-after-compaction",
      "Do not create or change any todos. List the todos that currently exist with their status and dependencies, and say which is ready to start.",
    );
  } finally {
    const plan = await readOrNull(join(ctx.fixture.workDir, "notes/plan.md"));
    console.log("\n=== observations ===");
    console.log(
      JSON.stringify(
        {
          skillLoadedViaRuntime: ctx.events.skillsInvoked(),
          skillMarkerInReply: replies["1-skill"]?.includes(SKILL_MARKER) ?? false,
          skillReferenceReadable: replies["1-skill"]?.includes("quince-ref") ?? false,
          subagentsStarted: ctx.events.subagentsStarted(),
          followUpReturnedCodeword: replies["3-follow-up"]?.includes(CODEWORD) ?? false,
          codewordLeakedInFollowUpArgs: ctx.events
            .hostToolStarts()
            .filter((t) => /write_agent|send|message/i.test(t.toolName))
            .some((t) => JSON.stringify(t.arguments).includes(CODEWORD)),
          compactionForced: compacted,
          todosListedAfterCompactionStep: ["plan", "implement", "final-pr"].every((id) =>
            (replies["5-after-compaction"] ?? "").includes(id),
          ),
          planFile: plan,
          hostRuleInSubagentFile: plan?.startsWith(HOST_RULE) ?? false,
          hookSawTools: [...new Set(ctx.toolLog.calls.map((c) => c.name))],
          copilotVersion: ctx.events.ofType("session.start")[0]?.data.copilotVersion ?? null,
          summary: ctx.events.summary(),
        },
        null,
        2,
      ),
    );
    await destroyTestContext(ctx);
  }
}

// Exit explicitly: background-agent runs can leave the CLI subprocess holding the event loop.
main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
