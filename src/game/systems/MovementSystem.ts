import { Time } from '../../engine/Time';
import { TILE_SIZE } from '../constants';
import { Pathfinder } from '../../utils/Pathfinder';
import type { IInput } from '../../engine/IInput';
import type { IWorld } from '../../engine/IWorld';
import type { PathfindingComponent } from '../components/PathfindingComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { SelectableComponent } from '../components/SelectableComponent';

/** Linear movement speed in pixels per second (~2.3 tiles/s at TILE_SIZE=35). */
const CREW_SPEED = 80;

/**
 * Moves crew entities along A*-computed paths, tile by tile.
 *
 * Right-click:
 *   1. Convert mouse pixel → grid coordinate.
 *   2. For each selected crew, compute their current grid tile.
 *   3. Call Pathfinder.findPath(current, target).
 *   4. Store the result in PathfindingComponent.path (empty = no path / already there).
 *
 * Per-frame lerp:
 *   - Crew lerps toward path[0] (first remaining waypoint).
 *   - On arrival (distance < 1 px), snap, call path.shift(), advance to next waypoint.
 *   - Stops automatically when path is empty.
 */
export class MovementSystem {
  private readonly input: IInput;
  private readonly shipX: number;
  private readonly shipY: number;
  private readonly pathfinder: Pathfinder;

  constructor(input: IInput, shipX: number, shipY: number, pathfinder: Pathfinder) {
    this.input      = input;
    this.shipX      = shipX;
    this.shipY      = shipY;
    this.pathfinder = pathfinder;
  }

  update(world: IWorld): void {
    this.handleRightClick(world);
    this.advanceCrewAlongPaths(world);
  }

  // ── Right-click: compute and assign A* path ──────────────────────────────────

  private handleRightClick(world: IWorld): void {
    if (!this.input.isMouseJustPressed(2)) return;

    const mouse = this.input.getMousePosition();
    const targetGridX = Math.floor((mouse.x - this.shipX) / TILE_SIZE);
    const targetGridY = Math.floor((mouse.y - this.shipY) / TILE_SIZE);

    const entities = world.query(['Crew', 'Selectable', 'Pathfinding', 'Position']);

    for (const entity of entities) {
      const selectable  = world.getComponent<SelectableComponent>(entity, 'Selectable');
      const pathfinding = world.getComponent<PathfindingComponent>(entity, 'Pathfinding');
      const pos         = world.getComponent<PositionComponent>(entity, 'Position');
      if (selectable === undefined || pathfinding === undefined || pos === undefined) continue;
      if (!selectable.isSelected) continue;

      // Derive the crew's current grid tile from their pixel centre.
      const startGridX = Math.floor((pos.x - this.shipX) / TILE_SIZE);
      const startGridY = Math.floor((pos.y - this.shipY) / TILE_SIZE);

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
    const entities = world.query(['Crew', 'Pathfinding', 'Position']);

    for (const entity of entities) {
      const pos         = world.getComponent<PositionComponent>(entity, 'Position');
      const pathfinding = world.getComponent<PathfindingComponent>(entity, 'Pathfinding');
      if (pos === undefined || pathfinding === undefined) continue;
      if (pathfinding.path.length === 0) continue; // nothing to do

      // Lerp toward the FIRST remaining waypoint.
      const waypoint = pathfinding.path[0];
      const targetPx = this.shipX + waypoint.x * TILE_SIZE + TILE_SIZE / 2;
      const targetPy = this.shipY + waypoint.y * TILE_SIZE + TILE_SIZE / 2;

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

      const step = CREW_SPEED * dt;
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
}
