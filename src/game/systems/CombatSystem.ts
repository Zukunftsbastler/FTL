import { Time } from '../../engine/Time';
import { TILE_SIZE } from '../constants';
import { calculateWeaponCharge } from '../logic/WeaponMath';
import type { Entity } from '../../engine/Entity';
import type { IWorld } from '../../engine/IWorld';
import type { FactionComponent } from '../components/FactionComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { ProjectileComponent } from '../components/ProjectileComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { SystemComponent } from '../components/SystemComponent';
import type { WeaponComponent } from '../components/WeaponComponent';

/** Cap dt to prevent a single huge frame from firing weapons that weren't actually charged. */
const MAX_DT = 0.1;

/** Projectile travel speed in pixels per second. */
const PROJECTILE_SPEED = 600;

/**
 * Manages weapon charging and firing.  Damage is now deferred — when a weapon
 * fires, a ProjectileComponent entity is spawned and travels to the target.
 * ProjectileSystem handles impact and damage on arrival.
 *
 * Per-frame flow:
 *   1. Find player ship entity and its WEAPONS system power budget.
 *   2. Iterate player weapons in entity-ID order: power each weapon until budget exhausted.
 *   3. Charge powered weapons; fire fully-charged weapons that have a target.
 *   4. Firing spawns a Projectile entity — no instant damage.
 */
export class CombatSystem {
  update(world: IWorld): void {
    const dt = Math.min(Time.deltaTime, MAX_DT);

    const playerShipEntity = this.findShipEntity(world, 'PLAYER');
    if (playerShipEntity === null) return;

    // ── 1. Compute power budget from player WEAPONS system ───────────────────
    const allPlayerWeapons = this.getShipWeapons(world, playerShipEntity);
    let powerBudget = this.getWeaponSystemPower(world, playerShipEntity);

    // ── 2. Determine which weapons are powered (in entity-ID order) ──────────
    for (const [, weapon] of allPlayerWeapons) {
      if (powerBudget >= weapon.powerRequired) {
        weapon.isPowered = true;
        powerBudget -= weapon.powerRequired;
      } else {
        weapon.isPowered = false;
      }
    }

    // ── 3. Charge and fire ───────────────────────────────────────────────────
    for (const [, weapon] of allPlayerWeapons) {
      weapon.charge = calculateWeaponCharge(weapon.charge, weapon.maxCharge, weapon.isPowered, dt);

      if (weapon.charge >= weapon.maxCharge && weapon.targetRoomEntity !== undefined) {
        this.fireWeapon(world, weapon, playerShipEntity);
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Resets charge and spawns a traveling Projectile entity.
   * Damage is applied by ProjectileSystem on impact.
   */
  private fireWeapon(
    world: IWorld,
    weapon: WeaponComponent,
    playerShipEntity: Entity,
  ): void {
    weapon.charge = 0;
    if (weapon.targetRoomEntity === undefined) return;

    // Origin: centre of the player's WEAPONS room (fallback: any owned room).
    const { ox, oy } = this.getOrigin(world, playerShipEntity);

    // Target: centre of the target room.
    const tPos  = world.getComponent<PositionComponent>(weapon.targetRoomEntity, 'Position');
    const tRoom = world.getComponent<RoomComponent>(weapon.targetRoomEntity, 'Room');
    if (tPos === undefined || tRoom === undefined) return;
    const tx = tPos.x + (tRoom.width  * TILE_SIZE) / 2;
    const ty = tPos.y + (tRoom.height * TILE_SIZE) / 2;

    // Spawn projectile entity.
    const projEntity = world.createEntity();
    const projComp: ProjectileComponent = {
      _type: 'Projectile',
      originX: ox,
      originY: oy,
      targetX: tx,
      targetY: ty,
      speed: PROJECTILE_SPEED,
      damage: 1,
      targetRoomEntity: weapon.targetRoomEntity,
      isEnemyOrigin: false,
    };
    const posComp: PositionComponent = { _type: 'Position', x: ox, y: oy };

    world.addComponent(projEntity, projComp);
    world.addComponent(projEntity, posComp);
  }

  /**
   * Returns the pixel centre of the player's WEAPONS system room,
   * falling back to the first owned room if no WEAPONS room is found.
   */
  private getOrigin(world: IWorld, shipEntity: Entity): { ox: number; oy: number } {
    const entities = world.query(['Room', 'System', 'Position', 'Owner']);
    for (const entity of entities) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== shipEntity) continue;
      const sys = world.getComponent<SystemComponent>(entity, 'System');
      if (sys?.type !== 'WEAPONS') continue;
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      const room = world.getComponent<RoomComponent>(entity, 'Room');
      if (pos !== undefined && room !== undefined) {
        return {
          ox: pos.x + (room.width  * TILE_SIZE) / 2,
          oy: pos.y + (room.height * TILE_SIZE) / 2,
        };
      }
    }
    // Fallback: first room owned by this ship.
    for (const entity of world.query(['Room', 'Position', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== shipEntity) continue;
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      const room = world.getComponent<RoomComponent>(entity, 'Room');
      if (pos !== undefined && room !== undefined) {
        return {
          ox: pos.x + (room.width  * TILE_SIZE) / 2,
          oy: pos.y + (room.height * TILE_SIZE) / 2,
        };
      }
    }
    return { ox: 0, oy: 0 };
  }

  private findShipEntity(world: IWorld, factionId: 'PLAYER' | 'ENEMY'): Entity | null {
    const entities = world.query(['Ship', 'Faction']);
    for (const entity of entities) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id === factionId) return entity;
    }
    return null;
  }

  /**
   * Returns the current power allocated to the WEAPONS system on the given ship,
   * or 0 if no such system exists.
   */
  private getWeaponSystemPower(world: IWorld, shipEntity: Entity): number {
    const entities = world.query(['System', 'Owner']);
    for (const entity of entities) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== shipEntity) continue;
      const sys = world.getComponent<SystemComponent>(entity, 'System');
      if (sys?.type === 'WEAPONS') return sys.currentPower;
    }
    return 0;
  }

  /** Returns [entity, WeaponComponent] pairs for a given ship, sorted by entity ID. */
  private getShipWeapons(world: IWorld, shipEntity: Entity): Array<[Entity, WeaponComponent]> {
    const result: Array<[Entity, WeaponComponent]> = [];
    const entities = world.query(['Weapon', 'Owner']);
    for (const entity of entities) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== shipEntity) continue;
      const weapon = world.getComponent<WeaponComponent>(entity, 'Weapon');
      if (weapon !== undefined) result.push([entity, weapon]);
    }
    result.sort(([a], [b]) => a - b);
    return result;
  }
}
