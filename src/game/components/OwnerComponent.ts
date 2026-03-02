import type { Component } from '../../engine/Component';
import type { Entity } from '../../engine/Entity';

/**
 * Links a child entity (room, door, crew, weapon) back to its parent ship entity.
 * Used to scope per-ship systems (O2, power, targeting) when multiple ships exist.
 */
export interface OwnerComponent extends Component {
  readonly _type: 'Owner';
  /** The ship root entity this entity belongs to. */
  readonly shipEntity: Entity;
}
