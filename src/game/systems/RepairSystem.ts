import { Time } from '../../engine/Time';
import { TILE_SIZE } from '../constants';
import { awardXP } from '../logic/CrewXP';
import { getRaceStats } from '../logic/CrewStats';
import type { IWorld } from '../../engine/IWorld';
import type { CrewComponent } from '../components/CrewComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { SystemComponent } from '../components/SystemComponent';

/** Physical damage repaired per second at skill level 0 (also used for fire/breach). */
const BASE_REPAIR_RATE = 1.0;

/** HP regained per second while resting in a powered Medbay. */
const BASE_HEAL_RATE = 5.0;

/**
 * Handles crew-driven system repair and Medbay healing.
 *
 * Each frame, for every crew member on the player ship:
 *   1. Determines which room they currently occupy.
 *   2. If that room contains a damaged system (damageAmount > 0), repair it.
 *      Rate = BASE_REPAIR_RATE × (1 + repair_skill × 0.5) × race_multiplier.
 *   3. If that room is a MEDBAY with currentPower > 0, heal the crew member.
 */
export class RepairSystem {
  /**
   * Tracks fractional repair progress per crew entity.
   * When the accumulator crosses a whole number (+1.0), that many repair XP points are awarded.
   */
  private readonly repairProgress = new Map<number, number>();

  update(world: IWorld): void {
    const dt = Time.deltaTime;

    // Build a snapshot of all room data once per frame.
    const rooms = this.collectRoomData(world);

    const crewEntities = world.query(['Crew', 'Position', 'Owner']);
    for (const entity of crewEntities) {
      const crew      = world.getComponent<CrewComponent>(entity, 'Crew');
      const pos       = world.getComponent<PositionComponent>(entity, 'Position');
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (crew === undefined || pos === undefined || ownerComp === undefined) continue;

      const room = this.getRoomAt(pos.x, pos.y, rooms);
      if (room === null) continue;

      const raceMultiplier = getRaceStats(crew.race).repairSpeed;
      const repairRate     = BASE_REPAIR_RATE * (1 + crew.skills.repair * 0.5) * raceMultiplier;
      let didRepair = false;

      // ── Priority 1: Extinguish fire ──────────────────────────────────────
      if (room.roomComp.hasFire) {
        room.roomComp.fireHealth = Math.max(0, room.roomComp.fireHealth - repairRate * dt);
        if (room.roomComp.fireHealth <= 0) {
          room.roomComp.hasFire = false;
        }
        didRepair = true;
      }
      // ── Priority 2: Seal hull breach ──────────────────────────────────────
      else if (room.roomComp.hasBreach) {
        room.roomComp.breachHealth = Math.max(0, room.roomComp.breachHealth - repairRate * dt);
        if (room.roomComp.breachHealth <= 0) {
          room.roomComp.hasBreach = false;
        }
        didRepair = true;
      }
      // ── Priority 3: Repair system damage ──────────────────────────────────
      else if (room.system !== undefined && room.system.damageAmount > 0) {
        const oldDamage = room.system.damageAmount;
        const repaired  = Math.min(room.system.damageAmount, repairRate * dt);
        room.system.damageAmount = Math.max(0, room.system.damageAmount - repaired);

        // Restore maxCapacity for each full damage point repaired.
        const pointsRestored = Math.floor(oldDamage) - Math.floor(room.system.damageAmount);
        if (pointsRestored > 0 && room.system.maxCapacity < room.system.level) {
          room.system.maxCapacity = Math.min(
            room.system.level,
            room.system.maxCapacity + pointsRestored,
          );
        }

        // Accumulate repair progress; award +1 XP per full point of damage repaired.
        const prev    = this.repairProgress.get(entity) ?? 0;
        const next    = prev + repaired;
        const wholeXP = Math.floor(next);
        this.repairProgress.set(entity, next - wholeXP);
        if (wholeXP > 0) awardXP(crew, 'repair', wholeXP);
        didRepair = true;
      }

      if (!didRepair) {
        // Clear accumulator when crew is not repairing.
        this.repairProgress.delete(entity);
      }

      // ── Medbay healing (always active, independent of repair priority) ─────
      if (
        room.system !== undefined &&
        room.system.type === 'MEDBAY' &&
        room.system.currentPower > 0 &&
        crew.health < crew.maxHealth
      ) {
        crew.health = Math.min(crew.maxHealth, crew.health + BASE_HEAL_RATE * dt);
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private collectRoomData(
    world: IWorld,
  ): Array<{
    left: number; top: number; right: number; bottom: number;
    roomComp: RoomComponent;
    system: SystemComponent | undefined;
  }> {
    const result: Array<{
      left: number; top: number; right: number; bottom: number;
      roomComp: RoomComponent;
      system: SystemComponent | undefined;
    }> = [];

    const entities = world.query(['Room', 'Position']);
    for (const entity of entities) {
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      const room = world.getComponent<RoomComponent>(entity, 'Room');
      if (pos === undefined || room === undefined) continue;

      result.push({
        left:     pos.x,
        top:      pos.y,
        right:    pos.x + room.width  * TILE_SIZE,
        bottom:   pos.y + room.height * TILE_SIZE,
        roomComp: room,
        system:   world.getComponent<SystemComponent>(entity, 'System'),
      });
    }
    return result;
  }

  private getRoomAt(
    x: number,
    y: number,
    rooms: Array<{
      left: number; top: number; right: number; bottom: number;
      roomComp: RoomComponent;
      system: SystemComponent | undefined;
    }>,
  ): { roomComp: RoomComponent; system: SystemComponent | undefined } | null {
    for (const room of rooms) {
      if (x >= room.left && x < room.right && y >= room.top && y < room.bottom) {
        return room;
      }
    }
    return null;
  }
}
