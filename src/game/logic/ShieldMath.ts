/**
 * Pure shield-math functions.  No ECS / DOM dependencies — fully unit-testable.
 */

/** Seconds required to recharge a single shield layer when powered. */
const RECHARGE_TIME = 2.0;

/**
 * Returns the maximum number of shield layers granted by the given allocated power.
 *
 * FTL rule: 2 power = 1 layer, 4 power = 2 layers, etc.
 * Odd power values yield the same result as the previous even value —
 * e.g. 1 or 3 power → 0 or 1 layer respectively.
 *
 * @param allocatedPower  Power currently routed to the SHIELDS system (integer ≥ 0).
 */
export function calculateMaxShields(allocatedPower: number): number {
  return Math.floor(allocatedPower / 2);
}

/**
 * Advances shield recharge by one simulation step.
 *
 * - Shields recharge at a rate of 1 layer per RECHARGE_TIME seconds.
 * - `currentShields` is stored as a float so fractional progress accumulates
 *   across frames without needing a separate progress variable.
 * - If unpowered or already at max, the value is returned unchanged.
 * - Result is clamped to [currentShields, maxShields].
 *
 * @param currentShields  Current (possibly fractional) shield level.
 * @param maxShields      Upper bound from calculateMaxShields.
 * @param isPowered       Whether the SHIELDS system has any power allocated.
 * @param dt              Elapsed seconds since the last frame.
 */
export function rechargeShields(
  currentShields: number,
  maxShields: number,
  isPowered: boolean,
  dt: number,
): number {
  if (!isPowered || currentShields >= maxShields) return currentShields;
  return Math.min(maxShields, currentShields + dt / RECHARGE_TIME);
}
