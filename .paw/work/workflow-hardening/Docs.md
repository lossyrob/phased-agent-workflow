# Workflow Hardening

## Overview

This work hardens PAW and PAW Review around durable control-plane state. Instead of relying on prompt memory and artifact inference alone, current workflows embed compact `## Hardened State` sections in `WorkflowContext.md` and `ReviewContext.md`, mirror active required items into the built-in TODO surface, and reconcile that state before transitions, handoff, status, or external mutation.

The design keeps the existing artifact model and runtime split intact. It does not introduce a new database or standalone worklist file. Existing Markdown artifacts remain authoritative, while the extension continues to act as configuration/status plumbing around the same agent runtime contract used by Copilot CLI.

## Architecture and Design

### High-Level Architecture

- Implementation workflow state lives in `WorkflowContext.md`.
- Review workflow state lives in `ReviewContext.md`.
- Built-in TODOs mirror active required items for execution convenience, but the embedded control state is the durable source of truth.
- `ReviewComments.md` remains the full feedback history, while `ReviewContext.md` carries terminal external-review state such as pending review creation or manual-posting guidance.
- CLI continues to execute `agents/`, `skills/`, and prompt content directly; VS Code `src/` surfaces collect, preserve, and relay the same contract rather than executing hidden workflow logic.

### Design Decisions

| Decision | Reason |
| --- | --- |
| Embed hardened state inside existing context artifacts | Keeps the durable contract portable without creating new workflow files |
| Detect hardened mode by section presence | Avoids separate migration flags and keeps old artifacts readable |
| Mirror active work into TODOs | Preserves the in-session execution surface without treating TODOs as durable state |
| Persist review terminal outcomes in `ReviewContext.md` | Lets resume and status surfaces report whether a pending review already exists |
| Enforce exact configured procedures | Prevents silent fallback from configured SoT or multi-model flows to something else |

### Integration Points

| Surface | Responsibility |
| --- | --- |
| `paw-init` / `paw-review-understanding` | Seed hardened workflow and review state |
| `paw-transition` / `paw-status` | Reconcile embedded state with artifacts, git, and PR reality |
| `paw-planning-docs-review` / `paw-final-review` / `paw-review-workflow` | Resolve configured procedures only when the configured mode actually runs |
| `paw-review-github` | Persist terminal external-review outcomes back into `ReviewContext.md` |
| VS Code `userInput` / `initializeWorkItem` | Preserve planning/final review configuration, including SoT settings |
| VS Code `getWorkStatus` / `handoffTool` / `stopTrackingArtifacts` | Resume from artifact state, report legacy mode explicitly, and preserve hardened state while updating lifecycle metadata |

## User Guide

### Prerequisites

- Use PAW agents and skills that understand the embedded hardened-state contract.
- Keep `WorkflowContext.md` or `ReviewContext.md` available when resuming work manually so the next session can reconcile state from the artifact.

### Basic Usage

1. Start or resume a workflow normally.
2. The agent reads `WorkflowContext.md` or `ReviewContext.md` first.
3. If a `## Hardened State` section is present, the agent uses it as the durable workflow/review state and mirrors active required items into TODOs.
4. If the section is absent, the agent continues in legacy best-effort mode and says so explicitly.

### Advanced Usage

- Planning-docs review and final review configuration now preserve the full configured mode in `WorkflowContext.md`, including society-of-thought specialist, interaction, and perspective settings.
- Manual or non-GitHub review posting records a terminal marker in `ReviewContext.md`, so resumed sessions can tell whether a pending review already exists or manual-posting guidance was already produced.
- Mid-workflow stop-tracking updates only the `Artifact Lifecycle:` field and preserves the hardened-state block unchanged.

## API Reference

### Key Components

| Component | Role |
| --- | --- |
| `skills/paw-workflow/references/control-state-contract.md` | Shared workflow control-state contract for `WorkflowContext.md` |
| `skills/paw-review-workflow/references/control-state-contract.md` | Shared review control-state contract for `ReviewContext.md` |
| `skills/paw-transition/SKILL.md` | Mandatory transition and preflight reconciliation |
| `skills/paw-status/SKILL.md` | Reconciled workflow status and legacy-mode reporting |
| `skills/paw-review-workflow/SKILL.md` | Review stage sequencing and procedure gating |
| `skills/paw-review-github/SKILL.md` | Terminal external-review persistence |
| `src/types/workflow.ts` | VS Code-facing workflow/review configuration types |
| `src/ui/userInput.ts` | Review configuration collection, including SoT options |
| `src/commands/initializeWorkItem.ts` | Propagates full planning/final review contract into initialization |
| `src/commands/getWorkStatus.ts` / `src/tools/handoffTool.ts` | Resume/status prompts that read hardened state first |

### Configuration Options

- Hardened behavior is inferred from embedded state presence. There is no separate workflow-type flag.
- `Planning Review Mode` and `Final Review Mode` use the same mode family: `single-model`, `multi-model`, or `society-of-thought`.
- Society-of-thought configuration includes specialists, interaction mode, specialist model selection, perspectives, and perspective cap.
- `Artifact Lifecycle` still controls whether `.paw/work/` artifacts are committed, but the lifecycle decision is now part of the same durable workflow contract.

## Testing

### How to Test

1. Initialize a new workflow and confirm `WorkflowContext.md` contains a `## Hardened State` section.
2. Initialize a review and confirm `ReviewContext.md` contains review-stage and terminal-state placeholders.
3. Run status or handoff/resume flows and confirm blocked items, pending review state, or legacy mode are reported consistently.
4. Configure planning-docs review or final review as `society-of-thought` and confirm the exact settings remain serialized in `WorkflowContext.md`.
5. Post or prepare review output and confirm terminal review state survives a resumed session.

### Edge Cases

- Older workflows and reviews without hardened state still run, but only in legacy best-effort mode.
- TODOs are an execution mirror; if they drift or are cleared, agents can rebuild them from the embedded state.
- Non-GitHub review flows record manual-posting guidance instead of GitHub review IDs.
- Configured procedures that cannot run stay blocked; the workflow does not silently switch to a different mode.

## Limitations and Future Work

- This work does not address PAW Review self-delegation or a broader concurrent review ownership protocol.
- Existing in-flight workflows are not auto-migrated; older artifacts stay in legacy best-effort mode until recreated or reseeded by current flows.
- The design intentionally avoids optimization-only additions such as extra freshness matrices or a separate workflow database.
