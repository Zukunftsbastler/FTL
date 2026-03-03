import type { Component } from '../../engine/Component';
import type { SystemType } from '../data/SystemType';

/**
 * Stores the grid-space identity and dimensions of a ship room.
 * Pixel coordinates live in the paired PositionComponent.
 * Grid values multiplied by TILE_SIZE give the on-screen rectangle size.
 */
export interface RoomComponent extends Component {
  readonly _type: 'Room';
  /** Unique room ID within the parent ship (matches the JSON blueprint). */
  readonly roomId: number;
  /** Grid X coordinate of the room's top-left corner. */
  readonly x: number;
  /** Grid Y coordinate of the room's top-left corner. */
  readonly y: number;
  /** Room width in grid tiles. */
  readonly width: number;
  /** Room height in grid tiles. */
  readonly height: number;
  /** The system housed in this room, or undefined for a corridor/empty room. */
  readonly system: SystemType | undefined;
  /** True when the room is on fire; causes periodic crew and system damage. */
  hasFire: boolean;
  /** True when the room has a hull breach; oxygen vents continuously. */
  hasBreach: boolean;
}
