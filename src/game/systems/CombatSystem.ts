import { Time } from '../../engine/Time';
import { calculateWeaponCharge } from '../logic/WeaponMath';
import type { Entity } from '../../engine/Entity';
import type { IWorld } from '../../engine/IWorld';
import type { FactionComponent } from '../components/FactionComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { ShipComponent } from '../components/ShipComponent';
import type { SystemComponent } from '../components/SystemComponent';
import type { WeaponComponent } from '../components/WeaponComponent';

/** Cap dt to prevent a single huge frame from firing weapons that weren't actually charged. */
const MAX_DT = 0.1;

/**
 * Manages weapon charging, firing, and instant damage application.
 *
 * Per-frame flow:
 *   1. Clear hitFlash from all player weapons (reset previous frame's flash).
 *   2. Find player ship entity and its WEAPONS system power budget.
 *   3. Iterate player weapons in entity-ID order: power each weapon until budget exhausted.
 *   4. Charge powered weapons; fire fully-charged weapons that have a target.
 *   5. Apply hull + system damage to the enemy ship/room.
 */
export class CombatSystem {
  update(world: IWorld): void {
    const dt = Math.min(Time.deltaTime, MAX_DT);

    const playerShipEntity = this.findShipEntity(world, 'PLAYER');
    if (playerShipEntity === null) return;

    // ── 1. Clear previous frame's hit flash ──────────────────────────────────
    const allPlayerWeapons = this.getShipWeapons(world, playerShipEntity);
    for (const [, weapon] of allPlayerWeapons) {
      weapon.hitFlash = false;
    }

    // ── 2. Compute power budget from player WEAPONS system ───────────────────
    let powerBudget = this.getWeaponSystemPower(world, playerShipEntity);

    // ── 3. Determine which weapons are powered (in entity-ID order) ──────────
    for (const [, weapon] of allPlayerWeapons) {
      if (powerBudget >= weapon.powerRequired) {
        weapon.isPowered = true;
        powerBudget -= weapon.powerRequired;
      } else {
        weapon.isPowered = false;
      }
    }

    // ── 4. Charge and fire ───────────────────────────────────────────────────
    const enemyShipEntity = this.findShipEntity(world, 'ENEMY');

    for (const [, weapon] of allPlayerWeapons) {
      weapon.charge = calculateWeaponCharge(weapon.charge, weapon.maxCharge, weapon.isPowered, dt);

      if (weapon.charge >= weapon.maxCharge && weapon.targetRoomEntity !== undefined) {
        this.fireWeapon(world, weapon, enemyShipEntity);
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private fireWeapon(
    world: IWorld,
    weapon: WeaponComponent,
    enemyShipEntity: Entity | null,
  ): void {
    weapon.charge    = 0;
    weapon.hitFlash  = true;

    // Damage the target room's system capacity (if it has a System).
    if (weapon.targetRoomEntity !== undefined) {
      const system = world.getComponent<SystemComponent>(weapon.targetRoomEntity, 'System');
      if (system !== undefined && system.maxCapacity > 0) {
        system.maxCapacity -= 1;
        // Clamp currentPower so it doesn't exceed the now-reduced capacity.
        if (system.currentPower > system.maxCapacity) {
          system.currentPower = system.maxCapacity;
        }
      }
    }

    // Damage the enemy ship's hull.
    if (enemyShipEntity !== null) {
      const ship = world.getComponent<ShipComponent>(enemyShipEntity, 'Ship');
      if (ship !== undefined && ship.currentHull > 0) {
        ship.currentHull -= 1;
      }
    }
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
