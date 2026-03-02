import type { Component } from '../../engine/Component';

/**
 * Attached to a ship root entity when it has a CLOAKING system.
 * CloakingSystem manages activation, duration, and cooldown each frame.
 */
export interface CloakComponent extends Component {
  readonly _type: 'Cloak';
  /** True while the cloak is active (ship is invisible). */
  isActive: boolean;
  /** Seconds of cloak duration remaining (counts down while isActive). */
  durationTimer: number;
  /** Seconds remaining in cooldown after deactivation (must reach 0 to re-activate). */
  cooldownTimer: number;
  /** Total cloak duration in seconds. */
  readonly maxDuration: number;
  /** Cooldown length in seconds after deactivation. */
  readonly maxCooldown: number;
}
