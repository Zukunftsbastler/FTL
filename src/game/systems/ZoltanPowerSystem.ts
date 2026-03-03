import { TILE_SIZE } from '../constants';
import type { IWorld } from '../../engine/IWorld';
import type { CrewComponent } from '../components/CrewComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { SystemComponent } from '../components/SystemComponent';

/**
 * Manages the Zoltan passive power ability.
 *
 * Each frame:
 *   1. Reset zoltanBonus to 0 on every system across all ships.
 *   2. For each Zoltan crew member, locate the room they currently occupy.
 *   3. If that room hosts a system, add +1 to system.zoltanBonus.
 *
 * Must run BEFORE ShieldSystem, EvasionSystem, and CombatSystem so those systems
 * see the up-to-date zoltanBonus in their effective-power calculations.
 */
export class ZoltanPowerSystem {
  update(world: IWorld): void {
    // ── 1. Reset zoltanBonus on all systems ───────────────────────────────────
    for (const entity of world.query(['System'])) {
      const sys = world.getComponent<SystemComponent>(entity, 'System');
      if (sys !== undefined) sys.zoltanBonus = 0;
    }

    // ── 2. Build room data snapshot (pixel bounds → SystemComponent) ──────────
    const rooms = this.collectRoomData(world);

    // ── 3. Apply +1 zoltanBonus for each Zoltan in a system room ─────────────
    for (const entity of world.query(['Crew', 'Position', 'Owner'])) {
      const crew = world.getComponent<CrewComponent>(entity, 'Crew');
      if (crew?.race !== 'ZOLTAN') continue;

      const pos = world.getComponent<PositionComponent>(entity, 'Position');
      if (pos === undefined) continue;

      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp === undefined) continue;

      // Find the room this Zoltan occupies (on their own ship).
      const room = this.getRoomAt(pos.x, pos.y, ownerComp.shipEntity, rooms);
      if (room?.system !== undefined) {
        // Cap bonus so total effective power never exceeds maxCapacity.
        const sys = room.system;
        if (sys.currentPower + sys.zoltanBonus < sys.maxCapacity) {
          sys.zoltanBonus += 1;
        }
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private collectRoomData(world: IWorld): Array<{
    shipEntity: number;
    left: number;
    top: number;
    right: number;
    bottom: number;
    system: SystemComponent | undefined;
  }> {
    const result: Array<{
      shipEntity: number;
      left: number;
      top: number;
      right: number;
      bottom: number;
      system: SystemComponent | undefined;
    }> = [];

    for (const entity of world.query(['Room', 'Position', 'Owner'])) {
      const pos     = world.getComponent<PositionComponent>(entity, 'Position');
      const room    = world.getComponent<RoomComponent>(entity, 'Room');
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (pos === undefined || room === undefined || ownerComp === undefined) continue;

      result.push({
        shipEntity: ownerComp.shipEntity,
        left:   pos.x,
        top:    pos.y,
        right:  pos.x + room.width  * TILE_SIZE,
        bottom: pos.y + room.height * TILE_SIZE,
        system: world.getComponent<SystemComponent>(entity, 'System'),
      });
    }
    return result;
  }

  private getRoomAt(
    x: number,
    y: number,
    shipEntity: number,
    rooms: ReturnType<ZoltanPowerSystem['collectRoomData']>,
  ): { system: SystemComponent | undefined } | null {
    for (const room of rooms) {
      if (room.shipEntity !== shipEntity) continue;
      if (x >= room.left && x < room.right && y >= room.top && y < room.bottom) {
        return room;
      }
    }
    return null;
  }
}
