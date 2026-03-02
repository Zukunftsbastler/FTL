import type { Component } from '../../engine/Component';
import type { Entity } from '../../engine/Entity';

/** Tracks the live state of a single equipped weapon. */
export interface WeaponComponent extends Component {
  readonly _type: 'Weapon';

  /** References the weapon's static data in weapons.json. */
  readonly templateId: string;

  /** Current charge level (0 … maxCharge). Advances when isPowered. */
  charge: number;

  /** Maximum charge = cooldown in seconds. Weapon fires when charge reaches this. */
  readonly maxCharge: number;

  /** Reactor power this weapon consumes (= WeaponTemplate.powerCost). */
  readonly powerRequired: number;

  /**
   * Computed each frame by CombatSystem based on the WEAPONS system's allocated power.
   * True → charge advances; false → charge frozen.
   */
  isPowered: boolean;

  /**
   * Entity ID of the enemy room this weapon is currently aimed at.
   * Undefined means no target is set.
   */
  targetRoomEntity: Entity | undefined;
}
