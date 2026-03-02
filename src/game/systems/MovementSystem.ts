import { Time } from '../../engine/Time';
import { TILE_SIZE } from '../constants';
import type { IInput } from '../../engine/IInput';
import type { IWorld } from '../../engine/IWorld';
import type { PathfindingComponent } from '../components/PathfindingComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { SelectableComponent } from '../components/SelectableComponent';

/** Linear movement speed in pixels per second. ~2.3 tiles/s at TILE_SIZE=35. */
const CREW_SPEED = 80;

/**
 * Moves crew entities toward their pathfinding target using simple linear interpolation.
 *
 * Sprint 4 simplification: movement is a direct straight-line lerp — no A* pathfinding,
 * no wall collision. Sprint 5 will replace this with proper tile-graph navigation.
 *
 * Each frame:
 *  1. If a right-click occurred, assign the clicked tile as the target for all selected crew.
 *  2. For every crew entity with a Pathfinding component, lerp its PositionComponent
 *     toward the target pixel at CREW_SPEED px/s using Time.deltaTime.
 */
export class MovementSystem {
  private readonly input: IInput;
  private readonly shipX: number;
  private readonly shipY: number;

  constructor(input: IInput, shipX: number, shipY: number) {
    this.input  = input;
    this.shipX  = shipX;
    this.shipY  = shipY;
  }

  update(world: IWorld): void {
    this.handleRightClick(world);
    this.moveCrewTowardTargets(world);
  }

  // ── Right-click: assign movement target ─────────────────────────────────────

  private handleRightClick(world: IWorld): void {
    if (!this.input.isMouseJustPressed(2)) return;

    const mouse = this.input.getMousePosition();
    const targetGridX = Math.floor((mouse.x - this.shipX) / TILE_SIZE);
    const targetGridY = Math.floor((mouse.y - this.shipY) / TILE_SIZE);

    const entities = world.query(['Crew', 'Selectable', 'Pathfinding']);

    for (const entity of entities) {
      const selectable  = world.getComponent<SelectableComponent>(entity, 'Selectable');
      const pathfinding = world.getComponent<PathfindingComponent>(entity, 'Pathfinding');
      if (selectable === undefined || pathfinding === undefined) continue;

      if (selectable.isSelected) {
        pathfinding.targetX = targetGridX;
        pathfinding.targetY = targetGridY;
        pathfinding.path    = []; // Sprint 5: A* will populate this instead.
      }
    }
  }

  // ── Per-frame: lerp crew toward their targets ────────────────────────────────

  private moveCrewTowardTargets(world: IWorld): void {
    const dt = Time.deltaTime;
    const entities = world.query(['Crew', 'Pathfinding', 'Position']);

    for (const entity of entities) {
      const pos         = world.getComponent<PositionComponent>(entity, 'Position');
      const pathfinding = world.getComponent<PathfindingComponent>(entity, 'Pathfinding');
      if (pos === undefined || pathfinding === undefined) continue;

      // Target pixel = centre of the destination tile.
      const targetPx = this.shipX + pathfinding.targetX * TILE_SIZE + TILE_SIZE / 2;
      const targetPy = this.shipY + pathfinding.targetY * TILE_SIZE + TILE_SIZE / 2;

      const dx   = targetPx - pos.x;
      const dy   = targetPy - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 1) {
        // Already at (or within sub-pixel of) the target — snap and stop.
        pos.x = targetPx;
        pos.y = targetPy;
        continue;
      }

      const step = CREW_SPEED * dt;

      if (step >= dist) {
        // This frame's movement would overshoot — clamp to exact target.
        pos.x = targetPx;
        pos.y = targetPy;
      } else {
        pos.x += (dx / dist) * step;
        pos.y += (dy / dist) * step;
      }
    }
  }
}
