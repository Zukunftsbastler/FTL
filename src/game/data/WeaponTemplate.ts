import type { WeaponType } from './WeaponType';

/** Raw JSON blueprint for a weapon. Matches the schema in docs/api/DATA_SCHEMA.md exactly. */
export interface WeaponTemplate {
  /** Unique identifier used to look up this weapon at runtime. */
  id: string;
  name: string;
  type: WeaponType;

  /** Reactor power required to equip and charge this weapon. */
  powerCost: number;

  /** Seconds from 0 charge to ready-to-fire (also equals maxCharge). */
  cooldown: number;

  /** Number of projectiles fired per shot (e.g. 3 for Burst Laser II). */
  projectiles: number;

  damage: {
    hull: number;    // damage applied to the ship's hull
    system: number;  // damage applied to system max-capacity
    ion: number;     // ion damage (temporary power disruption)
    crew: number;    // direct crew damage in target room
  };

  /** Probability of starting a fire in the target room (0–1). */
  fireChance: number;
  /** Probability of causing a hull breach (0–1). */
  breachChance: number;

  /** Missiles consumed per shot (0 for lasers and beams). */
  missileCost: number;
}
