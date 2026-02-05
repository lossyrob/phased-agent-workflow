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
export type ReviewPolicy = "always" | "milestones" | "planning-only" | "never";

/**
 * Valid Session Policy values for context management.
 */
export type SessionPolicy = "per-stage" | "continuous";

/**
 * Final Agent Review mode - determines how pre-PR review runs when enabled.
 */
export type FinalReviewMode = "single-model" | "multi-model";
