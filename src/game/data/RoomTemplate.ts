import type { SystemType } from './SystemType';

/** Raw JSON representation of one room in a ship blueprint. All coordinates are in grid tiles. */
export interface RoomTemplate {
  /** Unique ID for this room within its ship blueprint. */
  roomId: number;
  /** Grid X coordinate of the room's top-left corner. */
  x: number;
  /** Grid Y coordinate of the room's top-left corner. */
  y: number;
  /** Room width in grid tiles. */
  width: number;
  /** Room height in grid tiles. */
  height: number;
  /** The ship system installed in this room, if any. */
  system?: SystemType;
}
