/** Raw JSON representation of a door connecting two rooms (or a room to open space). */
export interface DoorTemplate {
  /** ID of the first room, or 'SPACE' if the door vents to vacuum. */
  roomA: number | 'SPACE';
  /** ID of the second room, or 'SPACE' if the door vents to vacuum. */
  roomB: number | 'SPACE';
  /** Grid X coordinate of the door tile. */
  x: number;
  /** Grid Y coordinate of the door tile. */
  y: number;
  /** True if the door is oriented vertically (separates left/right rooms). False for horizontal (top/bottom). */
  vertical: boolean;
}
