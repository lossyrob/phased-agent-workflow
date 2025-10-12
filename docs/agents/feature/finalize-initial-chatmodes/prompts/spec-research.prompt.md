# Spec Research Prompt: Finalize Initial Agent Chatmodes
Perform research to answer the following questions.

Target Branch: feature/finalize-initial-chatmodes
GitHub Issue: #1
Additional Inputs: paw-specification.md, README.md, existing chatmode files in .github/chatmodes/

## Questions

### Internal System

1. What is the complete structure and content of each existing chatmode file (.github/chatmodes/PAW-*.chatmode.md)? What sections, guidance patterns, and instructions does each contain?

2. What specific guidance patterns appear in the Human Layer-derived chatmodes (PAW-02A Code Researcher, PAW-03A Implementer) that don't appear in other chatmodes? (e.g., "CRITICAL:", "Important notes:", step-by-step numbered workflows, explicit "what not to do" sections)

3. How do the current chatmodes differ from the agent descriptions in paw-specification.md? What responsibilities or guidance are missing, inconsistent, or misaligned?

4. What are the specific concerns raised in Issue #1 about current chatmodes? (e.g., Code Researcher's line-number focus potentially being too burdensome, untested chatmodes, splitting Implementer into two agents)

5. What is the current branching and workflow process described in paw-specification.md that the chatmodes need to support? What artifacts do they create/consume at each stage?

6. How do the Spec Research Agent and Code Research Agent differ in their responsibilities, outputs, and when they're invoked in the workflow?

7. What are the exact responsibilities that distinguish the Implementation Agent from the Implementation Review Agent based on the PAW specification and Issue #1 notes?

8. What quality standards and guardrails appear in the proven chatmodes that should be replicated across all agents?

### External Knowledge & Standards

1. What are industry best practices for structuring AI agent prompts to ensure clarity, consistency, and reliable behavior? (Focus on prompt engineering patterns for agent systems)

2. What are established patterns for "system prompts" vs "user instructions" in AI agent design, particularly for multi-agent workflows?

3. What are recommended approaches for preventing AI agents from hallucinating or going beyond their defined scope? (Focus on guardrails and constraint patterns)

4. What are best practices for structuring "do/don't" guidance in AI prompts to maximize adherence?

5. What are proven patterns for agent handoffs in multi-stage workflows? How should agents communicate about artifacts, state, and next steps?

6. What are industry standards for technical documentation agents and code review agents? What capabilities and constraints should they have?

7. What are best practices for prompt versioning, iteration, and quality assessment when building agent systems? (optional)

## Notes for Research Agent

- Cite internal behavior factually (no code line refs required at this stage)
- Cite external authoritative sources (Title – URL) or mark assumptions
- If no external search: add a "User-Provided External Knowledge" checklist
