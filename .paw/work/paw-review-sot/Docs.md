# SoT Review Mode for PAW Review

## Overview

Society-of-thought (SoT) review mode brings multi-perspective specialist evaluation to PAW Review's Evaluation Stage. When enabled via `review_mode: society-of-thought` in ReviewContext.md, the workflow invokes the `paw-sot` engine instead of running sequential `paw-review-impact` → `paw-review-gap`, replacing both with a unified specialist evaluation that produces confidence-weighted synthesized findings.

This follows the same adapter pattern used by `paw-final-review`: construct a review context from the configuration source, invoke `paw-sot`, and map output back into the downstream pipeline.

## Architecture and Design

### Adapter Pattern

The implementation is a thin adapter in `paw-review-workflow` that:
1. Reads `Review Mode` from ReviewContext.md
2. If `society-of-thought`: constructs a paw-sot review context (type: diff, coordinates from PR diff + understanding artifacts) and loads paw-sot directly into the session
3. If `single-model` (default): runs existing impact → gap sequence unchanged

This mirrors `paw-final-review`'s adapter but sources configuration from ReviewContext.md instead of WorkflowContext.md.

### Design Decisions

**Why merge Impact + Gap into SoT?** The SoT specialists already cover impact concerns (architecture, security, performance specialists). Running a separate impact analysis would be redundant and create conflicting findings. A single unified evaluation is cleaner.

**Why `interactive: false` as default?** Unlike `paw-final-review` which has an interactive resolution phase (apply/skip/discuss), PAW Review feeds findings into an automated comment pipeline. Setting `interactive: smart` would trigger moderator mode, which has no natural integration point in the review workflow. Moderator mode is deferred as a future enhancement.

**Why adapt prerequisites instead of the pipeline?** The feedback/critic skills' generation logic doesn't change — only their input sources do. Updating prerequisites is minimal and backward-compatible.

### Integration Points

- **paw-sot**: Loaded into the workflow orchestrator session (not as subagent) per paw-sot's contract
- **paw-review-feedback**: Accepts REVIEW-SYNTHESIS.md as alternative evaluation input with severity mapping
- **paw-review-critic**: Accepts REVIEW-SYNTHESIS.md as alternative supporting artifact
- **paw-review-correlation**: Accepts mode-dependent evaluation artifacts for cross-repo analysis

## User Guide

### Configuration

SoT configuration fields in ReviewContext.md (populated from invocation parameters):

| Field | Values | Default |
|-------|--------|---------|
| Review Mode | `single-model`, `society-of-thought` | `single-model` |
| Review Specialists | `all`, comma-separated names, `adaptive:<N>` | `all` |
| Review Interaction Mode | `parallel`, `debate` | `parallel` |
| Review Interactive | `true`, `false`, `smart` | `false` |
| Review Specialist Models | `none`, model pool, pinned pairs, mixed | `none` |

### Severity Mapping

SoT findings map to the comment pipeline:
- `must-fix` → Must
- `should-fix` → Should
- `consider` → Could
- Trade-offs → Should with `[Trade-off]` prefix
- Observations → excluded (contextual-tier, not actionable)

### Artifacts

SoT mode produces `REVIEW-{SPECIALIST}.md` per specialist and `REVIEW-SYNTHESIS.md` in the review artifact directory. These replace `ImpactAnalysis.md` and `GapAnalysis.md` for the review session.

## Limitations and Future Work

- **Moderator mode**: Not available for PAW Review (deferred; `interactive` defaults to `false`)
- **Multi-model for PAW Review**: Separate feature; only SoT is supported as an alternative evaluation mode
- **Custom specialists**: Uses paw-sot's built-in specialists with 4-level discovery; no PAW Review-specific personas
