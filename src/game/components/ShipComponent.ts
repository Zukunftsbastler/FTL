import type { Component } from '../../engine/Component';

/** Marks an entity as the root ship entity and stores hull statistics. */
export interface ShipComponent extends Component {
  readonly _type: 'Ship';
  /** Template ID this ship was spawned from (e.g. 'kestrel_a'). */
  readonly id: string;
  /** Maximum hull hit points; game over when currentHull reaches 0. */
  readonly maxHull: number;
  /** Mutable current hull — reduced by enemy fire, repaired by scrap/events. */
  currentHull: number;
}
