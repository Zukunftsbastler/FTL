import type { Component } from '../../engine/Component';

/** Attached to the ship entity. Tracks the ship's reactor power budget. */
export interface ReactorComponent extends Component {
  readonly _type: 'Reactor';
  /** Total power output the reactor can provide. Increased by reactor upgrades. */
  totalPower: number;
  /** Unallocated power available for distribution to systems. */
  currentPower: number;
}
