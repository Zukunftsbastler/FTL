import { TILE_SIZE } from '../constants';
import { allocatePower, deallocatePower } from '../logic/PowerMath';
import type { IInput } from '../../engine/IInput';
import type { IWorld } from '../../engine/IWorld';
import type { PositionComponent } from '../components/PositionComponent';
import type { ReactorComponent } from '../components/ReactorComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { SystemComponent } from '../components/SystemComponent';

/**
 * Handles keyboard-driven power allocation for ship systems.
 *
 * Interaction model (no on-screen buttons needed yet):
 *   - Hover the mouse over a room that contains a System.
 *   - Press ArrowUp   → allocate 1 power from the reactor to that system.
 *   - Press ArrowDown → deallocate 1 power from that system back to the reactor.
 */
export class PowerSystem {
  private readonly input: IInput;

  constructor(input: IInput) {
    this.input = input;
  }

  update(world: IWorld): void {
    const up   = this.input.isKeyJustPressed('ArrowUp');
    const down = this.input.isKeyJustPressed('ArrowDown');
    if (!up && !down) return; // nothing to do this frame

    // Find the reactor (attached to the ship entity).
    const reactorEntities = world.query(['Reactor']);
    if (reactorEntities.length === 0) return;
    const reactor = world.getComponent<ReactorComponent>(reactorEntities[0], 'Reactor');
    if (reactor === undefined) return;

    // Find the hovered system room.
    const hoveredSystem = this.getHoveredSystem(world);
    if (hoveredSystem === null) return;

    if (up)   allocatePower(reactor, hoveredSystem);
    if (down) deallocatePower(reactor, hoveredSystem);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Returns the SystemComponent of the room the mouse is currently over,
   * or null if the mouse isn't over any system room.
   */
  private getHoveredSystem(world: IWorld): SystemComponent | null {
    const mouse = this.input.getMousePosition();
    const entities = world.query(['Room', 'System', 'Position']);

    for (const entity of entities) {
      const pos    = world.getComponent<PositionComponent>(entity, 'Position');
      const room   = world.getComponent<RoomComponent>(entity, 'Room');
      const system = world.getComponent<SystemComponent>(entity, 'System');
      if (pos === undefined || room === undefined || system === undefined) continue;

      const left   = pos.x;
      const top    = pos.y;
      const right  = pos.x + room.width  * TILE_SIZE;
      const bottom = pos.y + room.height * TILE_SIZE;

      if (mouse.x >= left && mouse.x < right && mouse.y >= top && mouse.y < bottom) {
        return system;
      }
    }

    return null;
  }
}
