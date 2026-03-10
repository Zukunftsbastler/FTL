import type { DoorTemplate } from '../game/data/DoorTemplate';
import type { GridCoord } from '../game/data/GridCoord';
import type { RoomTemplate } from '../game/data/RoomTemplate';

// ── Internal A* node ─────────────────────────────────────────────────────────

interface AStarNode {
  readonly x: number;
  readonly y: number;
  g: number;           // cost from start (each tile step = 1)
  readonly h: number;  // Manhattan distance to goal
  f: number;           // g + h
  parent: AStarNode | null;
}

// Cardinal movement offsets: East, West, South, North.
const NEIGHBORS: ReadonlyArray<readonly [number, number]> = [
  [ 1,  0],
  [-1,  0],
  [ 0,  1],
  [ 0, -1],
];

/**
 * Pre-computes the ship's navigation graph from static template data, then
 * answers A* path queries efficiently.
 *
 * Graph rules:
 *  - Every tile inside a room is a walkable node.
 *  - Adjacent tiles WITHIN the same room are always connected.
 *  - Adjacent tiles in DIFFERENT rooms are connected only if a door joins those two rooms.
 *  - Tiles in open space (outside all rooms) are non-walkable.
 *  - Movement is strictly 4-directional (no diagonals).
 *  - Heuristic: Manhattan distance.
 *
 * Construct once after loading the ship JSON; reuse for every crew pathfinding request.
 */
export class Pathfinder {
  /** "x,y" → roomId for every walkable tile. */
  private readonly tileToRoom: Map<string, number> = new Map();

  /**
   * Set of "roomIdA:roomIdB" keys (both orderings) for pairs of rooms
   * connected by at least one interior door that is currently OPEN.
   * Updated each time `updateOpenDoors()` is called.
   */
  private openConnections: Set<string> = new Set();

  constructor(rooms: RoomTemplate[], doors: DoorTemplate[]) {
    // Build tile → room lookup.
    for (const room of rooms) {
      for (let ty = room.y; ty < room.y + room.height; ty++) {
        for (let tx = room.x; tx < room.x + room.width; tx++) {
          this.tileToRoom.set(`${tx},${ty}`, room.roomId);
        }
      }
    }

    // Seed with all template doors open so the first frame before any door state
    // is applied still produces valid paths.
    for (const door of doors) {
      if (door.roomA === 'SPACE' || door.roomB === 'SPACE') continue;
      this.openConnections.add(`${door.roomA}:${door.roomB}`);
      this.openConnections.add(`${door.roomB}:${door.roomA}`);
    }
  }

  /**
   * Rebuilds the set of passable room–room connections from live ECS door states.
   * Call this once per frame in MovementSystem before any pathfinding requests.
   *
   * @param openDoorPairs  Set of "roomIdA:roomIdB" strings for every OPEN door
   *                       (both orderings). Build this from DoorComponent queries.
   */
  updateOpenDoors(openDoorPairs: Set<string>): void {
    this.openConnections = openDoorPairs;
  }

  /**
   * Finds the shortest walkable path from (startX, startY) to (targetX, targetY)
   * using 4-directional A* with Manhattan distance heuristic.
   *
   * @returns Ordered array of grid coordinates from the FIRST step to the target
   *          (start tile is excluded). Returns null if no path exists.
   *          Returns an empty array if start equals target.
   */
  findPath(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
  ): GridCoord[] | null {
    // Both endpoints must be inside the ship.
    if (!this.tileToRoom.has(`${startX},${startY}`)) return null;
    if (!this.tileToRoom.has(`${targetX},${targetY}`)) return null;

    if (startX === targetX && startY === targetY) return [];

    const h0 = this.manhattan(startX, startY, targetX, targetY);
    const startNode: AStarNode = { x: startX, y: startY, g: 0, h: h0, f: h0, parent: null };

    const openSet: AStarNode[] = [startNode];
    /** "x,y" keys of nodes that have been fully expanded. */
    const closedSet = new Set<string>();

    while (openSet.length > 0) {
      // Pop the node with the lowest f-score (linear scan — fine for ~15 tiles).
      let bestIdx = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[bestIdx].f) bestIdx = i;
      }
      const current = openSet[bestIdx];
      openSet.splice(bestIdx, 1);

      const currentKey = `${current.x},${current.y}`;
      if (closedSet.has(currentKey)) continue;
      closedSet.add(currentKey);

      if (current.x === targetX && current.y === targetY) {
        return this.reconstructPath(current);
      }

      for (const [dx, dy] of NEIGHBORS) {
        const nx = current.x + dx;
        const ny = current.y + dy;
        const nKey = `${nx},${ny}`;

        if (closedSet.has(nKey)) continue;
        if (!this.isPassable(current.x, current.y, nx, ny)) continue;

        const g = current.g + 1;
        const existing = openSet.find((n) => n.x === nx && n.y === ny);

        if (existing !== undefined) {
          // Relax if we found a cheaper route to this node.
          if (g < existing.g) {
            existing.g = g;
            existing.f = g + existing.h;
            existing.parent = current;
          }
        } else {
          const h = this.manhattan(nx, ny, targetX, targetY);
          openSet.push({ x: nx, y: ny, g, h, f: g + h, parent: current });
        }
      }
    }

    return null; // No path exists.
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Returns true if a crew member can step from (fromX, fromY) into (toX, toY).
   * The destination must be in a room, and if the two tiles are in different rooms
   * a door must connect those rooms.
   */
  private isPassable(fromX: number, fromY: number, toX: number, toY: number): boolean {
    const fromRoom = this.tileToRoom.get(`${fromX},${fromY}`);
    const toRoom   = this.tileToRoom.get(`${toX},${toY}`);

    if (fromRoom === undefined || toRoom === undefined) return false;
    if (fromRoom === toRoom) return true;

    return this.openConnections.has(`${fromRoom}:${toRoom}`);
  }

  private manhattan(ax: number, ay: number, bx: number, by: number): number {
    return Math.abs(ax - bx) + Math.abs(ay - by);
  }

  /** Walks the parent chain and returns the path EXCLUDING the start node. */
  private reconstructPath(node: AStarNode): GridCoord[] {
    const path: GridCoord[] = [];
    let cur: AStarNode | null = node;
    while (cur !== null) {
      path.unshift({ x: cur.x, y: cur.y });
      cur = cur.parent;
    }
    path.shift(); // remove start tile — crew is already there
    return path;
  }
}
