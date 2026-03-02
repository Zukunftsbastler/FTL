/**
 * Pure weapon-charge function.  No ECS / DOM dependencies — fully unit-testable.
 */

/**
 * Advances a weapon's charge by one simulation step.
 *
 * - If the weapon is not powered, the charge is frozen (no increase, no decrease).
 * - Charge increases at a rate of 1 unit per second so that `maxCharge` equals the
 *   weapon's cooldown in seconds, multiplied by `rateMultiplier`.
 * - Result is clamped to [0, maxCharge].
 *
 * @param currentCharge   Current charge level (0 … maxCharge).
 * @param maxCharge       Full charge = ready to fire (equals weapon cooldown in seconds).
 * @param isPowered       Whether the weapon has reactor power allocated to it.
 * @param dt              Elapsed seconds since the last frame.
 * @param rateMultiplier  Charge-speed multiplier from manning buffs (default 1.0).
 */
export function calculateWeaponCharge(
  currentCharge: number,
  maxCharge: number,
  isPowered: boolean,
  dt: number,
  rateMultiplier = 1.0,
): number {
  if (!isPowered) return currentCharge;
  return Math.min(maxCharge, currentCharge + dt * rateMultiplier);
}
