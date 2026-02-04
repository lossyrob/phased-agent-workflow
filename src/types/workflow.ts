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
 * Final Agent Review mode - determines whether and how pre-PR review runs.
 */
export type FinalReviewMode = "disabled" | "single-model" | "multi-model";
