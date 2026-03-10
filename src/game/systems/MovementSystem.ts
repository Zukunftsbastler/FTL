import { Time } from '../../engine/Time';
import { TILE_SIZE } from '../constants';
import { getRaceStats } from '../logic/CrewStats';
import { Pathfinder } from '../../utils/Pathfinder';
import type { IInput } from '../../engine/IInput';
import type { IWorld } from '../../engine/IWorld';
import type { CrewComponent } from '../components/CrewComponent';
import type { FactionComponent } from '../components/FactionComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { PathfindingComponent } from '../components/PathfindingComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { DoorComponent } from '../components/DoorComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { SelectableComponent } from '../components/SelectableComponent';

/** Base linear movement speed in pixels per second (~2.3 tiles/s at TILE_SIZE=35). */
const CREW_SPEED = 80;

/**
 * Moves crew entities along A*-computed paths, tile by tile.
 *
 * Right-click:
 *   1. Derive the player ship's pixel origin from its rooms.
 *   2. Convert mouse pixel → grid coordinate relative to the player ship.
 *   3. For each selected PLAYER crew, compute their current grid tile.
 *   4. Call Pathfinder.findPath(current, target).
 *   5. Store the result in PathfindingComponent.path.
 *
 * Per-frame lerp:
 *   - Each crew uses its OWN parent ship's pixel origin to convert waypoints.
 *   - This fixes the bug where enemy crew flew to the player ship's coordinates.
 */
export class MovementSystem {
  private readonly input: IInput;
  private pathfinder: Pathfinder;

  constructor(input: IInput, pathfinder: Pathfinder) {
    this.input      = input;
    this.pathfinder = pathfinder;
  }

  /** Updates the pathfinder when a different player ship is selected at the Hangar. */
  setPathfinder(pathfinder: Pathfinder): void {
    this.pathfinder = pathfinder;
  }

  update(world: IWorld): void {
    // Sync the pathfinder with current runtime door states so crew cannot
    // walk through closed doors or teleport through walls.
    this.syncDoorStates(world);
    this.handleRightClick(world);
    this.advanceCrewAlongPaths(world);
  }

  /**
   * Rebuilds the pathfinder's open-door graph from live ECS door states.
   * Only interior (non-airlock) open doors contribute passable room connections.
   */
  private syncDoorStates(world: IWorld): void {
    const openPairs = new Set<string>();
    for (const entity of world.query(['Door', 'Owner'])) {
      const door = world.getComponent<DoorComponent>(entity, 'Door');
      if (door === undefined || !door.isOpen) continue;
      if (door.roomA === 'SPACE' || door.roomB === 'SPACE') continue;
      openPairs.add(`${door.roomA}:${door.roomB}`);
      openPairs.add(`${door.roomB}:${door.roomA}`);
    }
    this.pathfinder.updateOpenDoors(openPairs);
  }

  // ── Right-click: compute and assign A* path ──────────────────────────────────

  private handleRightClick(world: IWorld): void {
    if (!this.input.isMouseJustPressed(2)) return;

    const mouse = this.input.getMousePosition();

    // Resolve the player ship entity and its pixel origin.
    let playerShipEntity: number | undefined;
    for (const entity of world.query(['Ship', 'Faction'])) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id === 'PLAYER') { playerShipEntity = entity; break; }
    }
    if (playerShipEntity === undefined) return;

    const origin = this.getShipOrigin(world, playerShipEntity);
    if (origin === null) return;

    const targetGridX = Math.floor((mouse.x - origin.x) / TILE_SIZE);
    const targetGridY = Math.floor((mouse.y - origin.y) / TILE_SIZE);

    const entities = world.query(['Crew', 'Selectable', 'Pathfinding', 'Position', 'Owner']);

    for (const entity of entities) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp === undefined) continue;

      // Only allow commanding PLAYER crew.
      const faction = world.getComponent<FactionComponent>(ownerComp.shipEntity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;

      const selectable  = world.getComponent<SelectableComponent>(entity, 'Selectable');
      const pathfinding = world.getComponent<PathfindingComponent>(entity, 'Pathfinding');
      const pos         = world.getComponent<PositionComponent>(entity, 'Position');
      if (selectable === undefined || pathfinding === undefined || pos === undefined) continue;
      if (!selectable.isSelected) continue;

      // Derive the crew's current grid tile from their pixel centre.
      const startGridX = Math.floor((pos.x - origin.x) / TILE_SIZE);
      const startGridY = Math.floor((pos.y - origin.y) / TILE_SIZE);

      const newPath = this.pathfinder.findPath(startGridX, startGridY, targetGridX, targetGridY);

      if (newPath !== null) {
        // newPath is [] if start === target, which correctly produces no movement.
        pathfinding.path    = newPath;
        pathfinding.targetX = targetGridX;
        pathfinding.targetY = targetGridY;
      }
      // null → target is unreachable (outside ship or disconnected); crew stays put.
    }
  }

  // ── Per-frame: lerp crew toward next path waypoint ──────────────────────────

  private advanceCrewAlongPaths(world: IWorld): void {
    const dt = Time.deltaTime;
    const entities = world.query(['Crew', 'Pathfinding', 'Position', 'Owner']);

    for (const entity of entities) {
      const ownerComp   = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp === undefined) continue;

      const crew        = world.getComponent<CrewComponent>(entity, 'Crew');
      const pos         = world.getComponent<PositionComponent>(entity, 'Position');
      const pathfinding = world.getComponent<PathfindingComponent>(entity, 'Pathfinding');
      if (pos === undefined || pathfinding === undefined) continue;
      if (pathfinding.path.length === 0) continue; // nothing to do

      // Derive pixel origin from the crew's actual parent ship (fixes enemy crew flying bug).
      const origin = this.getShipOrigin(world, ownerComp.shipEntity);
      if (origin === null) continue;

      // Apply racial movement speed multiplier from crew_stats.json.
      const speedMult = crew !== undefined ? getRaceStats(crew.race).movementSpeed : 1.0;

      // Lerp toward the FIRST remaining waypoint.
      const waypoint = pathfinding.path[0];
      const targetPx = origin.x + waypoint.x * TILE_SIZE + TILE_SIZE / 2;
      const targetPy = origin.y + waypoint.y * TILE_SIZE + TILE_SIZE / 2;

      const dx   = targetPx - pos.x;
      const dy   = targetPy - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 1) {
        // Arrived — snap to exact tile centre and advance to next waypoint.
        pos.x = targetPx;
        pos.y = targetPy;
        pathfinding.path.shift();
        continue;
      }

      const step = CREW_SPEED * speedMult * dt;
      if (step >= dist) {
        pos.x = targetPx;
        pos.y = targetPy;
        pathfinding.path.shift();
      } else {
        pos.x += (dx / dist) * step;
        pos.y += (dy / dist) * step;
      }
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Derives the ship's pixel origin (top-left corner) by finding any room owned
   * by the given ship entity and back-calculating:
   *   originX = roomPos.x - room.x * TILE_SIZE
   *   originY = roomPos.y - room.y * TILE_SIZE
   */
  private getShipOrigin(world: IWorld, shipEntity: number): { x: number; y: number } | null {
    for (const re of world.query(['Room', 'Position', 'Owner'])) {
      const owner = world.getComponent<OwnerComponent>(re, 'Owner');
      if (owner?.shipEntity !== shipEntity) continue;
      const pos  = world.getComponent<PositionComponent>(re, 'Position');
      const room = world.getComponent<RoomComponent>(re, 'Room');
      if (pos !== undefined && room !== undefined) {
        return { x: pos.x - room.x * TILE_SIZE, y: pos.y - room.y * TILE_SIZE };
      }
    }
    return null;
  }
}
