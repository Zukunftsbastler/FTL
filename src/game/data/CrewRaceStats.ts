import type { CrewRace } from './CrewRace';

/** Racial stat block loaded from data/crew_stats.json. */
export interface CrewRaceStats {
  readonly race: CrewRace;
  readonly name: string;
  readonly maxHealth: number;
  /** Multiplier applied to base movement speed (CREW_SPEED). */
  readonly movementSpeed: number;
  /** Multiplier applied to base repair rate. */
  readonly repairSpeed: number;
  /** Multiplier applied to base combat damage. */
  readonly combatDamage: number;
  /** Multiplier applied to fire damage taken (0.0 = immune). */
  readonly fireDamageMultiplier: number;
  /** Multiplier applied to suffocation damage taken (0.0 = immune). */
  readonly suffocationMultiplier: number;
  readonly specialAbilities: readonly string[];
}
