import type { Component } from '../../engine/Component';

/** Stores the 2D canvas position of an entity. Mutated each frame by movement/input systems. */
export interface PositionComponent extends Component {
  readonly _type: 'Position';
  x: number;
  y: number;
}
