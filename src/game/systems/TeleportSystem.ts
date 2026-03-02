import { TILE_SIZE } from '../constants';
import type { IInput } from '../../engine/IInput';
import type { IWorld } from '../../engine/IWorld';
import type { FactionComponent } from '../components/FactionComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { PathfindingComponent } from '../components/PathfindingComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { SelectableComponent } from '../components/SelectableComponent';
import type { SystemComponent } from '../components/SystemComponent';

/**
 * Handles crew teleportation from the player TELEPORTER room to a random enemy room.
 *
 * Key binding: 'T' — teleports all currently-selected player crew that are
 * inside the powered TELEPORTER room.
 *
 * After teleportation:
 *   - The crew's PositionComponent is moved to the center of a random enemy room.
 *   - The crew's OwnerComponent.shipEntity is updated to the enemy ship.
 *   - Pathfinding is cleared so they do not attempt to navigate on the old ship.
 *   - The crew is deselected.
 */
export class TeleportSystem {
  constructor(private readonly input: IInput) {}

  update(world: IWorld): void {
    if (!this.input.isKeyJustPressed('KeyT')) return;

    // Find the player and enemy ship entities.
    let playerShipEntity: number | undefined;
    let enemyShipEntity:  number | undefined;
    for (const entity of world.query(['Ship', 'Faction'])) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if      (faction?.id === 'PLAYER') playerShipEntity = entity;
      else if (faction?.id === 'ENEMY')  enemyShipEntity  = entity;
    }
    if (playerShipEntity === undefined || enemyShipEntity === undefined) return;

    // TELEPORTER system must exist and be powered.
    if (!this.isTeleporterPowered(world, playerShipEntity)) return;

    // Get the TELEPORTER room bounding box.
    const teleporterBounds = this.getTeleporterBounds(world, playerShipEntity);
    if (teleporterBounds === null) return;

    // Gather all enemy room centers as potential landing spots.
    const enemyRoomCenters = this.getEnemyRoomCenters(world, enemyShipEntity);
    if (enemyRoomCenters.length === 0) return;

    const { left, top, right, bottom } = teleporterBounds;

    // Teleport every selected player crew member standing in the TELEPORTER room.
    for (const crewEntity of world.query(['Crew', 'Selectable', 'Position', 'Owner'])) {
      const selectable = world.getComponent<SelectableComponent>(crewEntity, 'Selectable');
      if (selectable?.isSelected !== true) continue;

      const owner = world.getComponent<OwnerComponent>(crewEntity, 'Owner');
      if (owner?.shipEntity !== playerShipEntity) continue;

      const pos = world.getComponent<PositionComponent>(crewEntity, 'Position');
      if (pos === undefined) continue;

      // Crew must be inside the TELEPORTER room.
      if (pos.x < left || pos.x >= right || pos.y < top || pos.y >= bottom) continue;

      // Pick a random enemy room center.
      const dest = enemyRoomCenters[Math.floor(Math.random() * enemyRoomCenters.length)];

      // Move crew to enemy room.
      pos.x = dest.x;
      pos.y = dest.y;

      // Re-parent to enemy ship.
      // OwnerComponent.shipEntity is re-assigned via type cast since teleporting
      // is the one legitimate case for cross-ship crew movement.
      (owner as { shipEntity: number }).shipEntity = enemyShipEntity;

      // Clear pathfinding — the old ship's layout is no longer valid.
      const pathComp = world.getComponent<PathfindingComponent>(crewEntity, 'Pathfinding');
      if (pathComp !== undefined) {
        pathComp.path    = [];
        pathComp.targetX = 0;
        pathComp.targetY = 0;
      }

      // Deselect so the player doesn't accidentally redirect teleported crew.
      selectable.isSelected = false;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private isTeleporterPowered(world: IWorld, shipEntity: number): boolean {
    for (const roomEntity of world.query(['System', 'Owner'])) {
      const owner = world.getComponent<OwnerComponent>(roomEntity, 'Owner');
      if (owner?.shipEntity !== shipEntity) continue;
      const sys = world.getComponent<SystemComponent>(roomEntity, 'System');
      if (sys?.type === 'TELEPORTER' && sys.currentPower > 0) return true;
    }
    return false;
  }

  private getTeleporterBounds(
    world: IWorld,
    shipEntity: number,
  ): { left: number; top: number; right: number; bottom: number } | null {
    for (const roomEntity of world.query(['Room', 'Position', 'System', 'Owner'])) {
      const owner = world.getComponent<OwnerComponent>(roomEntity, 'Owner');
      if (owner?.shipEntity !== shipEntity) continue;
      const sys = world.getComponent<SystemComponent>(roomEntity, 'System');
      if (sys?.type !== 'TELEPORTER') continue;
      const pos  = world.getComponent<PositionComponent>(roomEntity, 'Position');
      const room = world.getComponent<RoomComponent>(roomEntity, 'Room');
      if (pos === undefined || room === undefined) return null;
      return {
        left:   pos.x,
        top:    pos.y,
        right:  pos.x + room.width  * TILE_SIZE,
        bottom: pos.y + room.height * TILE_SIZE,
      };
    }
    return null;
  }

  private getEnemyRoomCenters(
    world: IWorld,
    enemyShipEntity: number,
  ): Array<{ x: number; y: number }> {
    const result: Array<{ x: number; y: number }> = [];
    for (const roomEntity of world.query(['Room', 'Position', 'Owner'])) {
      const owner = world.getComponent<OwnerComponent>(roomEntity, 'Owner');
      if (owner?.shipEntity !== enemyShipEntity) continue;
      const pos  = world.getComponent<PositionComponent>(roomEntity, 'Position');
      const room = world.getComponent<RoomComponent>(roomEntity, 'Room');
      if (pos === undefined || room === undefined) continue;
      result.push({
        x: pos.x + (room.width  * TILE_SIZE) / 2,
        y: pos.y + (room.height * TILE_SIZE) / 2,
      });
    }
    return result;
  }
}
