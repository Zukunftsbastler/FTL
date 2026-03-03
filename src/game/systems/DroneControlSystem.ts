import { Time } from '../../engine/Time';
import { AssetLoader } from '../../utils/AssetLoader';
import { TILE_SIZE } from '../constants';
import type { IInput } from '../../engine/IInput';
import type { IWorld } from '../../engine/IWorld';
import type { DroneComponent } from '../components/DroneComponent';
import type { FactionComponent } from '../components/FactionComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { ProjectileComponent } from '../components/ProjectileComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { ShipComponent } from '../components/ShipComponent';
import type { SystemComponent } from '../components/SystemComponent';
import type { DroneTemplate } from '../data/DroneTemplate';

/** Pixels from the target ship's centre that external drones orbit. */
const ORBIT_RADIUS = 120;

/** Angular velocity (radians/s) for orbiting drones. */
const ORBIT_SPEED = 1.2;

/** Seconds between combat-drone auto-fire. */
const DRONE_FIRE_INTERVAL = 6.0;

/** Seconds between repair-drone repair ticks. */
const DRONE_REPAIR_INTERVAL = 1.0;

/** HP repaired per tick by an INTERNAL_SUPPORT drone. */
const DRONE_REPAIR_AMOUNT = 2.0;

/** Travel speed for drone-fired projectiles (px/s). */
const DRONE_PROJECTILE_SPEED = 500;

/**
 * Manages all active drone entities.
 *
 * Activation:
 *   Press 'D' to deploy the first available drone schematic. Requires:
 *     - Player ship has a powered DRONE_CONTROL system.
 *     - Player has ≥ 1 dronePart resource.
 *   Costs 1 dronePart.
 *
 * Drone AI per-frame:
 *   EXTERNAL_COMBAT:  Orbits the enemy ship; auto-fires every DRONE_FIRE_INTERVAL seconds.
 *   EXTERNAL_DEFENSE: Orbits the player ship (placeholder — full intercept logic deferred).
 *   INTERNAL_SUPPORT: Moves toward the most-damaged system room; repairs it each second.
 *   INTERNAL_COMBAT:  Placeholder: moves around player ship (no auto-attack yet).
 *   BOARDING:         Placeholder: moves toward enemy ship area.
 */
export class DroneControlSystem {
  private readonly input: IInput;

  /** Default drone schematic to deploy when pressing 'D'. */
  private readonly DEFAULT_COMBAT_DRONE   = 'combat_drone_1';
  private readonly DEFAULT_INTERNAL_DRONE = 'sys_repair_drone';

  private deployedCombat   = false;
  private deployedInternal = false;

  constructor(input: IInput) {
    this.input = input;
  }

  update(world: IWorld): void {
    const dt = Time.deltaTime;

    // ── Activation: 'D' deploys drones ────────────────────────────────────────
    if (this.input.isKeyJustPressed('KeyD')) {
      this.tryDeployDrones(world);
    }

    // ── Per-frame drone AI ──────────────────────────────────────────────────────
    for (const entity of world.query(['Drone', 'Position', 'Owner'])) {
      const drone = world.getComponent<DroneComponent>(entity, 'Drone');
      const pos   = world.getComponent<PositionComponent>(entity, 'Position');
      if (drone === undefined || pos === undefined) continue;

      switch (drone.droneType) {
        case 'EXTERNAL_COMBAT':
          this.tickExternalCombat(world, entity, drone, pos, dt);
          break;
        case 'EXTERNAL_DEFENSE':
          this.tickExternalDefense(world, entity, drone, pos, dt);
          break;
        case 'INTERNAL_SUPPORT':
          this.tickInternalSupport(world, entity, drone, pos, dt);
          break;
        case 'INTERNAL_COMBAT':
        case 'BOARDING':
          // Placeholder movement: orbit the player ship.
          this.tickInternalPlaceholder(world, entity, drone, pos, dt);
          break;
      }
    }
  }

  // ── Activation ─────────────────────────────────────────────────────────────

  private tryDeployDrones(world: IWorld): void {
    const { shipEntity, ship } = this.getPlayerShip(world);
    if (shipEntity === undefined || ship === undefined) return;

    // Check DRONE_CONTROL system is powered.
    if (!this.isDroneControlPowered(world, shipEntity)) return;

    if (ship.droneParts <= 0) return;

    // Deploy a combat drone if not already active.
    if (!this.deployedCombat) {
      if (this.spawnDrone(world, this.DEFAULT_COMBAT_DRONE, 'PLAYER', ship)) {
        this.deployedCombat = true;
        ship.droneParts -= 1;
      }
    } else if (!this.deployedInternal) {
      // Second press deploys an internal repair drone.
      if (ship.droneParts > 0 && this.spawnDrone(world, this.DEFAULT_INTERNAL_DRONE, 'PLAYER', ship)) {
        this.deployedInternal = true;
        ship.droneParts -= 1;
      }
    }
  }

  private spawnDrone(
    world: IWorld,
    droneId: string,
    faction: 'PLAYER' | 'ENEMY',
    ship: ShipComponent,
  ): boolean {
    const templates = AssetLoader.getJSON<DroneTemplate[]>('drones');
    const tpl = templates?.find((d) => d.id === droneId);
    if (tpl === undefined) return false;

    void ship; // used indirectly via faction/droneParts above

    // Find spawn position: first player room centre.
    const spawnPos = this.getPlayerShipCentre(world);
    if (spawnPos === null) return false;

    const droneEntity = world.createEntity();

    const droneComp: DroneComponent = {
      _type:        'Drone',
      droneId:      tpl.id,
      droneType:    tpl.type,
      speed:        tpl.speed,
      weaponId:     tpl.weaponId,
      health:       tpl.health,
      maxHealth:    tpl.health,
      actionTimer:  tpl.type === 'INTERNAL_SUPPORT' ? DRONE_REPAIR_INTERVAL : DRONE_FIRE_INTERVAL,
      orbitAngle:   Math.random() * Math.PI * 2,
      ownerFaction: faction,
    };
    const posComp: PositionComponent = {
      _type: 'Position',
      x: spawnPos.x,
      y: spawnPos.y,
    };

    const { shipEntity } = this.getPlayerShip(world);
    if (shipEntity === undefined) return false;

    const ownerComp: OwnerComponent = { _type: 'Owner', shipEntity };

    world.addComponent(droneEntity, droneComp);
    world.addComponent(droneEntity, posComp);
    world.addComponent(droneEntity, ownerComp);
    return true;
  }

  // ── Drone AI per type ──────────────────────────────────────────────────────

  private tickExternalCombat(
    world: IWorld,
    _entity: number,
    drone: DroneComponent,
    pos: PositionComponent,
    dt: number,
  ): void {
    // Orbit the enemy ship centre.
    const centre = this.getEnemyShipCentre(world);
    if (centre !== null) {
      drone.orbitAngle += ORBIT_SPEED * dt;
      pos.x = centre.x + Math.cos(drone.orbitAngle) * ORBIT_RADIUS;
      pos.y = centre.y + Math.sin(drone.orbitAngle) * ORBIT_RADIUS;
    }

    // Auto-fire at random enemy room.
    drone.actionTimer -= dt;
    if (drone.actionTimer <= 0) {
      drone.actionTimer = DRONE_FIRE_INTERVAL;
      this.fireDroneProjectile(world, pos, true /* targeting enemy */);
    }
  }

  private tickExternalDefense(
    world: IWorld,
    _entity: number,
    drone: DroneComponent,
    pos: PositionComponent,
    dt: number,
  ): void {
    // Orbit the player ship centre.
    const centre = this.getPlayerShipCentre(world);
    if (centre !== null) {
      drone.orbitAngle += ORBIT_SPEED * dt;
      pos.x = centre.x + Math.cos(drone.orbitAngle) * ORBIT_RADIUS;
      pos.y = centre.y + Math.sin(drone.orbitAngle) * ORBIT_RADIUS;
    }
    // Full intercept logic deferred — defense drone is passive for now.
  }

  private tickInternalSupport(
    world: IWorld,
    _entity: number,
    drone: DroneComponent,
    pos: PositionComponent,
    dt: number,
  ): void {
    // Move toward the most-damaged player system room.
    const target = this.findMostDamagedPlayerRoom(world);
    if (target !== null) {
      const dx = target.cx - pos.x;
      const dy = target.cy - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 2) {
        const step = 60 * drone.speed * dt;
        pos.x += (dx / dist) * Math.min(step, dist);
        pos.y += (dy / dist) * Math.min(step, dist);
      } else {
        // Arrived — repair tick.
        drone.actionTimer -= dt;
        if (drone.actionTimer <= 0) {
          drone.actionTimer = DRONE_REPAIR_INTERVAL;
          if (target.system !== undefined && target.system.damageAmount > 0) {
            target.system.damageAmount = Math.max(0, target.system.damageAmount - DRONE_REPAIR_AMOUNT);
          }
        }
      }
    }
  }

  private tickInternalPlaceholder(
    world: IWorld,
    _entity: number,
    drone: DroneComponent,
    pos: PositionComponent,
    dt: number,
  ): void {
    // Simple drift toward player ship centre.
    const centre = this.getPlayerShipCentre(world);
    if (centre !== null) {
      drone.orbitAngle += 0.5 * dt;
      const targetX = centre.x + Math.cos(drone.orbitAngle) * 40;
      const targetY = centre.y + Math.sin(drone.orbitAngle) * 40;
      pos.x += (targetX - pos.x) * 2 * dt;
      pos.y += (targetY - pos.y) * 2 * dt;
    }
  }

  // ── Combat helpers ─────────────────────────────────────────────────────────

  private fireDroneProjectile(world: IWorld, origin: PositionComponent, targetEnemy: boolean): void {
    const rooms = targetEnemy
      ? this.collectEnemyRooms(world)
      : this.collectPlayerRooms(world);
    if (rooms.length === 0) return;

    const target = rooms[Math.floor(Math.random() * rooms.length)];

    const projEntity = world.createEntity();
    const projComp: ProjectileComponent = {
      _type:            'Projectile',
      originX:          origin.x,
      originY:          origin.y,
      targetX:          target.cx,
      targetY:          target.cy,
      speed:            DRONE_PROJECTILE_SPEED,
      damage:           1,
      targetRoomEntity: target.entity,
      isEnemyOrigin:    !targetEnemy,
      accuracy:         0.9,
      neverMisses:      false,
      weaponType:       'LASER',
      ionDamage:        0,
      fireChance:       0,
      breachChance:     0,
    };
    const posComp: PositionComponent = { _type: 'Position', x: origin.x, y: origin.y };
    world.addComponent(projEntity, projComp);
    world.addComponent(projEntity, posComp);
  }

  // ── World query helpers ────────────────────────────────────────────────────

  private getPlayerShip(world: IWorld): { shipEntity: number | undefined; ship: ShipComponent | undefined } {
    for (const entity of world.query(['Ship', 'Faction'])) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;
      return { shipEntity: entity, ship: world.getComponent<ShipComponent>(entity, 'Ship') };
    }
    return { shipEntity: undefined, ship: undefined };
  }

  private getPlayerShipCentre(world: IWorld): { x: number; y: number } | null {
    for (const entity of world.query(['Room', 'Position', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp === undefined) continue;
      const faction = world.getComponent<FactionComponent>(ownerComp.shipEntity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      const room = world.getComponent<RoomComponent>(entity, 'Room');
      if (pos !== undefined && room !== undefined) {
        return {
          x: pos.x + (room.width  * TILE_SIZE) / 2,
          y: pos.y + (room.height * TILE_SIZE) / 2,
        };
      }
    }
    return null;
  }

  private getEnemyShipCentre(world: IWorld): { x: number; y: number } | null {
    for (const entity of world.query(['Room', 'Position', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp === undefined) continue;
      const faction = world.getComponent<FactionComponent>(ownerComp.shipEntity, 'Faction');
      if (faction?.id !== 'ENEMY') continue;
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      const room = world.getComponent<RoomComponent>(entity, 'Room');
      if (pos !== undefined && room !== undefined) {
        return {
          x: pos.x + (room.width  * TILE_SIZE) / 2,
          y: pos.y + (room.height * TILE_SIZE) / 2,
        };
      }
    }
    return null;
  }

  private findMostDamagedPlayerRoom(
    world: IWorld,
  ): { cx: number; cy: number; system: SystemComponent | undefined } | null {
    let best: { cx: number; cy: number; system: SystemComponent; damage: number } | null = null;

    for (const entity of world.query(['Room', 'Position', 'Owner', 'System'])) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp === undefined) continue;
      const faction = world.getComponent<FactionComponent>(ownerComp.shipEntity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;

      const sys  = world.getComponent<SystemComponent>(entity, 'System');
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      const room = world.getComponent<RoomComponent>(entity, 'Room');
      if (sys === undefined || pos === undefined || room === undefined) continue;
      if (sys.damageAmount <= 0) continue;

      if (best === null || sys.damageAmount > best.damage) {
        best = {
          cx:     pos.x + (room.width  * TILE_SIZE) / 2,
          cy:     pos.y + (room.height * TILE_SIZE) / 2,
          system: sys,
          damage: sys.damageAmount,
        };
      }
    }
    return best;
  }

  private collectEnemyRooms(world: IWorld): Array<{ entity: number; cx: number; cy: number }> {
    return this.collectRoomsForFaction(world, 'ENEMY');
  }

  private collectPlayerRooms(world: IWorld): Array<{ entity: number; cx: number; cy: number }> {
    return this.collectRoomsForFaction(world, 'PLAYER');
  }

  private collectRoomsForFaction(
    world: IWorld,
    factionId: 'PLAYER' | 'ENEMY',
  ): Array<{ entity: number; cx: number; cy: number }> {
    const result: Array<{ entity: number; cx: number; cy: number }> = [];
    for (const entity of world.query(['Room', 'Position', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp === undefined) continue;
      const faction = world.getComponent<FactionComponent>(ownerComp.shipEntity, 'Faction');
      if (faction?.id !== factionId) continue;
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      const room = world.getComponent<RoomComponent>(entity, 'Room');
      if (pos !== undefined && room !== undefined) {
        result.push({
          entity,
          cx: pos.x + (room.width  * TILE_SIZE) / 2,
          cy: pos.y + (room.height * TILE_SIZE) / 2,
        });
      }
    }
    return result;
  }

  private isDroneControlPowered(world: IWorld, shipEntity: number): boolean {
    for (const entity of world.query(['System', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== shipEntity) continue;
      const sys = world.getComponent<SystemComponent>(entity, 'System');
      if (sys?.type === 'DRONE_CONTROL') return sys.currentPower > 0;
    }
    return false;
  }
}
