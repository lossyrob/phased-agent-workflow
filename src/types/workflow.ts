/**
 * Shared workflow type definitions for PAW extension.
 *
 * @module types/workflow
 */

/**
 * Valid handoff mode values for stage navigation (legacy).
 */
export type HandoffMode = "manual" | "semi-auto" | "auto";

/**
 * Valid Review Policy values for artifact-level pause decisions.
 */
export type ReviewPolicy = "every-stage" | "milestones" | "planning-only" | "final-pr-only";

/**
 * Valid Session Policy values for context management.
 */
export type SessionPolicy = "per-stage" | "continuous";

/**
 * Final Agent Review mode - determines how pre-PR review runs when enabled.
 */
export type ReviewMode = "single-model" | "multi-model" | "society-of-thought";

/**
 * Final Agent Review mode - determines how pre-PR review runs when enabled.
 */
export type FinalReviewMode = ReviewMode;

/**
 * Planning review mode mirrors final review mode values.
 */
export type PlanningReviewMode = ReviewMode;

/**
 * Review specialist selection as passed through to paw-init.
 * Allowed values are validated by the agent (for example `all`, `adaptive:3`, or a comma list).
 */
export type ReviewSpecialistSelection = string;

/**
 * Review interaction mode for society-of-thought specialist execution.
 */
export type ReviewInteractionMode = "parallel" | "debate";

/**
 * Review perspective selection as passed through to paw-init.
 * Allowed values are validated by the agent (for example `none`, `auto`, or a comma list).
 */
export type ReviewPerspectiveSelection = string;

/**
 * Shared review configuration used by VS Code initialization surfaces.
 */
export interface ReviewConfig {
  /** Whether the review surface is enabled */
  enabled: boolean;

  /** Exact configured review procedure */
  mode: ReviewMode;

  /** Whether the review is interactive, auto-apply, or smart */
  interactive: boolean | "smart";

  /** Model pool for single-model or multi-model review */
  models?: string;

  /** Society-of-thought specialist selection */
  specialists?: ReviewSpecialistSelection;

  /** Society-of-thought interaction mode */
  interactionMode?: ReviewInteractionMode;

  /** Optional specialist-specific model pool or pinning rules */
  specialistModels?: string;

  /** Perspective selection */
  perspectives?: ReviewPerspectiveSelection;

  /** Maximum perspectives to apply per specialist */
  perspectiveCap?: number;
}
