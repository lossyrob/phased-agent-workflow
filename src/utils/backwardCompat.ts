/**
 * Backward compatibility utilities for PAW workflow migration.
 *
 * These utilities support the transition from legacy terminology
 * (e.g., "Handoff Mode") to current terminology (e.g., "Review Policy").
 *
 * @module utils/backwardCompat
 */

import type { HandoffMode, ReviewPolicy } from "../types/workflow";

/**
 * Maps legacy Handoff Mode values to Review Policy values.
 *
 * The mapping is:
 * - manual → every-stage (pause at every stage)
 * - semi-auto → milestones (pause at key milestones)
 * - auto → final-pr-only (only pause at final PR)
 *
 * @param handoffMode - The legacy handoff mode value
 * @returns Corresponding Review Policy value
 */
export function mapHandoffModeToReviewPolicy(
  handoffMode: HandoffMode
): ReviewPolicy {
  switch (handoffMode) {
    case "manual":
      return "every-stage";
    case "semi-auto":
      return "milestones";
    case "auto":
      return "final-pr-only";
    default:
      return "milestones";
  }
}

/**
 * Maps legacy Review Policy values to current values.
 *
 * The mapping is:
 * - always → every-stage
 * - never → final-pr-only
 *
 * @param policy - The legacy review policy value
 * @returns Corresponding current Review Policy value
 */
export function mapLegacyReviewPolicy(
  policy: string
): ReviewPolicy {
  switch (policy) {
    case "always":
      return "every-stage";
    case "never":
      return "final-pr-only";
    case "every-stage":
      return "every-stage";
    case "final-pr-only":
      return "final-pr-only";
    case "milestones":
      return "milestones";
    case "planning-only":
      return "planning-only";
    default:
      return "milestones";
  }
}
