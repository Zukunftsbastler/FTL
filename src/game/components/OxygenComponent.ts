import type { Component } from '../../engine/Component';

/** Tracks the oxygen level of a single room. Attached to every room entity. */
export interface OxygenComponent extends Component {
  readonly _type: 'Oxygen';
  /** Current O2 percentage (0 = vacuum, 100 = fully oxygenated). */
  level: number;
}
