import type { DroneType } from './DroneType';

/** A drone blueprint entry loaded from data/drones.json. */
export interface DroneTemplate {
  readonly id: string;
  readonly name: string;
  readonly type: DroneType;
  /** Reactor power consumed while active. */
  readonly powerCost: number;
  /** Speed multiplier relative to base drone speed. */
  readonly speed: number;
  /** ID of the weapon template this drone fires (null for non-combat drones). */
  readonly weaponId: string | null;
  /** Starting HP (0 for external drones — destroyed by defense fire only). */
  readonly health: number;
  readonly description: string;
}
