import type { Component } from '../../engine/Component';

/**
 * Identifies an entity as a door between two rooms (or between a room and open space).
 * A door's PositionComponent holds the pixel coordinate of the shared wall it sits on.
 * The RenderSystem uses `isVertical` to choose the correct rectangle orientation.
 */
export interface DoorComponent extends Component {
  readonly _type: 'Door';
  /** First room on one side of this door. 'SPACE' means the door is an airlock/vent. */
  readonly roomA: number | 'SPACE';
  /** Second room on the other side of this door. */
  readonly roomB: number | 'SPACE';
  /** Whether the door is currently open (passable) or closed/locked. */
  isOpen: boolean;
  /** True → door sits on a vertical wall (separates left/right rooms).
   *  False → door sits on a horizontal wall (separates top/bottom rooms). */
  readonly isVertical: boolean;
}
