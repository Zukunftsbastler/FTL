import type { Component } from '../../engine/Component';
import type { SystemType } from '../data/SystemType';

/** Attached to a room entity that houses a ship system. */
export interface SystemComponent extends Component {
  readonly _type: 'System';
  /** Which ship system this room contains. */
  readonly type: SystemType;
  /** Maximum power this system can accept. Reduced by weapon hits. */
  maxCapacity: number;
  /** Currently allocated power (0 … maxCapacity). */
  currentPower: number;
  /** Grid room ID — used to correlate with PathFinding / door logic. */
  readonly roomId: number;
}
