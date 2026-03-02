import type { Component } from '../../engine/Component';

/**
 * Attached to the ship root entity (not the room) — shields protect the whole ship.
 *
 * `currentLayers` is stored as a float so fractional recharge progress accumulates
 * naturally across frames.  Use `Math.floor(currentLayers)` to get the actual
 * integer number of active shield layers for gameplay checks.
 */
export interface ShieldComponent extends Component {
  readonly _type: 'Shield';
  /** Fractional current layers (e.g. 1.3 = 1 active layer + 30% progress toward the next). */
  currentLayers: number;
  /** Integer maximum layers derived from calculateMaxShields(SHIELDS system power). */
  maxLayers: number;
}
