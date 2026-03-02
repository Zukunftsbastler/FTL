import { TILE_SIZE } from '../constants';
import { allocatePower, deallocatePower } from '../logic/PowerMath';
import type { Entity } from '../../engine/Entity';
import type { IInput } from '../../engine/IInput';
import type { IWorld } from '../../engine/IWorld';
import type { FactionComponent } from '../components/FactionComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { ReactorComponent } from '../components/ReactorComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { SystemComponent } from '../components/SystemComponent';

/**
 * Handles keyboard-driven power allocation for ship systems.
 *
 * Interaction model:
 *   - Hover the mouse over a room on the PLAYER ship that contains a System.
 *   - Press ArrowUp   → allocate 1 power from the reactor to that system.
 *   - Press ArrowDown → deallocate 1 power from that system back to the reactor.
 *
 * With multiple ships in the world, only the PLAYER faction's reactor and rooms
 * are affected.
 */
export class PowerSystem {
  private readonly input: IInput;

  constructor(input: IInput) {
    this.input = input;
  }

  update(world: IWorld): void {
    const up   = this.input.isKeyJustPressed('ArrowUp');
    const down = this.input.isKeyJustPressed('ArrowDown');
    if (!up && !down) return;

    const playerShipEntity = this.findPlayerShipEntity(world);
    if (playerShipEntity === null) return;

    const reactor = world.getComponent<ReactorComponent>(playerShipEntity, 'Reactor');
    if (reactor === undefined) return;

    const hoveredSystem = this.getHoveredPlayerSystem(world, playerShipEntity);
    if (hoveredSystem === null) return;

    if (up)   allocatePower(reactor, hoveredSystem);
    if (down) deallocatePower(reactor, hoveredSystem);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private findPlayerShipEntity(world: IWorld): Entity | null {
    const entities = world.query(['Ship', 'Faction', 'Reactor']);
    for (const entity of entities) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id === 'PLAYER') return entity;
    }
    return null;
  }

  /**
   * Returns the SystemComponent of the player-owned room currently under the mouse,
   * or null if the mouse is not hovering over any player system room.
   */
  private getHoveredPlayerSystem(
    world: IWorld,
    playerShipEntity: Entity,
  ): SystemComponent | null {
    const mouse = this.input.getMousePosition();
    const entities = world.query(['Room', 'System', 'Position', 'Owner']);

    for (const entity of entities) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== playerShipEntity) continue;

      const pos    = world.getComponent<PositionComponent>(entity, 'Position');
      const room   = world.getComponent<RoomComponent>(entity, 'Room');
      const system = world.getComponent<SystemComponent>(entity, 'System');
      if (pos === undefined || room === undefined || system === undefined) continue;

      const right  = pos.x + room.width  * TILE_SIZE;
      const bottom = pos.y + room.height * TILE_SIZE;

      if (mouse.x >= pos.x && mouse.x < right && mouse.y >= pos.y && mouse.y < bottom) {
        return system;
      }
    }

    return null;
  }
}
