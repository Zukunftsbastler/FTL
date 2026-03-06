import type { Component } from '../../engine/Component';

/** Marks an entity as the root ship entity and stores hull + resource statistics. */
export interface ShipComponent extends Component {
  readonly _type: 'Ship';
  /** Template ID this ship was spawned from (e.g. 'kestrel_a'). */
  readonly id: string;
  /** Maximum hull hit points; game over when currentHull reaches 0. */
  readonly maxHull: number;
  /** Mutable current hull — reduced by enemy fire, repaired by scrap/events. */
  currentHull: number;
  /** Fuel units remaining — consumed when jumping between sectors. */
  fuel: number;
  /** Scrap currency — primary upgrade resource collected from defeated enemies. */
  scrap: number;
  /** Missile ammunition — consumed by missile weapons. */
  missiles: number;
  /** Drone part supply — consumed by drone weapons (future feature). */
  droneParts: number;
  /** Weapon IDs collected as loot but not yet equipped (cargo hold). */
  cargoWeapons: string[];
  /**
   * Current evasion stat (0.0 – 0.5).
   * Reset to 0 each frame by ManningSystem, then rebuilt from crewed stations.
   * Reduces incoming hit chance: actualHit = clamp(accuracy - evasion, 0.05, 1.0).
   */
  evasion: number;
  /**
   * IDs of active augmentations installed on this ship (e.g. 'weapon_pre_igniter').
   * AugmentSystem reads this each frame and applies passive effects.
   */
  augments: string[];
  /**
   * WebGL hull sprite generated once at spawn by ShipGenerator.
   * RenderSystem draws this as the outermost visual layer each combat frame.
   */
  hullSprite?: HTMLCanvasElement;
}
