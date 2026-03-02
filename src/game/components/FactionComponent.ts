import type { Component } from '../../engine/Component';

/** Attached to the ship root entity to identify its side in combat. */
export interface FactionComponent extends Component {
  readonly _type: 'Faction';
  readonly id: 'PLAYER' | 'ENEMY';
}
