import type { Component } from '../../engine/Component';
import type { DroneType } from '../data/DroneType';

/**
 * Attached to a drone entity. Drones are autonomous units that operate without
 * direct player input: external drones orbit ships and fire, internal drones
 * roam the ship to repair or fight.
 */
export interface DroneComponent extends Component {
  readonly _type: 'Drone';
  /** Template ID from drones.json (e.g. 'combat_drone_1'). */
  readonly droneId: string;
  readonly droneType: DroneType;
  /** Movement speed multiplier from the template. */
  readonly speed: number;
  /** Weapon template ID for combat drones; null for non-combat drones. */
  readonly weaponId: string | null;
  /** Current HP (0 for external drones — they can only be shot down). */
  health: number;
  readonly maxHealth: number;
  /** Seconds until next autonomous action (fire / repair tick). */
  actionTimer: number;
  /** Current orbit angle in radians (used by external drones). */
  orbitAngle: number;
  /** Faction that deployed this drone ('PLAYER' | 'ENEMY'). */
  readonly ownerFaction: 'PLAYER' | 'ENEMY';
}
