import type { Component } from '../../engine/Component';
import type { Entity } from '../../engine/Entity';

/** A projectile in flight from an origin point to a target room. */
export interface ProjectileComponent extends Component {
  readonly _type: 'Projectile';
  /** Starting pixel position (where the weapon fired from). */
  readonly originX: number;
  readonly originY: number;
  /** Destination pixel position (centre of the target room). */
  readonly targetX: number;
  readonly targetY: number;
  /** Travel speed in pixels per second. */
  readonly speed: number;
  /** Hull damage applied on impact (reserved — actual math is in ProjectileSystem). */
  readonly damage: number;
  /** Room entity being targeted; used for system damage and impact flash. */
  readonly targetRoomEntity: Entity;
  /** True when the projectile originated from the enemy ship (future AI use). */
  readonly isEnemyOrigin: boolean;
}
