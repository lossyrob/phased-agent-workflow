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
 * - manual → always (always pause for review)
 * - semi-auto → milestones (pause at key milestones)
 * - auto → never (no review pauses)
 *
 * @param handoffMode - The legacy handoff mode value
 * @returns Corresponding Review Policy value
 */
export function mapHandoffModeToReviewPolicy(
  handoffMode: HandoffMode
): ReviewPolicy {
  switch (handoffMode) {
    case "manual":
      return "always";
    case "semi-auto":
      return "milestones";
    case "auto":
      return "never";
    default:
      return "milestones";
  }
}
