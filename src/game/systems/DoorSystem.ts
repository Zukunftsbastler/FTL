import { TILE_SIZE } from '../constants';
import type { IInput } from '../../engine/IInput';
import type { IWorld } from '../../engine/IWorld';
import type { DoorComponent } from '../components/DoorComponent';
import type { PositionComponent } from '../components/PositionComponent';

/**
 * Toggles doors open/closed when the player left-clicks near one.
 *
 * Each door entity stores its PositionComponent at the pixel boundary of the
 * shared wall it sits on:
 *   - Vertical door   (left/right rooms): pos.x = wall column; door spans pos.y → pos.y + TILE_SIZE
 *   - Horizontal door (top/bottom rooms): pos.y = wall row;    door spans pos.x → pos.x + TILE_SIZE
 *
 * The click hitbox is a circle of {@link HIT_RADIUS} pixels around the door centre,
 * giving the player a forgiving target to click.
 */
const HIT_RADIUS = 16; // pixels — generous hitbox so thin door markers are easy to click
const HIT_RADIUS_SQ = HIT_RADIUS * HIT_RADIUS;

export class DoorSystem {
  private readonly input: IInput;

  constructor(input: IInput) {
    this.input = input;
  }

  update(world: IWorld): void {
    if (!this.input.isMouseJustPressed(0)) return;

    const mouse   = this.input.getMousePosition();
    const entities = world.query(['Door', 'Position']);

    for (const entity of entities) {
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      const door = world.getComponent<DoorComponent>(entity, 'Door');
      if (pos === undefined || door === undefined) continue;

      // Compute the pixel centre of the door marker.
      const cx = door.isVertical
        ? pos.x                    // wall column
        : pos.x + TILE_SIZE / 2;  // midpoint of horizontal span

      const cy = door.isVertical
        ? pos.y + TILE_SIZE / 2   // midpoint of vertical span
        : pos.y;                   // wall row

      const dx = mouse.x - cx;
      const dy = mouse.y - cy;

      if (dx * dx + dy * dy < HIT_RADIUS_SQ) {
        door.isOpen = !door.isOpen;
        return; // only toggle the closest door per click
      }
    }
  }
}
