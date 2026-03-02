import type { Component } from '../../engine/Component';
import type { GridCoord } from '../data/GridCoord';

/**
 * Stores the movement goal and planned route for a crew entity.
 *
 * Sprint 4: `path` is always empty; movement goes directly to (targetX, targetY).
 * Sprint 5: A* will populate `path` with intermediate waypoints to navigate around walls.
 */
export interface PathfindingComponent extends Component {
  readonly _type: 'Pathfinding';
  /** Grid X of the destination tile. */
  targetX: number;
  /** Grid Y of the destination tile. */
  targetY: number;
  /** Ordered list of grid waypoints from current position to target (Sprint 5). */
  path: GridCoord[];
}
