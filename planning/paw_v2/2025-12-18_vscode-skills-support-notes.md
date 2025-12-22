# PAW Refactor Design Context

## Purpose of this document

This document captures the current design thinking around refactoring **PAW (Phased Agent Workflow)** in light of emerging Copilot / Agent Skills support, while preserving PAW’s original UX goals. It is intended as *context for continued deliberation*, not as a final design decision.

The core tension being explored is:

* **Avoiding per-workspace installation burden** (one of PAW’s original motivations), while
* **Enabling PAW capabilities to surface to GitHub / Copilot coding agents** that only read repository state.

---

## Key constraints and realities

### 1. Agent Skills are workspace-scoped

* Copilot’s Agent Skills mechanism only discovers skills from the workspace (e.g. `.github/skills`).
* There is no first-class support today for *user-level / global* skills that apply across projects.

### 2. Custom agents *do* support user-level installation

* VS Code supports custom agents installed in the **user profile** (system-wide), as well as workspace-level agents under `.github/agents`.
* This aligns with PAW’s existing direction: install once, use everywhere.

### 3. No precedence control in the agent picker

* If both a user-level PAW agent and a workspace-level PAW agent exist, **both will appear**.
* There is no programmatic precedence mechanism; the best available tools are:

  * naming conventions
  * documentation
  * user ability to hide agents in the UI

---

## High-level architectural idea

PAW becomes a system with **two installation targets**, serving different needs:

1. **System-wide PAW (default)** – optimized for the individual developer experience
2. **Workspace-installed PAW (optional)** – optimized for portability, collaboration, and GitHub/Copilot-native agents

These two targets are related but intentionally *not identical* in how they load skills.

---

## Target A: System-wide PAW (VS Code extension–managed)

### Installation model

* Installed and updated automatically by the VS Code extension
* Lives entirely in **user directories**
* No workspace modification required

### Agent

* A user-level custom agent (e.g. `PAW`)
* Available in *any* workspace
* Acts as the primary interactive orchestrator

### Skills loading

* Skills are **not stored in the workspace**
* The PAW agent loads skills dynamically via **PAW tool calls**

  * e.g. from a user-level PAW registry, cache, or packaged resources
* This preserves:

  * zero setup per project
  * consistent behavior across repos
  * automatic upgrades with extension updates

### Strengths

* Best UX for individual users
* No repo pollution
* No need to run install/update commands per project

### Limitations

* GitHub-hosted coding agents or Copilot features that only read repo state cannot see PAW skills

---

## Target B: Workspace-installed PAW (explicit opt-in)

### Installation model

* Triggered by a command (e.g. `PAW: Install into Workspace`)
* Writes files into the repository
* Versioned / pinned until explicitly updated

### Purpose

* Make PAW capabilities visible to:

  * GitHub coding agents
  * Copilot features that only consume workspace artifacts
  * teammates who don’t have the PAW extension installed

---

## Workspace-installed PAW: two components

### 1. Workspace skills (primary)

* PAW skills are exported into `.github/skills/paw-*`
* Each skill follows the Agent Skills format (e.g. `SKILL.md` + optional resources)
* These skills:

  * are auto-discovered by Copilot
  * load progressively
  * do *not* require a PAW-specific agent to exist

**Important idea:**

> In many cases, *skills-only export may be sufficient*, avoiding the need for a workspace PAW agent entirely.

---

### 2. Optional workspace PAW sub-agent (secondary)

If needed, PAW may also export:

* a workspace-scoped custom agent under `.github/agents`

Key characteristics:

* **Distinct name** from the system-wide PAW agent

  * e.g. `PAW (Workspace)` or `PAW Project Agent`
* Intended primarily for:

  * GitHub coding agents
  * repo-specific automation

This separation allows:

* users to hide the workspace agent when they prefer the system PAW
* reduced confusion when both agents exist

---

## Agent separation and naming strategy

### Why separation matters

* System-wide PAW and workspace PAW behave differently
* They load skills differently
* They have different upgrade lifecycles

### Proposed conceptual split

| Agent                       | Scope | Skills source                     | Upgrade path                  |
| --------------------------- | ----- | --------------------------------- | ----------------------------- |
| PAW (system)                | User  | Loaded dynamically via tool calls | Automatic (extension updates) |
| PAW (workspace / sub-agent) | Repo  | `.github/skills`                  | Manual / command-driven       |

### Naming goals

* Make it obvious which agent is:

  * global vs project-specific
* Make it easy for users to:

  * hide the workspace agent when redundant
  * understand which one Copilot/GitHub is using

---

## Workspace lifecycle and updates

### Problem

* System-wide PAW updates automatically
* Workspace-installed PAW does *not*

### Proposed solution

When installing into a workspace, PAW also writes a small manifest file (location TBD), containing:

* PAW version / schema version
* Which skills were exported
* Source version (extension version or tag)

Commands:

* `PAW: Install into Workspace`
* `PAW: Update Workspace PAW`
* `PAW: Remove Workspace PAW`

This makes workspace installs:

* explicit
* auditable
* intentionally pinned

---

## Design questions still open

This document intentionally leaves these unresolved:

1. Is a workspace PAW *agent* ever strictly required, or can skills-only export cover most cases?
2. How granular should PAW skills be when exported?

   * one skill per phase?
   * one skill per workflow?
3. How much divergence is acceptable between:

   * system PAW behavior
   * workspace PAW behavior?
4. What naming conventions minimize confusion without feeling clunky?

---

## Summary

The emerging direction is **not** “PAW becomes a GitHub-skills-first system,” but rather:

> PAW remains a system-wide, extension-installed workflow agent by default, while gaining the *ability to project its capabilities into a workspace* when portability and GitHub integration matter.

This dual-target approach preserves PAW’s original UX goals while opening a path to deeper Copilot and GitHub agent interoperability.
