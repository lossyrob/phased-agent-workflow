---
date: 2025-10-11T00:00:00-00:00
target_branch: feature/finalize-initial-chatmodes
status: complete
last_updated: 2025-10-11
summary: "Research on PAW chatmode current state and external best practices for AI agent prompt engineering"
tags: [research, chatmodes, prompt-engineering, humanlayer-patterns]
ticket: 1
---

# Spec Research: Finalize Initial Agent Chatmodes

## Summary

This research examines the current state of PAW (Phased Agent Workflow) chatmode files and gathers external best practices for AI agent prompt engineering. Internal findings show a mix of proven chatmodes adapted from HumanLayer (Code Researcher, Implementer) and first-pass untested chatmodes. The proven chatmodes contain specific guidance patterns (CRITICAL/Important notes, explicit "do/don't" sections, numbered workflows) that should be propagated to other agents. External research reveals industry best practices around prompt clarity, guardrails, multi-agent handoffs, and structured constraint patterns that can inform chatmode improvements.

## Internal System Behavior

### Current Chatmode Structure and Content

The repository contains 9 chatmode files in `.github/chatmodes/`:


**Initially Completed and partiall tested Chatmodes:**
- `PAW-01A Spec Agent.chatmode.md` - Extensive prompt (686 lines) with detailed workflow, quality standards, and guardrails
- `PAW-01B Spec Research Agent.chatmode.md` - Well-defined research agent with clear separation of internal vs external knowledge
- `PAW-02A Code Researcher.chatmode.md` - Proven chatmode adapted from HumanLayer with comprehensive research methodology
- `PAW-03A Implementer.chatmode.md` - HumanLayer-derived chatmode with detailed implementation guidance

**Empty/Untested Chatmodes:**
- `PAW-03B Impl Reviewer.chatmode.md` - Empty file (0 bytes)
- `PAW-04 Documenter.chatmode.md` - Empty file (0 bytes)
- `PAW-05 PR.chatmode.md` - Empty file (0 bytes)

**Partially Complete Chatmodes:**
- `PAW-02B Impl Planner.chatmode.md` - Detailed planning agent (437 lines)
- `PAW-X Status Update.chatmode.md` - Status management agent (59 lines)

### Specific Guidance Patterns in Human Layer-Derived Chatmodes

**PAW-02A Code Researcher.chatmode.md** contains these distinctive patterns:

1. **Strong Negative Constraints (DO NOT sections)**:
   ```
   ## CRITICAL: YOUR ONLY JOB IS TO DOCUMENT AND EXPLAIN THE CODEBASE AS IT EXISTS TODAY
   - DO NOT suggest improvements or changes unless the user explicitly asks for them
   - DO NOT perform root cause analysis unless the user explicitly asks for them
   - DO NOT propose future enhancements unless the user explicitly asks for them
   [... 10 total DO NOT items]
   ```

2. **Numbered Step-by-Step Workflows**:
   - 9 detailed steps with sub-steps for the initial workflow
   - Separate numbered strategies for Code Location, Code Analysis, and Code Pattern Finder

3. **Important Notes** scattered throughout:
   - "**IMPORTANT**: Use the Read tool WITHOUT limit/offset parameters"
   - "**CRITICAL**: Read these files yourself in the main context before spawning any sub-tasks"
   - "**NEVER** read files partially"

4. **Explicit "What not to do" sections** for each research type:
   ```
   **What not to do**
   - Don't guess about implementation
   - Don't skip error handling or edge cases
   [... continues with 12 items]
   ```

5. **Metadata Generation Instructions**:
   - Explicit script to run: `scripts/copilot/spec-metadata.sh`
   - Detailed filename format with date/ticket conventions
   - YAML frontmatter structure specification

**PAW-03A Implementer.chatmode.md** patterns:

1. **Conditional Response Logic**:
   ```
   When given just a plan path:
   - Read the plan completely...
   
   When also given a PR with review comments:
   - Read the PR description...
   ```

2. **Branch Setup Validation**:
   - Explicit branch naming conventions
   - Pre-work verification steps

3. **Pause Points for Human Verification**:
   ```
   Phase [N] Complete - Ready for Manual Verification
   [formatted output template]
   ```

4. **Commit Hygiene Guidance**:
   - "ONLY commit changes you made to implement the plan"
   - "Do not include unrelated changes"

### Differences Between Current Chatmodes and PAW Specification

**Alignment Issues:**

1. **Spec Research Agent**: 
   - Chatmode correctly implements internal vs external knowledge separation
   - Matches specification's requirement to cite sources and handle missing external search tools
   - Uses correct output path: `docs/agents/<target_branch>/SpecResearch.md`

2. **Code Research Agent**:
   - Issue #1 notes: "specific code files and lines of code, which has value for the implementation but I believe is burdensome to the process of detailing how the system works currently"
   - Current chatmode heavily emphasizes file:line references in all sections
   - May be too granular for spec research phase vs implementation planning phase

3. **Implementation Agents Split**:
   - Spec describes two agents: Implementation Agent and Implementation Review Agent
   - PAW-03A exists and is detailed
   - PAW-03B is empty (not yet created)
   - Spec indicates split is based on model testing: "GPT 5 Codex's code implementation to be preferred, while Claude Sonnet 4.5 was better at documenting code"

4. **Empty Chatmodes**:
   - PAW-04 Documenter, PAW-05 PR, and PAW-03B Impl Reviewer have no content
   - Specification provides detailed descriptions of their responsibilities

### Concerns Raised in Issue #1

**Key Points:**

1. **Implementer Split**:
   - "This work splits the Implementer into two agents - an Implementation Agent and Implementation Reviewer Agent"
   - Based on model testing showing different strengths
   - "The Impl Reviewer chatmode has not been used or proven out yet"
   - "Implementer chatmode likely has some inconsistencies with the new PAW process and the splitting of the two agents"

2. **Code Researcher Line-Number Focus**:
   - "current prompting asks for specific code files and lines of code, which has value for the implementation but I believe is burdensome to the process of detailing how the system works currently"
   - "some runs of the agent missed important parts of the system I was working on - I suspect because it's attention and context was spent on gathering specific code locations"
   - Goal: "enable more focus on how the system works behaviorally vs how the code implementations are in the codebase"

3. **Untested Agents**:
   - "All other agents are first passes and untested"

4. **Preserve HumanLayer Guidance**:
   - "The prompts in the Human Layer derived chatmodes have a lot of specific guidance that comes from Human Layer's development and testing in production"
   - "They should be used as examples for the other agents, and there should not be guidance dropped from these agents"
   - Examples cited: "details about the set of steps to follow, the strong language about what the agent should not do, the 'important notes'"
   - "These are likely prompt components that were built from seeing the models (the use Claude) do something wrong, and guiding it to avoid the wrong thing"

### Current Branching and Workflow Process

From `paw-specification.md`:

**Branch Naming Conventions:**
- Target branch: `feature/<slug>` or `user/<username>/<slug>`
- Planning branch: `<target_branch>_plan`
- Implementation phase branches: `<target_branch>_phase<N>` or `<target_branch>_phase<M-N>`

**Artifact Locations:**
```
/docs/agents/<target_branch>/
  prompts/
    spec-research.prompt.md
    code-research.prompt.md
  Spec.md
  SpecResearch.md
  CodeResearch.md
  ImplementationPlan.md
  Docs.md
```

**Stage Flow:**
1. **Stage 01 - Specification**: Spec Agent + Spec Research Agent → produces Spec.md, SpecResearch.md
2. **Stage 02 - Implementation Plan**: Code Research Agent + Implementation Plan Agent → produces CodeResearch.md, ImplementationPlan.md, opens Planning PR
3. **Stage 03 - Phased Implementation**: Implementation Agent + Implementation Review Agent → opens Phase PRs
4. **Stage 04 - Documentation**: Documenter Agent → produces Docs.md, opens Docs PR
5. **Stage 05 - Final PR**: PR Agent → opens final PR to main

### Spec Research Agent vs Code Research Agent Distinction

**Spec Research Agent** (`PAW-01B`):
- Purpose: "describe how the system works today AND gather relevant external knowledge"
- Scope: Behavioral and architectural facts, NOT implementation details
- Output: Answers questions for specification writing
- Does NOT include: "Specific file paths or line numbers", "Implementation details or code structure"
- Key distinction stated in spec: "SpecResearch.md: Behavioral view for specification writing ('The authentication system requires email and password and returns a session token')"

**Code Research Agent** (`PAW-02A`):
- Purpose: Maps "WHERE and HOW" relevant code works
- Scope: File paths, line numbers, implementation details, code patterns
- Output: Technical mapping for implementation planning
- Key distinction stated in spec: "CodeResearch.md: Implementation view for planning ('Authentication is implemented in `auth/handlers.go:45` using bcrypt for password hashing')"

**However**, the current Code Research chatmode says:
```
## CRITICAL: YOUR ONLY JOB IS TO DOCUMENT AND EXPLAIN THE CODEBASE AS IT EXISTS TODAY
```

This aligns with the intention but doesn't explicitly reference that it's for *implementation planning* specifically vs behavioral understanding.

### Implementation Agent vs Implementation Review Agent Distinction

From `paw-specification.md`:

**Implementation Agent** (`PAW-03A`):
- Executes plan phases by making code changes
- Ensures quality by running automated checks
- Addresses review comments with focused commits
- Creates implementation branch if it doesn't exist

**Implementation Review Agent** (`PAW-03B`):
- Reviews code changes made by Implementation Agent
- Suggests improvements
- Generates docstrings and code comments for clarity/readability/maintainability
- Commits changes with clear messages
- Pushes implementation branch and opens Phase PRs
- When responding to review comments: reviews each change, replies comment-by-comment on PR, makes overall summary comment

**Key Insight from Issue #1:**
The split is based on empirical testing showing different model strengths:
- "GPT 5 Codex's code implementation to be preferred"
- "Claude Sonnet 4.5 was better at documenting code and making it more readable/maintainable"
- "Splitting into two agents gives the best of both worlds"

### Quality Standards and Guardrails in Proven Chatmodes

**Patterns to replicate:**

1. **CRITICAL/IMPORTANT prefixes** for non-negotiable requirements
2. **Explicit DO NOT lists** with 8-12 items preventing common mistakes
3. **Numbered workflows** with clear step sequences
4. **What not to do** sections after each major procedure
5. **Conditional logic** for different invocation scenarios (e.g., "When given X vs When given Y")
6. **Pause points** with formatted output templates for human handoffs
7. **File reading discipline**: "NEVER read files partially", "Use Read tool WITHOUT limit/offset"
8. **Context-first ordering**: "Read all mentioned files FULLY BEFORE proceeding"
9. **Metadata generation specifics**: Exact script names, filename formats, YAML frontmatter structures
10. **Role boundaries**: Clear statements of what the agent does NOT do (e.g., "DO NOT commit/push", "Status Agent does that")

## External Knowledge & Best Practices

### Standards & Guidelines

**Prompt Engineering for AI Agents:**

1. **Clarity and Specificity** - Use simple, direct language; avoid verbosity that dilutes effectiveness (PromptHub, 2024)
2. **Contextual Information** - Provide ample background and constraints; consistent context maintains accuracy (PromptHub, God of Prompt, 2025)
3. **Multi-Step Prompts** - Break complex tasks into smaller, manageable steps for better sequential processing (God of Prompt, 2025)
4. **Adaptive Prompts** - Self-adjusting systems based on user inputs reduce repetitive instructions (God of Prompt, 2025)
5. **Memory Management** - Cache system messages to reduce latency and costs (PromptHub, 2024)
6. **Iterative Refinement** - Continuously refine prompts based on testing and feedback (PromptHub, 2024)

**System Prompts vs User Instructions:**

1. **System Prompt Components** - Behavioral framing (role/personality), constraint setting (rules/limitations), context provision, ethical guidance (PromptLayer, PowerGentic, 2025)
2. **Purpose of System Prompts** - Establish consistent framework, ensure operation within parameters, provide reliable outputs (PromptLayer, Microsoft, 2025)
3. **Define Clear Roles** - Each agent should have distinct system prompt clarifying role, tone, and boundaries (Microsoft, 2025)
4. **Balance Instructions** - Avoid overloading user prompts with what should be in system prompts (PowerGentic, 2025)

**Preventing Hallucinations & Scope Creep:**

1. **Direct and Specific Prompts** - Clearly define task and limit scope; ask for sources; set refusal rules like "If you can't confirm, say 'I don't know'" (yW!an, OpenAI, 2024)
2. **Output Constraints** - System-level constraints to block inappropriate content or off-context responses (yW!an, 2024)
3. **Retrieval-Augmented Generation (RAG)** - Ground responses in verified documents and data sources (yW!an, 2024)
4. **Layered Verification** - Automated checks plus human-in-the-loop reviews to catch errors (yW!an, GeeksforGeeks, 2024)
5. **Rule-based Monitoring** - Algorithmic filters to detect anomalies in real-time (GeeksforGeeks, 2024)

**Structuring Do/Don't Guidance:**

1. **Be Unambiguous and Precise** - Vague language leads to unpredictable responses (Codecademy, Optimizely, 2024)
2. **Comprehensive Details** - Provide context to ensure full understanding and mitigate incorrect outputs (Codecademy, Atlassian, 2024)
3. **Avoid Sensitive Information** - Refrain from including private data (Codecademy, 2024)
4. **Use Natural Language** - Write as if conversing with a person (Atlassian, 2024)
5. **Role Definition and Context** - Clearly define AI's role and target audience (Optimizely, 2024)

### Comparable Patterns / Industry Norms

**Multi-Agent Workflow Handoffs:**

1. **Task Definition and Distribution** - Specify what must be accomplished and assign to capable agents (Strands Agents, 2024)
2. **Dependency Management**:
   - Sequential dependencies for ordered execution
   - Parallel execution for simultaneous tasks
   - Join points where parallel tasks converge (Strands Agents, 2024)
3. **Information Flow**:
   - Input/Output mapping between agents
   - Context preservation throughout workflow
   - State management for progress tracking and error recovery (Strands Agents, Microsoft, 2024)
4. **Artifact and State Communication**:
   - Central repository or message queue for storage/retrieval
   - Logging mechanisms to track state changes
   - Consistent naming and documentation conventions (ServiceNow, Microsoft Power Apps, 2024)
5. **Next Steps Definition**:
   - Clear exit conditions for each agent
   - Notifications/callbacks for downstream agents
   - Shared understanding of workflow status (Strands Agents, Microsoft, 2024)

**Technical Documentation Agents:**

1. **Adherence to Industry Standards** - Compliance with regulations like ISO/IEC 26514 for software documentation (Guidde, DataCalculus, 2024)
2. **Clarity and Accuracy** - Grammatical correctness, consistent terminology, clear language (DataCalculus, 2024)
3. **Interoperability and Usability** - Facilitate interoperability; be user-friendly (Guidde, 2024)
4. **Comprehensive Coverage** - Complete documentation of methods, properties, parameters; visual representations (GitHub Claude Agents, 2024)

**Code Review Agents:**

1. **Security and Compliance** - Integrate SAST/DAST checks; comply with HIPAA/PCI-DSS (Graphite, 2024)
2. **Traceability and Audit Trails** - Maintain timestamps, reviewer IDs, changes made (Graphite, 2024)
3. **Automated and Consistent Checks** - AI tools for repeatable feedback; supplement with human oversight (Graphite, Microsoft Agent Governance, 2024)
4. **Coding Standards Enforcement** - Linters and static analyzers for consistency (Graphite, 2024)
5. **Role-Based Access Control** - RBAC to prevent unauthorized merges (Graphite, 2024)

### Source Citations

1. **Prompt Engineering for AI Agents** – PromptHub https://www.prompthub.us/blog/prompt-engineering-for-ai-agents (accessed 2025-10-11)
2. **Prompt Engineering Evolution: Adapting to 2025 Changes** – God of Prompt https://www.godofprompt.ai/blog/prompt-engineering-evolution-adapting-to-2025-changes (accessed 2025-10-11)
3. **Prompt Engineering For Advanced Multi-Agent AI Prompting** – Forbes https://www.forbes.com/sites/lanceeliot/2025/03/01/prompt-engineering-for-advanced-multi-agent-ai-prompting/ (accessed 2025-10-11)
4. **System Prompt vs User Prompt in AI: What's the difference?** – PromptLayer https://blog.promptlayer.com/system-prompt-vs-user-prompt-a-comprehensive-guide-for-ai-prompts/ (accessed 2025-10-11)
5. **The Hidden Architecture of AI Conversations: System Prompts vs. User Prompts** – PowerGentic https://powergentic.beehiiv.com/p/the-hidden-architecture-of-ai-conversations-system-prompts-vs-user-prompts (accessed 2025-10-11)
6. **How do I control how my agent responds?** – Microsoft Community Hub https://techcommunity.microsoft.com/blog/azuredevcommunityblog/how-do-i-control-how-my-agent-responds/4426547 (accessed 2025-10-11)
7. **The AI Hallucination Reduction Playbook** – yW!an https://www.ywian.com/blog/ai-hallucination-reduction-playbook (accessed 2024)
8. **Developing Hallucination Guardrails** – OpenAI https://cookbook.openai.com/examples/developing_hallucination_guardrails (accessed 2024)
9. **What are AI Guardrails?** – GeeksforGeeks https://www.geeksforgeeks.org/artificial-intelligence/what-are-ai-guardrails/ (accessed 2024)
10. **The Do's and Don'ts of Writing AI Prompts** – Codecademy https://www.codecademy.com/resources/blog/ai-prompt-engineering-tips (accessed 2024)
11. **How to write 10/10 AI instructions** – Optimizely https://www.optimizely.com/insights/blog/how-to-write-ai-instructions/ (accessed 2024)
12. **The ultimate guide to writing effective AI prompts** – Atlassian https://www.atlassian.com/blog/artificial-intelligence/ultimate-guide-writing-ai-prompts (accessed 2024)
13. **Workflow - Strands Agents** – Strands Agents https://strandsagents.com/latest/documentation/docs/user-guide/concepts/multi-agent/workflow/ (accessed 2024)
14. **AI Agents: The Multi-Agent Design Pattern - Part 8** – Microsoft Tech Community https://techcommunity.microsoft.com/blog/educatordeveloperblog/ai-agents-the-multi-agent-design-pattern---part-8/4402246 (accessed 2024)
15. **Migrate Legacy Workflows to Flows and Playbooks** – ServiceNow https://www.servicenow.com/community/workflow-automation-articles/migrate-legacy-workflows-to-flows-and-playbooks-workflow/ta-p/3132026 (accessed 2024)
16. **Configure real-time workflow stages and steps in Power Apps** – Microsoft https://learn.microsoft.com/en-us/power-apps/maker/data-platform/configure-workflow-steps (accessed 2024)
17. **A Guide to Industry-specific Standards and Regulations for Technical Writing** – Guidde https://www.guidde.com/blog/a-guide-to-industry-specific-standards-and-regulations-for-technical-writing (accessed 2024)
18. **Ensuring Compliance with Industry Standards in Documentation** – DataCalculus https://datacalculus.com/en/blog/writing-and-editing/technical-editor/ensuring-compliance-with-industry-standards-in-documentation (accessed 2024)
19. **Claude Code Agents Documentation** – GitHub https://github.com/lelandg/ClaudeAgents/blob/main/Claude-Code-Agents-Documentation.md (accessed 2024)
20. **Code review in regulated industries: Best practices for compliance** – Graphite https://graphite.dev/guides/regulated-industry-code-review-best-practices (accessed 2024)
21. **Agent Governance Whitepaper** – Microsoft https://adoption.microsoft.com/files/copilot-studio/Agent-governance-whitepaper.pdf (accessed 2024)

## Evidence

### Internal File References

- `/home/rob/proj/paw/phased-agent-workflow/.github/chatmodes/PAW-01A Spec Agent.chatmode.md` - 686-line detailed spec agent with extensive guardrails
- `/home/rob/proj/paw/phased-agent-workflow/.github/chatmodes/PAW-01B Spec Research Agent.chatmode.md` - Research agent with internal/external knowledge separation
- `/home/rob/proj/paw/phased-agent-workflow/.github/chatmodes/PAW-02A Code Researcher.chatmode.md` - HumanLayer-derived with comprehensive DO NOT lists and numbered workflows
- `/home/rob/proj/paw/phased-agent-workflow/.github/chatmodes/PAW-02B Impl Planner.chatmode.md` - 437-line planning agent
- `/home/rob/proj/paw/phased-agent-workflow/.github/chatmodes/PAW-03A Implementer.chatmode.md` - HumanLayer-derived with conditional logic and pause points
- `/home/rob/proj/paw/phased-agent-workflow/.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md` - Empty (0 bytes)
- `/home/rob/proj/paw/phased-agent-workflow/.github/chatmodes/PAW-04 Documenter.chatmode.md` - Empty (0 bytes)
- `/home/rob/proj/paw/phased-agent-workflow/.github/chatmodes/PAW-05 PR.chatmode.md` - Empty (0 bytes)
- `/home/rob/proj/paw/phased-agent-workflow/.github/chatmodes/PAW-X Status Update.chatmode.md` - 59-line status agent
- `/home/rob/proj/paw/phased-agent-workflow/paw-specification.md` - Comprehensive PAW specification (35KB)
- `/home/rob/proj/paw/phased-agent-workflow/README.md` - Project overview
- GitHub Issue #1: https://github.com/lossyrob/phased-agent-workflow/issues/1

### External Source List

See "Source Citations" section above for full list of 21 external sources covering prompt engineering best practices, multi-agent workflows, documentation standards, and code review patterns.

## Open Unknowns

None. All internal questions from the spec-research.prompt.md have been answered through file exploration and specification review. All external knowledge questions have been answered through web search with authoritative sources cited.
