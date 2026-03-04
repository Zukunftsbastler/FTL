import type { Component } from '../../engine/Component';
import type { SystemType } from '../data/SystemType';

/** Attached to a room entity that houses a ship system. */
export interface SystemComponent extends Component {
  readonly _type: 'System';
  /** Which ship system this room contains. */
  readonly type: SystemType;
  /**
   * Pristine maximum capacity set at spawn — never changes.
   * Used for UI bar rendering: total bar count = level.
   * Damaged bars = level − maxCapacity.
   */
  readonly level: number;
  /** Maximum power this system can accept. Reduced by weapon hits; restored by repair. */
  maxCapacity: number;
  /** Currently allocated power (0 … maxCapacity). */
  currentPower: number;
  /** Grid room ID — used to correlate with PathFinding / door logic. */
  readonly roomId: number;
  /**
   * Physical damage accumulated from weapon impacts (0 = pristine).
   * Crew standing in this room will reduce this over time via RepairSystem.
   */
  damageAmount: number;
  /**
   * Free power contributed by Zoltan crew occupying this room.
   * Reset to 0 each frame by ZoltanPowerSystem, then rebuilt from crew positions.
   * Added on top of currentPower for effective-power calculations in shield/evasion/weapons.
   */
  zoltanBonus: number;
}
