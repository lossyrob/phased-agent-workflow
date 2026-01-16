## Voice notes

This work will be doing some initial work in the direction of enabling skills in Paw. The issue labels this as a spike, but this will actually be merged code that serves as a sort of incremental step towards shifting all of the project to use skills. I have a need for doing some reviews that are. Actually cross repository and so there's a distinct need for the sort of skills based workflow that for the power review system. Reopening this issue to take this on as initial stab. As mentioned in the workflow context, there's a planning branch for PAU V2 which goes over in more detail with the final state of the skills based paw should look like. This work will focus on having. The review workflows encoded as skills. And to enable two new tools, there's going to be. paw_get_skills and paw_get_skill. VS Code has since launched the capability for skills to be natively supported. In the .github/skills directory. However, there's still not a good distribution mechanism for skills other than copying into the project space. So we're still moving forward with a tools based approach to enabling skills that. Will give the skills metadata through the Get skills tool. And will fetch the skill content with the get skill when the skill is called with the skill name. There was some work around thinking how we could also support sort of custom skills. And that's no longer the case because VS code will handle that. But I'm getting ahead of myself. This work is specifically around the enabling those two tools. Collapsing the review sub agents into a single PAW Review Subagent. And then moving all of the sort of workflow definition and the capabilities. Into skills that are exposed through those tools. The PAW Review sub agent will. Then be instructed to use the PAW skills to. Get the skills.  And even the name of sort of you know the specific workflow to follow and just to just to enable this with the thinking of how can this agent be able to leverage the? Review. Component, whether they're the VS code, workspace has just a single directory or it's a you know, cross repository scenario where there's multiple project directories in there and there might be multiple PRS. How can we have the skills set up so that they can you know, the parts that actually don't matter, whether or not it's, you know, a single repository or multiple repositories, those. Skills kind of like are generic across those. And then what skills are actually specific? Like if there's specific cross repository, cross PR work flows that that need to be, you know, account for that setup that the appropriate skill can be selected. In those scenarios. 

So the end state that we're looking for is to have that PAW review agent. That will be a generic review agent that can load skills through the Get Skills tool. And then load individual skills when it seems necessary through the get skill. And to be able to run the review workflow across APA Single, PR. Where the VS code workspace is the project that the PRS for. As well as a set of PRS where all of the projects that the PRS are for are in the workspace as directories as the sort of work directories. 

Issue https://github.com/lossyrob/phased-agent-workflow/issues/142 discusses the problem and an approach to the cross-repo workflow for implementation. Read through that issue to understand that approach, but know that that approach won't apply here since that's based on sub agents and we're solving this for skills and the purpose is not to enable specifically cross repository. Workflows it's to. Organize it such that it should work across both across repository and single repository. Although we will add there should be a phase about adding a workflow that is you know if necessary adding a workflow that is specific about cross repositories that would be encoded as a skill that the Paw review agent could look at and or like see in the the tool that or the skill list and load that when appropriate. And there might even be some prompting in the the the the custom agent that is the Paul review agent to say you know if this is a multi works working directory project or if there's multiple P RS then. You know load, that's you know, look for the skill for cross repository.

---

## Organized Summary

### Goal

This work is an **incremental step toward skills-based PAW** (PAW v2), focused specifically on the **review workflow**. It will:
1. Introduce two new tools: `paw_get_skills` and `paw_get_skill`
2. Consolidate the 6 existing PAW-R* review agents into a **single PAW Review agent**
3. Encode review workflow logic as **skills** that the agent loads dynamically

### Why Start with Review?

- Immediate need: Cross-repository PR reviews where multiple projects are in one workspace
- Review workflow is somewhat isolated from the implementation workflow
- Serves as a proving ground for the skills architecture before migrating the full PAW system

### Key Architectural Decisions

| Decision | Choice |
|----------|--------|
| **Distribution mechanism** | Tools (`paw_get_skills`, `paw_get_skill`) rather than VS Code native `.github/skills/` because VS Code skills are workspace-scoped only |
| **Custom skills** | Deferred to VS Code native support; not implementing custom skill loading in this work |
| **Agent consolidation** | 6 PAW-R* agents → 1 generic PAW Review agent that loads skills dynamically |
| **Cross-repo handling** | Skills should be generic; cross-repo-specific logic is an optional skill the agent loads when it detects multiple repos/PRs |

### New Tools

1. **`paw_get_skills`** - Returns a catalog of available skills with metadata (name, description, path, source)
2. **`paw_get_skill`** - Fetches the full content of a specific skill by name

### Single vs Cross-Repo Scenarios

The PAW Review agent should work in both:

| Scenario | Description |
|----------|-------------|
| **Single-repo** | VS Code workspace = the project, reviewing one PR |
| **Cross-repo** | VS Code workspace contains multiple project directories, potentially multiple PRs to review together |

**Design approach**: Most skills are generic (work for both scenarios). A dedicated cross-repo skill handles orchestration when the agent detects multiple repos/PRs.

### What This Work Does NOT Include

- Full PAW v2 migration (implementation workflow stays unchanged)
- Workspace-installed PAW / GitHub Copilot coding agent support
- Custom user skills (deferred to VS Code native support)
- Changes to the existing implementation agents (PAW-01A through PAW-05)

### Reference: Cross-Repo Issue #142 Summary

Issue #142 proposed a **Supervisor PAW Workflow** pattern for cross-repo implementation:

- **Supervisor** lives in workspace root `.paw/multi-work/` (not inside any git repo)
- **Child workflows** are standard PAW workflows in each repo's `.paw/`
- **Sequencing**: Repository-level (complete one repo before moving to next) for v1

**Relevance to this work**: The supervisor/child pattern from #142 is for the *implementation* workflow using sub-agents. This work takes a different approach—using *skills* to make a single Review agent that dynamically adapts to single or multi-repo contexts.

### Skills Architecture (Clarified)

**Structure**: One workflow skill + multiple activity skills

```
Skills:
├── paw-review-workflow      # Orchestrates the sequence, runs activities as subagents
├── paw-review-understanding # Activity: R1A logic (create ReviewContext, DerivedSpec)
├── paw-review-baseline      # Activity: R1B logic (CodeResearch.md)
├── paw-review-impact        # Activity: R2A logic (ImpactAnalysis.md)
├── paw-review-gap           # Activity: R2B logic (GapAnalysis.md)
├── paw-review-feedback      # Activity: R3A logic (ReviewComments.md, pending review)
└── paw-review-critic        # Activity: R3B logic (assessment sections)
```

**Workflow execution**:
1. PAW Review agent loads `paw-review-workflow` skill
2. Workflow skill instructs agent to run each activity as a **subagent**
3. Each subagent loads its activity skill via `paw_get_skill`
4. **No pauses** — runs through entire workflow automatically (unlike current manual handoffs)

**Current workflow sequence** (from `paw-review-specification.md`):
R1A → R1B → R1A → R2A → R2B → R3A → R3B

### Open Questions

*(None remaining — ready for spec)*

### Scope Boundaries

**In scope for this work**:
- `paw_get_skills` and `paw_get_skill` tools (builtin skills only)
- Single PAW Review agent that loads skills dynamically
- Review workflow skill + activity skills (bundled in extension)
- Subagent execution of activities (no manual pauses)
- Remove 6 PAW-R* agents, replace with single `PAW Review.agent.md`
- New `skills/` directory at repo root for skill definitions
- `paw-review.prompt.md` prompt command as entry point (PAW v2 pattern)

**User invocation flow**:
1. User runs `paw-review.prompt.md` (slash command), provides PR number
2. Prompt file invokes the PAW Review agent
3. Agent loads `paw-review-workflow` skill via `paw_get_skill`
4. Workflow skill instructs agent to run activities as subagents
5. Each subagent loads its activity skill and produces artifacts
6. Review completes with ReviewComments.md and pending GitHub review

**Documentation updates**:
- Update `paw-review-specification.md` to reflect skills-based architecture
- Update `docs/` as needed (agents reference, etc.)

**File structure**:
```
skills/
├── paw-review-workflow/SKILL.md
├── paw-review-understanding/SKILL.md
├── paw-review-baseline/SKILL.md
├── paw-review-impact/SKILL.md
├── paw-review-gap/SKILL.md
├── paw-review-feedback/SKILL.md
└── paw-review-critic/SKILL.md
```

**Out of scope (future work)**:
- Workspace skills (`.github/skills/`)
- User-level skills (`~/.paw/skills/`)
- Custom skill discovery/loading
- Skill customization/override mechanisms
- Implementation workflow migration to skills
- Changes to implementation agents (PAW-01A through PAW-05 remain unchanged)

### Skill Format

Skills follow the [Agent Skills specification](https://agentskills.io/specification):

```
skill-name/
└── SKILL.md          # Required - YAML frontmatter + Markdown body
```

**Required frontmatter fields**:
- `name`: 1-64 chars, lowercase alphanumeric + hyphens, must match directory name
- `description`: 1-1024 chars, describes what skill does and when to use it

**Optional fields**:
- `license`
- `compatibility`: environment requirements
- `metadata`: arbitrary key-value (can include `version`, `author`, custom fields like `type: workflow`)
- `allowed-tools`: experimental, space-delimited pre-approved tools

**Catalog (`paw_get_skills`)**: Returns metadata only (~100 tokens per skill) — `name`, `description`, plus any `metadata` fields

**Fetch (`paw_get_skill`)**: Returns full SKILL.md content (< 5000 tokens recommended)

**Skill type distinction**: Use `metadata.type: workflow` or `metadata.type: activity` to distinguish — the agent uses this to know which skill orchestrates vs which skills are invoked as subagents

### Research Questions (for PAW process to explore)

**Cross-repo detection**:
- Should `paw_get_context` return a flag indicating multi-workdir workspace?
- VS Code API exists to detect number of working directories
- PR matching: if multiple PRs provided, need to match PRs to repos
- **Decision deferred** until research determines if cross-repo needs specific guidance/skills

**Cross-repo review workflow differences** (unknown, needs research):
- What differs in review when there are multiple repos/PRs?
- What stays the same?
- For implementation, cross-repo is significantly different (git operations, commits, PRs per repo)
- For review, the difference may be smaller — TBD through research
- Research should inform whether we need:
  - A separate cross-repo workflow skill
  - Cross-repo-aware activity skills
  - Just orchestration changes in the workflow skill 