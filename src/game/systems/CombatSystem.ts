import { AssetLoader } from '../../utils/AssetLoader';
import { Time } from '../../engine/Time';
import { TILE_SIZE } from '../constants';
import { calculateWeaponCharge } from '../logic/WeaponMath';
import type { Entity } from '../../engine/Entity';
import type { IWorld } from '../../engine/IWorld';
import type { CloakComponent } from '../components/CloakComponent';
import type { FactionComponent } from '../components/FactionComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { ProjectileComponent } from '../components/ProjectileComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { ShieldComponent } from '../components/ShieldComponent';
import type { ShipComponent } from '../components/ShipComponent';
import type { SystemComponent } from '../components/SystemComponent';
import type { WeaponComponent } from '../components/WeaponComponent';
import type { WeaponTemplate } from '../data/WeaponTemplate';

/**
 * A beam weapon line drawn for a brief duration after firing.
 * RenderSystem reads these each frame to draw the beam visual.
 */
export interface BeamDisplay {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  /** Seconds remaining before the beam visual is removed. */
  timer: number;
}

/** Cap dt to prevent a single huge frame from firing weapons that weren't actually charged. */
const MAX_DT = 0.1;

/** Projectile travel speed in pixels per second. */
const PROJECTILE_SPEED = 600;

/**
 * Manages weapon charging and firing for both player and enemy ships.
 * Damage is deferred — firing spawns a ProjectileComponent entity that travels
 * to the target.  ProjectileSystem handles shield interception and damage on arrival.
 *
 * Per-frame flow for each ship (PLAYER then ENEMY):
 *   1. Find ship entity and its WEAPONS system power budget.
 *   2. Power each weapon in entity-ID order until budget is exhausted.
 *   3. Charge powered weapons; fire fully-charged weapons that have a target.
 *   4. Firing spawns a Projectile entity (no instant damage).
 *      For enemy weapons, the target is cleared after firing so EnemyAISystem
 *      can pick a new room for the next shot.
 */
export class CombatSystem {
  /** Beam visuals rendered for a short duration after a beam fires. */
  private readonly beamDisplays: BeamDisplay[] = [];

  /** Returns the current beam display list (read-only view for RenderSystem). */
  getBeamDisplays(): ReadonlyArray<BeamDisplay> { return this.beamDisplays; }

  update(world: IWorld): void {
    const dt = Math.min(Time.deltaTime, MAX_DT);

    // Tick down and remove expired beam displays.
    for (let i = this.beamDisplays.length - 1; i >= 0; i--) {
      this.beamDisplays[i].timer -= dt;
      if (this.beamDisplays[i].timer <= 0) this.beamDisplays.splice(i, 1);
    }

    for (const faction of (['PLAYER', 'ENEMY'] as const)) {
      const shipEntity = this.findShipEntity(world, faction);
      if (shipEntity === null) continue;
      this.processShip(world, dt, shipEntity, faction === 'ENEMY');
    }
  }

  // ── Per-ship processing ───────────────────────────────────────────────────

  private processShip(
    world: IWorld,
    dt: number,
    shipEntity: Entity,
    isEnemy: boolean,
  ): void {
    const allWeapons = this.getShipWeapons(world, shipEntity);
    const pool = this.getWeaponSystemPower(world, shipEntity);

    if (isEnemy) {
      // ── Enemy: auto-power in entity-ID order ────────────────────────────────
      let powerBudget = pool;
      for (const [, weapon] of allWeapons) {
        if (powerBudget >= weapon.powerRequired) {
          weapon.isPowered = true;
          powerBudget -= weapon.powerRequired;
        } else {
          weapon.isPowered = false;
        }
      }
    } else {
      // ── Player: respect userPowered; auto-disable rightmost if pool exceeded ─
      let totalCost = 0;
      for (const [, weapon] of allWeapons) {
        if (weapon.userPowered) totalCost += weapon.powerRequired;
      }
      // Disable from right (highest entity-id = end of sorted array) until within budget.
      for (let i = allWeapons.length - 1; i >= 0 && totalCost > pool; i--) {
        const [, weapon] = allWeapons[i];
        if (weapon.userPowered) {
          weapon.userPowered = false;
          totalCost -= weapon.powerRequired;
        }
      }
      // isPowered mirrors userPowered for player weapons.
      for (const [, weapon] of allWeapons) {
        weapon.isPowered = weapon.userPowered;
      }
    }

    // ── Charge and fire ─────────────────────────────────────────────────────
    for (const [, weapon] of allWeapons) {
      weapon.charge = calculateWeaponCharge(
        weapon.charge,
        weapon.maxCharge,
        weapon.isPowered,
        dt,
        weapon.chargeRateMultiplier,
      );

      if (weapon.charge >= weapon.maxCharge && weapon.targetRoomEntity !== undefined) {
        const tpl = this.getWeaponTemplate(weapon.templateId);
        if (tpl?.type === 'BEAM') {
          this.fireBeam(world, weapon, shipEntity, isEnemy, tpl);
        } else {
          this.fireWeapon(world, weapon, shipEntity, isEnemy, tpl);
        }
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Resets charge and spawns a traveling Projectile entity.
   * For enemy weapons, clears targetRoomEntity after firing so EnemyAISystem
   * can assign a new target for the next shot.
   *
   * If the player ship is cloaked when firing, the cloak is immediately terminated.
   */
  private fireWeapon(
    world: IWorld,
    weapon: WeaponComponent,
    shipEntity: Entity,
    isEnemy: boolean,
    tpl: WeaponTemplate | undefined,
  ): void {
    weapon.charge = 0;
    if (weapon.targetRoomEntity === undefined) return;

    // Firing while cloaked terminates the cloak.
    if (!isEnemy) {
      const cloak = world.getComponent<CloakComponent>(shipEntity, 'Cloak');
      if (cloak?.isActive === true) {
        cloak.isActive      = false;
        cloak.durationTimer = 0;
        cloak.cooldownTimer = cloak.maxCooldown;
      }
    }

    // Origin: centre of the ship's WEAPONS room.
    const { ox, oy } = this.getOrigin(world, shipEntity);

    // Target: centre of the target room.
    const tPos  = world.getComponent<PositionComponent>(weapon.targetRoomEntity, 'Position');
    const tRoom = world.getComponent<RoomComponent>(weapon.targetRoomEntity, 'Room');
    if (tPos === undefined || tRoom === undefined) return;
    const tx = tPos.x + (tRoom.width  * TILE_SIZE) / 2;
    const ty = tPos.y + (tRoom.height * TILE_SIZE) / 2;

    // Spawn projectile entity.
    const projEntity = world.createEntity();
    const projComp: ProjectileComponent = {
      _type:            'Projectile',
      originX:          ox,
      originY:          oy,
      targetX:          tx,
      targetY:          ty,
      speed:            PROJECTILE_SPEED,
      damage:           tpl?.damage.hull ?? 1,
      targetRoomEntity: weapon.targetRoomEntity,
      isEnemyOrigin:    isEnemy,
      accuracy:         tpl?.accuracy    ?? 1.0,
      neverMisses:      tpl?.neverMisses ?? false,
      weaponType:       tpl?.type        ?? 'LASER',
      ionDamage:        tpl?.damage.ion  ?? 0,
    };
    const posComp: PositionComponent = { _type: 'Position', x: ox, y: oy };

    world.addComponent(projEntity, projComp);
    world.addComponent(projEntity, posComp);

    // Clear target for enemy weapons so AI picks a fresh room next shot.
    if (isEnemy) {
      weapon.targetRoomEntity = undefined;
    }
  }

  /**
   * Fires a beam weapon: instantly damages all enemy rooms whose centre-Y
   * falls within the target room's vertical span.
   *
   * Shield mitigation: each active shield layer reduces the beam's hull damage
   * by 1 (down to 0).  Shield layers are NOT consumed by beams.
   */
  private fireBeam(
    world: IWorld,
    weapon: WeaponComponent,
    shipEntity: Entity,
    isEnemy: boolean,
    tpl: WeaponTemplate,
  ): void {
    weapon.charge = 0;
    if (weapon.targetRoomEntity === undefined) return;

    // Firing while cloaked terminates the cloak.
    if (!isEnemy) {
      const cloak = world.getComponent<CloakComponent>(shipEntity, 'Cloak');
      if (cloak?.isActive === true) {
        cloak.isActive      = false;
        cloak.durationTimer = 0;
        cloak.cooldownTimer = cloak.maxCooldown;
      }
    }

    // Find target ship entity.
    const targetOwner = world.getComponent<OwnerComponent>(weapon.targetRoomEntity, 'Owner');
    if (targetOwner === undefined) return;
    const targetShipEntity = targetOwner.shipEntity;

    // Get active shield layers on the target (beams reduce damage per layer, do NOT consume layers).
    const shield = world.getComponent<ShieldComponent>(targetShipEntity, 'Shield');
    const activeLayers = shield !== undefined ? Math.floor(shield.currentLayers) : 0;
    const effectiveDamage = Math.max(0, tpl.damage.hull - activeLayers);

    // Determine the beam's Y sweep from the target room centre.
    const tPos  = world.getComponent<PositionComponent>(weapon.targetRoomEntity, 'Position');
    const tRoom = world.getComponent<RoomComponent>(weapon.targetRoomEntity, 'Room');
    if (tPos === undefined || tRoom === undefined) return;
    const beamY = tPos.y + (tRoom.height * TILE_SIZE) / 2;

    // Instant multi-room damage: hit every target-ship room whose vertical span contains beamY.
    if (effectiveDamage > 0) {
      const targetShip = world.getComponent<ShipComponent>(targetShipEntity, 'Ship');
      for (const roomEntity of world.query(['Room', 'Position', 'Owner'])) {
        const owner = world.getComponent<OwnerComponent>(roomEntity, 'Owner');
        if (owner?.shipEntity !== targetShipEntity) continue;

        const pos  = world.getComponent<PositionComponent>(roomEntity, 'Position');
        const room = world.getComponent<RoomComponent>(roomEntity, 'Room');
        if (pos === undefined || room === undefined) continue;

        const roomTop    = pos.y;
        const roomBottom = pos.y + room.height * TILE_SIZE;
        if (beamY < roomTop || beamY > roomBottom) continue;

        // Apply system damage.
        const sys = world.getComponent<SystemComponent>(roomEntity, 'System');
        if (sys !== undefined && sys.maxCapacity > 0) {
          sys.maxCapacity  = Math.max(0, sys.maxCapacity  - effectiveDamage);
          sys.damageAmount = sys.damageAmount + effectiveDamage;
          if (sys.currentPower > sys.maxCapacity) sys.currentPower = sys.maxCapacity;
        }

        // Apply hull damage (once per room hit, not per shield).
        if (targetShip !== undefined && targetShip.currentHull > 0) {
          targetShip.currentHull = Math.max(0, targetShip.currentHull - effectiveDamage);
        }
      }
    }

    // Build beam display line for RenderSystem.
    const { ox, oy } = this.getOrigin(world, shipEntity);
    const beamColor  = isEnemy ? '#ff6600' : '#00ff88';
    const endX = tPos.x + (tRoom.width * TILE_SIZE) / 2;
    this.beamDisplays.push({ x1: ox, y1: oy, x2: endX, y2: beamY, color: beamColor, timer: 0.45 });

    // Clear target for enemy so AI picks a fresh room next shot.
    if (isEnemy) weapon.targetRoomEntity = undefined;
  }

  /**
   * Returns the pixel centre of the ship's WEAPONS system room,
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

  /** Returns the WeaponTemplate for the given id, or undefined if not loaded. */
  private getWeaponTemplate(templateId: string): WeaponTemplate | undefined {
    const templates = AssetLoader.getJSON<WeaponTemplate[]>('weapons');
    return templates?.find((t) => t.id === templateId);
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
