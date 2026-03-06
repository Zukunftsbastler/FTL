import { Time } from '../../engine/Time';
import { TILE_SIZE } from '../constants';
import type { IWorld } from '../../engine/IWorld';
import type { FactionComponent } from '../components/FactionComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { ProjectileComponent } from '../components/ProjectileComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { SystemComponent } from '../components/SystemComponent';
import type { WeaponComponent } from '../components/WeaponComponent';
import type { MapSystem } from './MapSystem';

/** Seconds between asteroid strikes. */
const ASTEROID_INTERVAL_MIN = 3.0;
const ASTEROID_INTERVAL_MAX = 7.0;

/** Seconds between solar flare damage pulses. */
const SOLAR_FLARE_INTERVAL_MIN = 8.0;
const SOLAR_FLARE_INTERVAL_MAX = 15.0;

/** Damage dealt to a random system by a solar flare pulse. */
const SOLAR_FLARE_DAMAGE = 3;

/** Charge-rate penalty fraction in an ION_STORM (weapons charge 50% slower). */
const ION_STORM_CHARGE_PENALTY = 0.5;

/** Travel speed of asteroid projectiles (px/s). */
const ASTEROID_SPEED = 450;

/**
 * Applies environmental combat hazards based on the current map node.
 *
 * ASTEROIDS:   Spawns random projectiles targeting the player ship every 3–7 s.
 * SOLAR_FLARE: Deals 3 damage to a random player system every 8–15 s.
 * ION_STORM:   Penalises all player weapon charge rates by 50%.
 * NEBULA:      No per-frame damage; exposes `isNebula()` for the render overlay.
 *
 * Call update() only while in COMBAT state.
 */
export class HazardSystem {
  private readonly mapSystem: MapSystem;
  private asteroidTimer: number = 0;
  private solarTimer:    number = 0;

  constructor(mapSystem: MapSystem) {
    this.mapSystem    = mapSystem;
    this.asteroidTimer = this.nextAsteroidInterval();
    this.solarTimer    = this.nextSolarInterval();
  }

  /** Returns true when the current node is inside a nebula (for render overlays). */
  isNebula(): boolean {
    return this.mapSystem.getCurrentNodeHazard() === 'NEBULA';
  }

  /** Returns the active hazard type for the current node, or null if none. */
  currentHazard(): string | null {
    return this.mapSystem.getCurrentNodeHazard();
  }

  update(world: IWorld): void {
    const dt      = Time.deltaTime;
    const hazard  = this.mapSystem.getCurrentNodeHazard();

    if (hazard === null) return;

    switch (hazard) {
      case 'ASTEROIDS':   this.tickAsteroids(world, dt);   break;
      case 'SOLAR_FLARE': this.tickSolarFlare(world, dt);  break;
      case 'ION_STORM':   this.tickIonStorm(world);        break;
      // NEBULA: passive — no per-frame effect beyond the render flag.
    }
  }

  // ── Hazard implementations ────────────────────────────────────────────────

  private tickAsteroids(world: IWorld, dt: number): void {
    this.asteroidTimer -= dt;
    if (this.asteroidTimer > 0) return;

    this.asteroidTimer = this.nextAsteroidInterval();

    // Pick a random player room as the target.
    const playerRooms = this.collectPlayerRooms(world);
    if (playerRooms.length === 0) return;
    const target = playerRooms[Math.floor(Math.random() * playerRooms.length)];

    // Spawn the asteroid from the top of the screen.
    const originX = Math.random() * 400 + target.cx - 200;
    const originY = -30;

    const projEntity = world.createEntity();
    const projComp: ProjectileComponent = {
      _type:            'Projectile',
      originX,
      originY,
      targetX:          target.cx,
      targetY:          target.cy,
      speed:            ASTEROID_SPEED,
      damage:           1,
      targetRoomEntity: target.entity,
      isEnemyOrigin:    true,
      accuracy:         1.0,
      neverMisses:      true,
      weaponType:       'LASER',
      visualType:       'LASER',
      ionDamage:        0,
      fireChance:       0,
      breachChance:     0,
      history:          [],
    };
    const posComp: PositionComponent = {
      _type: 'Position',
      x: originX,
      y: originY,
    };
    world.addComponent(projEntity, projComp);
    world.addComponent(projEntity, posComp);
  }

  private tickSolarFlare(world: IWorld, dt: number): void {
    this.solarTimer -= dt;
    if (this.solarTimer > 0) return;

    this.solarTimer = this.nextSolarInterval();

    // Select a random damaged-or-undamaged player system and deal fire damage.
    const systems = this.collectPlayerSystems(world);
    if (systems.length === 0) return;

    const target = systems[Math.floor(Math.random() * systems.length)];
    target.damageAmount += SOLAR_FLARE_DAMAGE;
    if (target.damageAmount > target.maxCapacity) target.damageAmount = target.maxCapacity;
  }

  private tickIonStorm(world: IWorld): void {
    // Penalise all player weapon charge rates to simulate reduced power capacity.
    for (const entity of world.query(['Weapon', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp === undefined) continue;

      // Only penalise if this weapon belongs to the player ship.
      if (!this.isPlayerShip(world, ownerComp.shipEntity)) continue;

      const weapon = world.getComponent<WeaponComponent>(entity, 'Weapon');
      if (weapon !== undefined) {
        weapon.chargeRateMultiplier = Math.min(
          weapon.chargeRateMultiplier,
          ION_STORM_CHARGE_PENALTY,
        );
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private collectPlayerRooms(
    world: IWorld,
  ): Array<{ entity: number; cx: number; cy: number }> {
    const result: Array<{ entity: number; cx: number; cy: number }> = [];
    for (const entity of world.query(['Room', 'Position', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp === undefined || !this.isPlayerShip(world, ownerComp.shipEntity)) continue;
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

  private collectPlayerSystems(world: IWorld): SystemComponent[] {
    const result: SystemComponent[] = [];
    for (const entity of world.query(['System', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp === undefined || !this.isPlayerShip(world, ownerComp.shipEntity)) continue;
      const sys = world.getComponent<SystemComponent>(entity, 'System');
      if (sys !== undefined) result.push(sys);
    }
    return result;
  }

  private isPlayerShip(world: IWorld, shipEntity: number): boolean {
    const faction = world.getComponent<FactionComponent>(shipEntity, 'Faction');
    return faction?.id === 'PLAYER';
  }

  private nextAsteroidInterval(): number {
    return ASTEROID_INTERVAL_MIN + Math.random() * (ASTEROID_INTERVAL_MAX - ASTEROID_INTERVAL_MIN);
  }

  private nextSolarInterval(): number {
    return SOLAR_FLARE_INTERVAL_MIN +
      Math.random() * (SOLAR_FLARE_INTERVAL_MAX - SOLAR_FLARE_INTERVAL_MIN);
  }
}
