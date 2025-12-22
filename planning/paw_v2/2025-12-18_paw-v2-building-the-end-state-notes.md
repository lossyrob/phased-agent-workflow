Reference links:
- planning/paw_v2/2025-12-18_spike-task-skills.md - voice notes that describe a lot of the system I want, generated issue https://github.com/lossyrob/phased-agent-workflow/issues/155
- planning/paw_v2/2025-12-18_vscode-skills-support-notes.md - notes from a chatgpt conversation about how to change https://github.com/lossyrob/phased-agent-workflow/issues/153 now that the announcment of Anthropic Skills being an open standard and vs code support
- Anthropic Skills spec: https://agentskills.io/specification
- VS Code skills support: https://code.visualstudio.com/docs/copilot/customization/agent-skills

---

## V2 End State Delta (vs PAW v1)

This section tags which parts of the “end state” are already specified and working in PAW v1 (and can likely carry over unchanged), vs what’s genuinely new / needs redesign for v2.

### Carry Over (Unchanged or Mostly Unchanged)

- **Artifacts + state model in workspace**: v1 already standardizes a workspace-local artifact tree at `.paw/work/<feature-slug>/` with a central `WorkflowContext.md`.
	- Spec + layout: `/paw-specification.md` and `/docs/reference/artifacts.md`
	- Work item discovery pattern: `/src/commands/getWorkStatus.ts` (scans `.paw/work/*/WorkflowContext.md`)


- **Custom instructions + precedence**: v1 already supports both workspace and user-level custom instructions. Precedence **workspace > user > defaults** is a documented rule that is enforced by the agent’s instructions (and/or in v2, the skill instructions), with the tool output structured to support that interpretation.
	- User guide: `/docs/guide/custom-instructions.md`
	- Tool implementation: `/src/tools/contextTool.ts` (loads `.paw/instructions/…` and `~/.paw/instructions/…`)

- **Handoff modes + “new chat” stage transitions**: v1 already defines manual / semi-auto / auto transition behavior and implements stage handoff by opening a new chat (fresh context) in VS Code.
	- Guide: `/docs/guide/stage-transitions.md`
	- Templates: `/src/prompts/handoffManual.template.md`, `/src/prompts/handoffSemiAuto.template.md`, `/src/prompts/handoffAuto.template.md`
	- Tool: `/src/tools/handoffTool.ts` (`paw_call_agent`)

- **Prompt-file-as-command surface**: v1 already supports on-demand generation of prompt files (per stage / PR-review variants).
	- Tool: `/src/tools/promptGenerationTool.ts`
	- Initialization prompt calls this out: `/src/prompts/workItemInitPrompt.template.md`

- **User-level “install” for agents**: v1 already installs agent prompt files into the user’s VS Code prompts directory (platform-aware, configurable).
	- Guide: `/docs/guide/vscode-extension.md`
	- Implementation: `/src/agents/installer.ts`, `/src/agents/platformDetection.ts`

### Carry Over (Concept, Mechanism Likely Changes in V2)

- **Review workflow + artifacts (PAW-R\*)**: v1 has a complete PR review workflow with dedicated agents and a review artifact tree (parallel to `.paw/work/*`).
	- Spec: `/paw-review-specification.md`
	- Agents: `/agents/PAW-R*.agent.md`
	- Review handoff component: `/components/review-handoff-instructions.component.md`
	- Artifacts include `ReviewContext.md`, plus derived review artifacts (derived spec, impact analysis, gap analysis, review comments).

- **Azure DevOps work item URL support**: v1 workflow initialization UI validates Azure DevOps work item URLs alongside GitHub issues.
	- UI: `/src/ui/workflowInitUI.ts`

- **Prompt templates for PR-review loops**: v1 prompt generation includes explicit “PR review response” variants (planning PR review, implementation PR review, docs PR review, final PR review).
	- Tool: `/src/tools/promptGenerationTool.ts`

- **Implementation details that are easy to forget but materially affect UX**:
	- Semi-auto mode has explicit “routine vs decision point” transition rules (not just a vague “sometimes pauses”).
	- Auto mode is constrained (e.g. requires local review strategy).

- **“Agents do decisions and are main drivers of change, tools give agents procedural capabilities when necessary” architecture philosophy**: v1 is already designed around this split; v2 keeps the concept but shifts the interface to Skills + a single top-level agent.
	- Example: `/src/tools/promptGenerationTool.ts` (explicitly calls this out)

- **Workflow staging and artifacts**: v1 already defines stages, quality gates, and artifacts; v2 can keep the workflow semantics while changing how stages are executed (single-agent + Skills + subagents).
	- Spec/overview: `/paw-specification.md`
	- Implementation workflow: `/docs/specification/implementation.md`

### New / Needs V2 Decisions (Not Fully Specified in v1)

- **Skills-first encoding of workflow + capabilities** (Anthropic Skills standard, VS Code Skills support).
	- What is a “PAW skill” vs “tool” vs “prompt command” taxonomy in v2?
	- How are skills versioned and distributed (extension install vs workspace install vs user-level override)?

- **User-level Skills catalog + loading** (because VS Code skills are workspace-scoped today):
	- Exact filesystem location(s)
	- Precedence/merge rules between user skills and workspace skills
	- How skills are discovered/registered
    - Note: Need to validate that `skills` folder in the user prompt directory doesn't load already, may be undocumented behavior.

- **Subagent orchestration in the workflow**:
	- Which stages should delegate to subagents, and what is the contract for subagent outputs (file artifacts vs summarized results)?
	- How to prevent “phase chopping” while still keeping evidence durable.
	- When subagents are used, how do we structure the “conversation contract” so the parent agent can iterate (ask more questions, request more targeted code research) without losing traceability?
	- What is the “artifact authority” model: do subagents write artifacts directly, or do they return structured results that the parent agent writes into artifacts?
	- Should subagents be constrained to only read/compute (no writes) except in explicitly delegated “artifact writer” tasks?
	- How does subagent execution interact with tool approvals and long-running tasks (e.g. tests, builds)?

- **Workspace-only install mode** (optional):
	- If installed into a repo (no user install), what replaces extension-provided tools (`paw_get_context`, `paw_call_agent`, etc.)?
	- What’s the minimal viable experience for non-VS Code runtimes (if tools can’t exist)?

- **Migration story (v1 → v2)**:
	- Compatibility with existing `.paw/work/*` structures and existing agent prompt files
	- What breaks, what’s auto-migrated, and what the user must do manually

- **Dual-target install model (system-wide vs workspace-installed)**: design intent includes a system-wide default (user-level agent + dynamic skill loading) plus an opt-in workspace export (skills-first, and possibly no workspace agent).
	- Notes: `planning/paw_v2/2025-12-18_vscode-skills-support-notes.md`
	- Open question: do we treat “workspace-only install mode” as “skills export” first, with an optional workspace agent as a secondary add-on?

- **Skills catalog loading strategy**: the notes debate whether “skills catalog” should be returned by `paw_get_context` vs a separate “get skills catalog” tool.
	- Notes: `planning/paw_v2/2025-12-18_spike-task-skills.md`
	- Open question: do we want a stable machine-readable catalog format (names + descriptions + paths + provenance) that can be used both by the system PAW agent and by other runtimes?

- **“Prompt files as explicit commands” rationale**: the end state describes prompt files becoming explicit verbs (e.g. “create spec”) rather than implicitly bundling that into “being in the spec agent”.
	- Open question: if handoff creates a new chat, can it also reliably invoke a prompt-file command (slash command / prompt file) as the first message?

- **Design phase as the first migration proving ground**: the spike notes propose using a new design workflow/skills set to prove the skills architecture without touching the existing implementation/review workflows.
	- Notes: `planning/paw_v2/2025-12-18_spike-task-skills.md`
	- Open question: does v2 define “design” as a first-class workflow stage, or is it a skill that can be invoked within other stages?

---

## Go-do Sequence (to get v2 spec-ready)

Goal: resolve the v2 decision knots in a dependency order, so the end result is a coherent "how PAW v2 works" that can be turned into a product specification (and then implemented).

### 1) Nail the v2 scope boundary (so later decisions don't drift)

**Decisions:**
- Decide what v2 *is* (minimum viable end state) vs what's intentionally deferred (multi-runtime portability, non‑VS Code environments, full workspace-only mode, etc.).
- Write down explicit non-goals for the first build (e.g., Claude Code support, GitHub Copilot coding agent support, non-GitHub PR workflows).
- Clarify: Is workspace-installed PAW a v2 goal or a future enhancement?

**Output:** A one-page "v2 scope + non-goals" note (or a short RFC) you can point every later decision back to.

**Suggested Implementation Plan:** Start by listing the 15 existing agents and categorizing their functionality into "core workflow" vs "specialized roles." Draft a scope document with two columns: "v2 Must Have" (single agent, skills architecture, subagent orchestration) and "Deferred" (multi-runtime, workspace export, design workflow). Validate against Issue #153 goals (G1-G5) and the voice notes vision. Time-box to 2 hours for first draft; iterate based on later go-do discoveries.

Status:
- Agent lists in planning/paw_v2/go-do/agents; summary in planning/paw_v2/go-do/agents/_SUMMARY.md
- Scope document drafted: planning/paw_v2/go-do/GoDo-1_v2-scope-and-non-goals.md

---

### 2) Define the v2 control plane: agent vs skills vs tools vs prompt-commands

**Decisions:**
- Decide the taxonomy:
  - **PAW Agent** (single top-level agent) responsibilities: workflow state awareness, skill orchestration, handoff decisions, subagent invocation.
  - **PAW Skills** (two types): *Workflow skills* (phase orchestration, artifact templates, quality gates) vs *Capability skills* (research, review heuristics, artifact conventions).
  - **Tools** (procedural operations only): `paw_get_context`, `paw_list_skills`, `paw_get_skill`, `paw_call_agent`, `paw_generate_prompt`.
  - **Prompt files as explicit commands**: user-initiated verbs like "create spec", "create plan", "run review".
- Decide where workflow sequencing lives (skill instructions are primary; agent instructions provide orchestration meta-awareness; prompt-commands are user entry points).

**Output:** A simple diagram + a table mapping each existing v1 agent to its v2 skill home.

**Suggested Implementation Plan:** Create a mapping table starting from Issue #153's agent→skill mapping (PAW-01A→Spec Workflow, PAW-02A→Code Research Workflow, etc.). Then identify cross-cutting skills to factor out: Review Heuristics, Artifact Conventions, Handoff Procedures, Working With Issues/PRs. Draft a visual showing the single PAW agent at center, with skill categories radiating outward, and tools as the substrate layer. Validate by walking through a "create spec" flow end-to-end on paper.

Status
- Three versions created; choose planning/paw_v2/go-do/GoDo-2_v2-control-plane-taxonomy.md and mark a TODO for later to ensure the other two are mined for value carefully later.

---

### 3) Pick the install + distribution model (because it determines where things live)

**Decisions:**
- Decide the default delivery (dual-target architecture per the notes):
  - **System-wide PAW (default):** Single PAW agent + tools installed to user directories; skills loaded dynamically via tool calls; available in any workspace.
  - **Workspace install/export (optional):** Skills written to `.github/skills/paw-*`; optional workspace agent at `.github/agents/PAW.agent.md`; enables GitHub coding agent visibility.
- Decide "source of truth" for shipped skills: extension bundle is authoritative; user/workspace skills extend or override.
- Decide lifecycle commands: `PAW: Install into Workspace`, `PAW: Update Workspace PAW`, `PAW: Remove Workspace PAW`.

**Output:** An explicit filesystem layout proposal with paths, naming conventions, and precedence rules.

**Suggested Implementation Plan:** Define file paths for each target: user-level (`~/.paw/skills/`, prompt files in VS Code user prompts dir), workspace-level (`.github/skills/paw-*/SKILL.md`), work-item level (`.paw/work/<id>/skills/`). Draft a manifest file schema (version, schema-version, source, installed-at) for workspace installs. Prototype the `paw_list_skills` tool to discover from all four sources (built-in, user, workspace, work-item) and return unified catalog.

---

### 4) Lock the skills catalog + loading rules (the biggest integration risk)

**Decisions:**
- Decide the catalog shape (align with Agent Skills spec YAML frontmatter):
  - Required fields: `id`, `name`, `description`, `source` (builtin|workspace|work-item|user), `path`.
  - Optional: `version`, `compatibility`, `allowed-tools`.
- Decide merge/precedence (per Issue #153):
  1. Built-in (baseline, authoritative for workflow mechanics)
  2. Workspace (extends)
  3. Work-item (extends)
  4. User (extends)
  - Conflict resolution: same-name skills override by precedence; no aliasing in v2.
- Decide how the agent obtains the catalog:
  - **Recommendation from research:** Separate `paw_list_skills` tool (returns metadata only) + `paw_get_skill` tool (returns full instruction document). Keeps context tool focused and aids debugging.
- Decide system vs custom skill loading difference: system skills via `paw_get_skill` tool; custom skills via file path reference (agent reads directly).

**Output:** A concrete catalog schema + 2–3 worked examples (built-in workflow skill, user capability skill, work-item skill).

**Suggested Implementation Plan:** Fork the existing `contextTool.ts` to create `skillsCatalogTool.ts`. Define TypeScript interfaces for `SkillMetadata` and `SkillCatalog`. Implement discovery crawl for each source location, parsing YAML frontmatter from `SKILL.md` files. Return JSON catalog sorted by source precedence. Add `paw_get_skill` as a simple file-read wrapper that returns the full SKILL.md content. Write tests for precedence edge cases (same name in multiple sources).

---

### 5) Define the "command surface": prompt commands + handoff + context reset

**Decisions:**
- Decide which user actions are *commands* (prompt files) vs *skills* invoked implicitly:
  - Commands (explicit, user-initiated): `paw-create-spec`, `paw-create-plan`, `paw-implement`, `paw-review-pr`, `paw-status`.
  - Skills (implicit, agent-invoked): research activities, review heuristics, artifact writing conventions.
- Decide whether handoff can (and should) invoke a prompt command as the first message in the new chat:
  - **Yes:** Auto and semi-auto modes benefit from seamless command invocation.
  - **Fallback:** If prompt command invocation fails, handoff should include the command name in the initial message so the user can invoke manually.
- Decide the stable verbs users learn: spec, plan, implement, docs, pr, review, status, continue.

**Output:** A shortlist of first-class commands (prompt files) + the expected UX for manual/semi/auto transitions.

**Suggested Implementation Plan:** Audit existing prompt templates in `src/prompts/` and current `paw_generate_prompt` tool. Design new prompt file naming convention: `paw-<verb>.prompt.md`. Each prompt file opens with the PAW agent and instructs it to load the corresponding workflow skill. Modify `paw_call_agent` tool to optionally invoke a prompt command as the opening message. Test the invocation chain in VS Code Insiders with `chat.useAgentSkills` enabled.

---

### 6) Specify the subagent orchestration contract (so "no phase chopping" is real)

**Decisions:**
- Decide which phases/stages spawn subagents:
  - Spec workflow → subagent for Spec Research
  - Planning workflow → subagent(s) for Code Research
  - Review workflow → subagents for Baseline Research, Impact Analysis, Gap Analysis
- Decide the "artifact authority" model:
  - **Recommendation:** Subagents write artifacts directly (simpler, reduces parent token load). Parent receives file path confirmation, not full content.
- Decide minimum structure for subagent returns:
  - Required: artifact file path, summary (1-3 sentences), status (success|partial|failed).
  - Optional: follow-up questions (enables parent to iterate without re-invoking).
- Decide how subagents interact with approvals/long-running tasks:
  - Subagents may run builds/tests if workflow skill instructs them to; parent does not re-run.
  - Tool approvals flow through normally (user sees approval dialogs regardless of parent/subagent context).
- Decide subagent invocation pattern (per Issue #153 insight): since VS Code subagents can't be invoked with custom agent definitions, subagents load skills via `paw_get_skill` tool call inside their execution.

**Output:** A short "Subagent Contract" doc with: allowed actions, required outputs, and a sample exchange.

**Suggested Implementation Plan:** Write a contract document defining: (1) when parent invokes subagent (explicit instruction in workflow skill), (2) what subagent receives (work-id, skill name to load, optional focus parameters), (3) what subagent returns (artifact path, summary, status, follow-ups). Create a sample exchange showing Spec workflow invoking Spec Research subagent. Test with `runSubagent` in current PAW to validate the handoff shape works.

---

### 7) Reconcile skills standard constraints with PAW requirements

**Decisions:**
- Address the user-level skills gap (VS Code only supports workspace-scoped skills):
  - **Resolution:** Dual-target architecture. System-wide PAW loads skills via tool calls; not dependent on VS Code native discovery. Workspace export uses `.github/skills/` for native discovery.
- Decide whether custom skills must follow Agent Skills spec format (SKILL.md with YAML frontmatter):
  - **Recommendation:** Yes, for consistency and potential future portability. Custom skills follow same format; PAW catalog just references by path.
- Decide `allowed-tools` usage (experimental in Agent Skills spec):
  - **Recommendation:** Defer. Don't constrain tools per-skill in v2; revisit if security/scoping becomes a concern.
- Validate skill naming against Agent Skills spec constraints: lowercase, hyphens only, 1-64 chars, name matches parent directory.

**Output:** A compatibility matrix showing how PAW skill concepts map to Agent Skills spec requirements.

**Suggested Implementation Plan:** Create a skill template (`templates/skill-template/SKILL.md`) that follows Agent Skills spec. Write a validator script (extend existing `lint-agent.sh` pattern) to check: frontmatter fields, directory naming, description length, file reference depth. Document the mapping from v1 agent files to v2 skill format. Create 2-3 example skills (Spec Workflow, Code Research, Review Heuristics) using the template.

---

### 8) Decide the migration story (v1 → v2) and compatibility guarantees

**Decisions:**
- Decide what remains compatible:
  - ✅ `.paw/work/<feature-slug>/` layout and discovery (unchanged)
  - ✅ Artifact names and structures (Spec.md, CodeResearch.md, etc.)
  - ✅ WorkflowContext.md format and fields
  - ✅ Custom instructions locations (`.paw/instructions/`, `~/.paw/instructions/`)
- Decide what breaks:
  - ❌ Individual agent prompt files (15 files → 1 PAW agent + skills)
  - ❌ Direct agent invocation by name (users learn skill verbs instead)
  - ⚠️ Handoff mode behavior may change (semi-auto transitions revised)
- Decide migration approach:
  - **Guided migration:** Extension detects v1 agent files, offers to remove them and install v2 structure.
  - **Compatibility period:** v2 PAW agent can still recognize v1 stage commands for 1-2 releases.

**Output:** A migration checklist and a compatibility matrix.

**Suggested Implementation Plan:** Enumerate all v1 user-installed files (15 agent files, prompt templates). Write a migration script that: (1) backs up existing files, (2) removes deprecated agents, (3) installs new PAW agent + skills, (4) updates any workspace `.paw/` artifacts if schema changes. Create a "What's New in PAW v2" guide explaining the single-agent model. Add deprecation warnings to v1 agent files before v2 release.

---

### 9) Run a proving-ground spike: Design Workflow

**Decisions:**
- Use "design phase / design workflow" as the proving ground (greenfield, per voice notes and Issue #155):
  - No regression risk (new capability)
  - Exercises workflow skill + capability skill composition
  - Validates subagent delegation for design activities
- Define design activity skills for the spike:
  - Constraint Discovery
  - Alternative Exploration
  - Trade-off Analysis
  - Scope Cutting ("smallest coherent system")
- Validate end-to-end:
  - Skills catalog loading + precedence
  - Prompt-command UX (`paw-design`)
  - Subagent delegation (parent → design activity subagent → artifact)
  - Artifact writing + discovery (new `Design.md` artifact?)

**Output:** A short spike report ("what worked / what didn't / decisions changed").

**Suggested Implementation Plan:** Create `skills/paw-design-workflow/SKILL.md` with workflow instructions. Create 2-3 design activity skills (start with Constraint Discovery and Trade-off Analysis). Build a minimal `paw-design.prompt.md` command file. Implement `paw_list_skills` and `paw_get_skill` tools if not already done. Run the spike on a real feature idea (e.g., "design the workspace export feature"). Document friction points, token usage, and subagent handoff quality. Iterate on skill instructions based on findings.

---

### 10) Convert decisions into a product specification-ready package

**Deliverables:**
- Freeze the decisions from steps 1–9 into:
  - A single narrative "How PAW v2 Works" doc (happy path + edge cases)
  - Explicit acceptance criteria for each capability:
    - Install PAW extension → single agent + tools + skills available
    - Initialize workflow → WorkflowContext.md created, skills discoverable
    - Run a stage → prompt command invokes PAW agent, loads workflow skill, produces artifact
    - Delegate subagent → parent invokes subagent, subagent loads skill, writes artifact, returns summary
    - Generate artifacts → correct structure, placed in `.paw/work/<id>/`
    - Handoff → new chat opened, state preserved, next skill loaded

**Output:** A spec-ready bundle containing:
- Architecture diagram + taxonomy table
- Filesystem layout + precedence rules
- Skills catalog schema (aligned with Agent Skills spec)
- Subagent contract document
- Command surface (prompt files list with descriptions)
- Migration plan + compatibility matrix
- Design spike learnings (incorporated)

## Voice notes (session 1)

What I want to do is to build a document that describes the end state of the system. The Paw V2 system, Paw Next generation, whatever. I don't know what to call it, but it is like a big refactor of Paw and a reimagining of it like now I've been, I built it a few months ago, people have been using it with success, but I think it needs to evolve into sort of new system and it'll solve some pain points and take advantage of. The new skills sort of framework for using it. 
There's some things that I want to account for immediately, which is the skills set up. There's some things that I want to be able to head towards more easily in the future and that's particularly around. You know, having taking advantage of the fact that skills are. You know, an open standard and if we can leverage skills as much as possible. Then. It should work with Claude code. It should work with Codex. Once they support skills. It should work with Github coding agents which are the like the cloud coding agents. It should look work all around. I'm not. I'm not trying to do that yet. I think this is still VS code get up copilot centric, but I am trying to think of the design in such a way that it will ease the burden of shifting for support. Umm to other coding agent frameworks or applications and Ides given. That yeah, this should. You know, the more we lean on these standards, the the more it should work. Umm. 

But for now I want to describe the end state of Paul that I want. And and it's whatever you see, Paul. What I mean is PAW. So don't, don't talk about Paul. Talk about PAW. This is one of the biggest problems with this project name is that voice dictation just cannot hear me say PAW. It thinks I'm saying the name Paul. 

You install PAW. It. Installs into. Your user directory. A single. PAW agent. That agent is instructed to use some tools. Those tools are mainly around. Umm. Or specifically around. Getting the Paw context. Generating prompt files when you want them. And clearing the context in a new chat and initiating the next phase in development. In addition. The paw skills. Fetching the catalog of Paw skills. Which include the instructions about the work flows for each phase. And the, you know, there's some skills there, there would probably be a skill around. Right now with the Paw status agent has or has like a kind of complete description of the Paul process. And then there's skills around, you know, writing a spec, writing an implementation plan, doing code research. The workflow dictates when to hand off to a sub agent. So the spec phase workflow instructions would say you know, hand off to a sub agent and instruct it to use the skill like the code research skill to go find. You know the proper you know to create the code research artifact. And so these workflows would be centered around generating artifacts. And the skills would be around like generating those artifacts, um. Also things like doing code review. Using Github MCP to like manage PRS in the call process and so these are all sort of paw skills that would be installed in sort of the extension for like a system wide paw that's that is like handled by the VS code extension. And. There's also customizability, so the any of the skills any of the paw skills would include. Instructions to go get custom instructions. That can potentially be filtered by phase or actually I don't know that I've seen instances so far of the need to like customize each agent phase. So really it's a little bit like go look at these custom instructions. Umm. Well, I'm not sure I like. Right now we have a custom instructions per agent. But I we need to figure out do we make custom instructions that just like tweak the Paul process and like the you know, workflow. And even the skills like if you want something around like how specs should be written, there should be some good way to be able to customize every single part of the Paul process. And so there's this ability to list, you know, get the catalog of internal system tools and then. You know the Paw tools and then those include like the workflow skills and the. Other Paul system skills. And part of the design before was to also allow for custom skills to be loaded in Paw. And I'm not sure we should keep that given that VS code just announced they're going to be. You know, supporting skills. However those skills will be workspace centric, so. I sort of do still want support for. A you knowuserdirectory.paul.you know forward slash skills in order to just have. The ability to load up. Skills across. The. Any project so you know all these projects all of these repositories they can have Co pilot instructions and skills now but II want the ability to like have skills that I in in any project I can leverage. So II do want that to be part of Paul until BS code supports like user directory level skills. 

There's also prompt files that would be installed in the user level directories that are like the Paw commands. So right now we have Paw agents that it's like when you're talking to the spec agent. It's sort of implicit that the command is to create a spec, which actually gets a little bit confusing because sometimes you're talking to the spec agent about like reviewing the spec, and its system instructions are really about generating the spec and not like. Responding to feedback and or other things. So what will move to instead is like, you know, there's the spec workflow skill, that that phase workflow skill. There's the sort of spec writing skill. Or like the you know specification skill that that focuses mainly on the like quality of the the document and like the the spec workflow skill might have like this sequence of of actions to take, but one will be to like review the spec skill to to actually like generate the spec that would have like the template and stuff. But then there would be a prompt file which would be the like paw create spec. And that's what the user would run with like a slash command and you could say like Paul create spec and then like type in information afterwards that would actually like, you know, be able to give it additional context. And that would be similar to like. Umm. Selecting that agent and doing the workflow ID. One thing that we need to make sure is that this this sort of like hand off this new handoff tool. It'll like create a new chat and can it just do the slash command and submit that is that would will that correctly? Run the slash command like run the prompt file. So we have prompt files to run the phases of the workflow that either the users run or the you know the paw like next phase or whatever tool that is currently that that matches the current Paul call agent. Tool. There we have the Paw agent which those prong files would use that like has the sort of top level context about what you know how to sort of go fetch the workflow instructions and the the Paul internal skills. And then. It would have. Yeah, the internal skills that it would fetch with a tool. 

But then there's a consideration about like, well, what if you do want to install Paw into the workspace? What would that take 'cause really the extension could write? The Paw agent. It could install the prompt files in the workspace and now with the new skill support it could install the skills into the workspace and then it would just write all of the skills into the workspace. And the thinking there is that you know what else would we need for the coding agent? There's the paw_get_context tool Which would potentially in a workspace installed paw just like be replaced by. Hey go read the files and actually, you know, use file system search instead of the the single tool call. And then the. It would the the sort of. The skills. Read by a tool like, the internal skills would just be replaced by, you know, the skill support. So the Paw workflow instructions and the different skills would just be installed as skills in the workspace. And then there's one other element which is the handoff or like the context clearing, like the you know. Do next phase and like that. That wouldn't be supported. Unless. Yeah, I don't know how that would be supported, so there could be like instructions in the workspace, paw to say. You know if this tool is not available? Do your best to clear context although. I don't know how like. The workspace Paul would do that? I mean if it's in VS code, it can just like use the paw extension. But then, like if it was a coding agent, I don't know what that instruction would actually do. But even if it didn't do that, you know the coding age is going to manage context however it's going to manage and potentially it. Could. Yeah, it can work as a coding agent, but again, I'm not trying to focus on solving that problem now. I'm just trying to think through what is the system that's gonna most easily expand to that when I want to. But the sort of paw V2 is really focused on consolidating the agent down to a single agent having the skills. Be encoded as skills having the workflows also encoded as skills having. Tools that can fetch. System skills. Also tools that can fetch custom skills that are at the user level. To sort of avoid the. Requirement of the new skill support in VS code to be have those skills only loaded into the workspace. And then having a system to customize the instructions for any of this, so you know, having just the user be able to modify behavior similar to how it can right now. And then so the initialize like the new new Paul workflow actually could just become a slash command through a prompt file and. Yeah. And in that, you know, how do we make sure that that can also be customized if we have customizations to like how we want to initialize Paul workflows? You know, keep keeping some system brand for that and I'm trying to think of what would be the best way to do that. 

There's one other thing that I have again forgot about that needs to be sort of core to the new version and that's the usage of sub agents. So there's a sub agent capability in VS code that PAW currently doesn't. Doesn't leverage. And so the way this you know should appear is that the instructions, the workflow instructions specifically call out when they use sub agents. So in the spec creation workflow instead of having what you know. So the current situation is that there's the spec agent that goes and writes a research prompt that then you go and run manually or like it through a handoff. Um, to a new agent, and then that produces the spec research and then it goes back to the spec agent. But that's actually just a manual sort of process. Or that's the same as calling a sub agent. So instead the spec agent within its conversation should go run a sub agent that is that that instructs it to then use the spec research skill, the spec research workflow skill. To and then that sub agent will go and read that skill and then follow those instructions and then produce the spec research markdown document, which then it just like hands the path back off to the. The spec agent, so that all just kind of happens within that phase instead of having the phases like chopped up and yeah, so that's the same thing with like implementation planner and the code research like that, implementation planning. Can just do code research as sub agents and it sort of gives an opportunity for the implementation planner to let go ask code research questions and then maybe, you know, process more, start to lay out the implementation line and then go ask For more information about code research. So yeah, leveraging sub agents is going to be a big part of this new version of PAW. 

---

## Additional notes 

- For context management - we should find areas to use subagents as much as possible to effectively manage context. For example, have a subagent fetch issues with all comments, and then summarize relevant data, when needed by the main agent. Can subagents spawn other subagents?