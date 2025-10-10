# PAW - A Coding Agent Development Workflow

**Phased Agent Workflow** (PAW) is a structured, multi-phase development practice that transforms feature ideas into production-ready code using AI coding agents with human oversight at critical decision points. Built on GitHub Copilot Agent Mode in VS Code, PAW guides you from initial specification through research, planning, implementation, and documentation—with each phase producing durable artifacts that feed the next. By leveraging GitHub Pull Requests at every implementation step, PAW enables efficient human review and iteration on AI-generated code, helping you maintain high quality standards and avoid AI slop. Every phase is traceable, rewindable, and version-controlled, giving you the clarity to iterate intelligently and the confidence to restart from any layer when context drifts. PAW empowers engineers to deliver fast, high-quality contributions by focusing human attention on high-leverage decision points—refining specifications, reviewing implementation plans, and guiding code at critical junctures—while AI agents handle the systematic execution.

PAW is a system of *collaborating AI chat modes* that emulate the human software development lifecycle — each agent produces durable artifacts (specs, research docs, plans, PRs, and documentation).
The process emphasizes **clarity, traceability, and recoverability**, letting developers iterate intelligently and “rewind” if context or quality drift occurs.

### Agents

1. **Spec Agent** — turns a rough GitHub Issue into a refined feature specification and prompts for system research.
2. **Spec Research Agent** — documents how the current system behaves (facts only, no design).
3. **Code Research Agent** — maps relevant code areas and dependencies.
4. **Implementation Plan Agent** — writes a detailed, multi-phase plan of work.
5. **Implementation Agents** — executes plan phases, managing commits, PRs, and review loops. Split into two steps to allow agentic review and documentation improvements.
6. **Documenter Agent** — creates technical and user documentation post-implementation.
7. **PR/Status Agent** — maintains GitHub Issues and PR descriptions, ensuring everything stays in sync and clear.

### Characteristics

* **Layered, iterative flow** — each artifact feeds the next.
* **Rewindable** — any phase can restart cleanly if an upstream document is wrong or incomplete.
* **Transparent** — every output is text-based and version-controlled in Git.
* **Collaborative** — humans guide, agents execute and record progress.
* **Toolchain** — GitHub, VS Code, GitHub Copilot Agent Mode, markdown artifacts.

## Requirements

- GitHub
- VS Code with GitHub Copilot
- GitHub MCP Tools

## Getting Started

- Copy the .github/chatmodes into your repository's `.github/chatmodes` folder. This will make them available in VS Code's Github Copilot chat.
- Follow the workflow as laid out in the [PAW Specification](paw-specification.md).

## Credits

Inspired by Dex Horthy's "Advanced Context Engineering for Coding Agents" [talk](https://youtu.be/IS_y40zY-hc?si=27dVJV7LlYDh7woA) and [writeup](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/ace-fca.md). Original agent prompts adapted from HumanLayer's [Claude subagents and commands](https://github.com/humanlayer/humanlayer/tree/main/.claude).

