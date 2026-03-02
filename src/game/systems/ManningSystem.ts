import { TILE_SIZE } from '../constants';
import type { IWorld } from '../../engine/IWorld';
import type { CrewComponent } from '../components/CrewComponent';
import type { FactionComponent } from '../components/FactionComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { ShipComponent } from '../components/ShipComponent';
import type { SystemComponent } from '../components/SystemComponent';
import type { WeaponComponent } from '../components/WeaponComponent';

/**
 * Manning buff rates per skill point.
 *  - GUNNERY: each skill point adds 0.2 to the charge-rate multiplier.
 *    e.g. skill 2 → multiplier 1.4 (40% faster charging).
 *  - PILOTING: each skill point adds 0.05 evasion when in PILOTING room.
 *  - ENGINEERING: each skill point adds 0.03 evasion when in ENGINES room.
 */
const GUNNERY_MULT_PER_SKILL   = 0.20;
const PILOTING_EVASION_PER_SKILL    = 0.05;
const ENGINEERING_EVASION_PER_SKILL = 0.03;

/** Maximum evasion the player ship can reach through manning alone. */
const MAX_EVASION = 0.50;

/**
 * Evaluates which crew members are currently manning stations on the player ship
 * and applies the appropriate buffs each frame.
 *
 * Buffs applied:
 *   - Crew with gunnery skill in WEAPONS room → increases WeaponComponent.chargeRateMultiplier
 *   - Crew with piloting skill in PILOTING room → increases ShipComponent.evasion
 *   - Crew with engineering skill in ENGINES room → increases ShipComponent.evasion
 *
 * All buffs are stateless: they are reset to defaults at the start of each frame
 * and recomputed from scratch.  Removing a crew member from a room immediately
 * removes their buff on the next frame.
 */
export class ManningSystem {
  update(world: IWorld): void {
    // ── 1. Reset all buffs ────────────────────────────────────────────────────
    for (const entity of world.query(['Weapon'])) {
      const weapon = world.getComponent<WeaponComponent>(entity, 'Weapon');
      if (weapon !== undefined) weapon.chargeRateMultiplier = 1.0;
    }

    const playerShipEntity = this.findPlayerShipEntity(world);
    if (playerShipEntity === null) return;

    const ship = world.getComponent<ShipComponent>(playerShipEntity, 'Ship');
    if (ship !== undefined) ship.evasion = 0;

    // ── 2. Build room-bounds snapshot for the player ship ─────────────────────
    const rooms = this.collectPlayerRooms(world, playerShipEntity);

    // ── 3. Apply buffs for each player crew member ────────────────────────────
    const crewEntities = world.query(['Crew', 'Position', 'Owner']);
    for (const entity of crewEntities) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== playerShipEntity) continue;

      const crew = world.getComponent<CrewComponent>(entity, 'Crew');
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      if (crew === undefined || pos === undefined) continue;

      const room = this.getRoomAtPosition(pos.x, pos.y, rooms);
      if (room === null || room.systemType === undefined) continue;

      if (room.systemType === 'WEAPONS' && crew.skills.gunnery > 0) {
        // Buff all weapons owned by the player ship.
        this.applyGunneryBuff(world, playerShipEntity, crew.skills.gunnery);
      }

      if (room.systemType === 'PILOTING' && crew.skills.piloting > 0 && ship !== undefined) {
        const gain = crew.skills.piloting * PILOTING_EVASION_PER_SKILL;
        ship.evasion = Math.min(MAX_EVASION, ship.evasion + gain);
      }

      if (room.systemType === 'ENGINES' && crew.skills.engineering > 0 && ship !== undefined) {
        const gain = crew.skills.engineering * ENGINEERING_EVASION_PER_SKILL;
        ship.evasion = Math.min(MAX_EVASION, ship.evasion + gain);
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private applyGunneryBuff(world: IWorld, playerShipEntity: number, gunnerySkill: number): void {
    const entities = world.query(['Weapon', 'Owner']);
    for (const entity of entities) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== playerShipEntity) continue;
      const weapon = world.getComponent<WeaponComponent>(entity, 'Weapon');
      if (weapon === undefined) continue;
      // Stack additively if multiple gunners are present (rare but possible).
      weapon.chargeRateMultiplier += gunnerySkill * GUNNERY_MULT_PER_SKILL;
    }
  }

  private findPlayerShipEntity(world: IWorld): number | null {
    const entities = world.query(['Ship', 'Faction']);
    for (const entity of entities) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id === 'PLAYER') return entity;
    }
    return null;
  }

  private collectPlayerRooms(
    world: IWorld,
    playerShipEntity: number,
  ): Array<{
    left: number; top: number; right: number; bottom: number;
    systemType: string | undefined;
    systemPowered: boolean;
  }> {
    const result: Array<{
      left: number; top: number; right: number; bottom: number;
      systemType: string | undefined;
      systemPowered: boolean;
    }> = [];

    const entities = world.query(['Room', 'Position', 'Owner']);
    for (const entity of entities) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== playerShipEntity) continue;

      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      const room = world.getComponent<RoomComponent>(entity, 'Room');
      if (pos === undefined || room === undefined) continue;

      const sys = world.getComponent<SystemComponent>(entity, 'System');
      result.push({
        left:          pos.x,
        top:           pos.y,
        right:         pos.x + room.width  * TILE_SIZE,
        bottom:        pos.y + room.height * TILE_SIZE,
        systemType:    sys?.type,
        systemPowered: (sys?.currentPower ?? 0) > 0,
      });
    }
    return result;
  }

  private getRoomAtPosition(
    x: number,
    y: number,
    rooms: Array<{ left: number; top: number; right: number; bottom: number; systemType: string | undefined; systemPowered: boolean }>,
  ): { systemType: string | undefined; systemPowered: boolean } | null {
    for (const room of rooms) {
      if (x >= room.left && x < room.right && y >= room.top && y < room.bottom) {
        return room;
      }
    }
    return null;
  }
}
