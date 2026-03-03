import type { Component } from '../../engine/Component';
import type { Entity } from '../../engine/Entity';

/** A projectile in flight from an origin point to a target room. */
export interface ProjectileComponent extends Component {
  readonly _type: 'Projectile';
  /** Starting pixel position (where the weapon fired from). */
  readonly originX: number;
  readonly originY: number;
  /**
   * Destination pixel position.  Mutable — ProjectileSystem redirects this to an
   * overshoot coordinate when the accuracy roll determines a miss.
   */
  targetX: number;
  targetY: number;
  /** Travel speed in pixels per second. */
  readonly speed: number;
  /** Hull damage applied on impact. */
  readonly damage: number;
  /**
   * Room entity being targeted.  Mutable — redirected to an adjacent room on a near-miss.
   * Set to undefined when this is a complete miss (no impact should occur).
   */
  targetRoomEntity: Entity | undefined;
  /** True when the projectile originated from the enemy ship (future AI use). */
  readonly isEnemyOrigin: boolean;
  /**
   * Base hit probability from the weapon template (0.0–1.0).
   * ProjectileSystem uses this together with the target ship's evasion on the first frame.
   */
  readonly accuracy: number;
  /**
   * When true the accuracy/evasion roll is skipped — the projectile always hits.
   * Set from WeaponTemplate.neverMisses (Beam weapons).
   */
  readonly neverMisses: boolean;
  /**
   * Weapon type that spawned this projectile ('LASER', 'MISSILE', 'ION').
   * Used by ProjectileSystem to decide whether to bypass shields (MISSILE)
   * and whether to apply ion damage on impact (ION).
   */
  readonly weaponType: string;
  /**
   * Ion damage applied to the target ship's SHIELDS system on impact.
   * Non-zero only for ION weapon projectiles.
   */
  readonly ionDamage: number;
  /** Probability (0–1) of starting a fire in the target room on impact. */
  readonly fireChance: number;
  /** Probability (0–1) of creating a hull breach in the target room on impact. */
  readonly breachChance: number;
}
