import { Time } from '../../engine/Time';
import { TILE_SIZE } from '../constants';
import { awardXP } from '../logic/CrewXP';
import { FIRE_HEALTH_INITIAL, BREACH_HEALTH_INITIAL } from './OxygenSystem';
import type { ExplosionSystem } from './ExplosionSystem';
import type { ParticleSystem } from './ParticleSystem';
import type { IWorld } from '../../engine/IWorld';
import type { CrewComponent } from '../components/CrewComponent';
import type { FactionComponent } from '../components/FactionComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { ProjectileComponent } from '../components/ProjectileComponent';
import type { ReactorComponent } from '../components/ReactorComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { ShieldComponent } from '../components/ShieldComponent';
import type { ShipComponent } from '../components/ShipComponent';
import type { SystemComponent } from '../components/SystemComponent';

/** Direct HP dealt to every crew member standing in a room hit by a projectile. */
const CREW_HIT_DAMAGE = 15;

/** Cap dt so a tab backgrounded for a long time doesn't teleport projectiles. */
const MAX_DT = 0.1;

/**
 * Factor by which the overshoot target extends beyond the intended room centre.
 * 4× sends the projectile roughly 4× the origin→target distance off-screen.
 */
const MISS_OVERSHOOT_FACTOR = 4.0;

/**
 * Probability that a shot which would otherwise "hit" lands on a random other
 * room instead of the intended target (scatter / near-miss).
 */
const NEAR_MISS_CHANCE = 0.08;

/**
 * Advances all projectiles toward their targets each frame.
 *
 * Accuracy / evasion roll (performed once per projectile on its first frame):
 *   hitChance = clamp(accuracy - targetShip.evasion, 0.05, 1.0)
 *   neverMisses = true → roll skipped, always hits.
 *
 * On full MISS:
 *   • targetX/Y redirected to an overshoot point past the enemy ship.
 *   • No damage; miss display position stored for RenderSystem "MISS" text.
 *
 * On NEAR-MISS (8 % of hits):
 *   • Projectile redirected to a random other room on the same ship.
 *   • Damage still applies (to the new room).
 *
 * On HIT — shield check first:
 *   • If target ship has ≥ 1 shield layer: deplete 1 layer, destroy projectile (no hull damage).
 *     Ship is added to shieldHitShips for the visual flash in RenderSystem.
 *   • Else: damage system damageAmount, reduce hull — add room to impactedRooms for flash.
 */
export class ProjectileSystem {
  /** Injected after construction — used to spawn impact spark bursts. */
  private particleSystem: ParticleSystem | null = null;
  /** Injected after construction — used to spawn noise-dissolve explosion VFX. */
  private explosionSystem: ExplosionSystem | null = null;

  /** Room entities damaged this frame — cleared at start of each update(). */
  private readonly impactedRooms = new Set<number>();

  /** Ship entities whose shields absorbed a hit this frame — cleared each update(). */
  private readonly shieldHitShips = new Set<number>();

  /**
   * True if a player LASER hit collapsed the enemy's last shield layer this update.
   * Read + cleared by `getAndClearLaserCollapsedEnemyShield()`.
   */
  private laserCollapsedEnemyShieldThisUpdate = false;

  /**
   * True if a player MISSILE successfully hit the enemy ship (bypassed shields) this update.
   * Read + cleared by `getAndClearPlayerMissileHitEnemy()`.
   */
  private playerMissileHitEnemyThisUpdate = false;

  /**
   * Projectile entities already evaluated for accuracy (Set cleared when entity destroyed).
   */
  private readonly evaluatedProjectiles = new Set<number>();

  /**
   * Maps projectile entity → display position for "MISS" text.
   * Entry removed when the projectile is destroyed.
   */
  private readonly missMap = new Map<number, { displayX: number; displayY: number }>();

  setParticleSystem(ps: ParticleSystem): void { this.particleSystem = ps; }
  setExplosionSystem(es: ExplosionSystem): void { this.explosionSystem = es; }

  getImpactedRooms(): ReadonlySet<number> { return this.impactedRooms; }
  getShieldHitShips(): ReadonlySet<number> { return this.shieldHitShips; }

  /** Returns true (and clears the flag) if a player laser just collapsed an enemy shield layer to 0. */
  getAndClearLaserCollapsedEnemyShield(): boolean {
    const v = this.laserCollapsedEnemyShieldThisUpdate;
    this.laserCollapsedEnemyShieldThisUpdate = false;
    return v;
  }

  /** Returns true (and clears the flag) if a player missile just hit the enemy ship this update. */
  getAndClearPlayerMissileHitEnemy(): boolean {
    const v = this.playerMissileHitEnemyThisUpdate;
    this.playerMissileHitEnemyThisUpdate = false;
    return v;
  }

  /**
   * Returns canvas positions where "MISS" should be rendered this frame.
   * Each entry is the centre of the room that was originally targeted.
   */
  getMissDisplays(): ReadonlyArray<{ x: number; y: number }> {
    const result: Array<{ x: number; y: number }> = [];
    for (const d of this.missMap.values()) result.push({ x: d.displayX, y: d.displayY });
    return result;
  }

  update(world: IWorld): void {
    this.impactedRooms.clear();
    this.shieldHitShips.clear();
    this.laserCollapsedEnemyShieldThisUpdate = false;
    this.playerMissileHitEnemyThisUpdate = false;
    const dt = Math.min(Time.deltaTime, MAX_DT);

    const entities = world.query(['Projectile', 'Position']);
    for (const entity of entities) {
      const proj = world.getComponent<ProjectileComponent>(entity, 'Projectile');
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      if (proj === undefined || pos === undefined) continue;

      // ── Accuracy roll (once per projectile) ───────────────────────────────
      if (!this.evaluatedProjectiles.has(entity)) {
        this.evaluatedProjectiles.add(entity);
        this.evaluateAccuracy(world, entity, proj);
      }

      const dx   = proj.targetX - pos.x;
      const dy   = proj.targetY - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const step = proj.speed * dt;

      if (dist <= step) {
        pos.x = proj.targetX;
        pos.y = proj.targetY;

        if (this.missMap.has(entity)) {
          // Complete miss — no damage, "MISS" text already shown while in flight.
          this.missMap.delete(entity);
        } else if (proj.targetRoomEntity !== undefined) {
          // Check shields before applying damage.
          const shielded = this.checkAndAbsorbShield(world, proj.targetRoomEntity, proj);
          if (shielded) {
            // Shield absorbed the hit — spawn sparks at the impact point.
            this.particleSystem?.spawnBurst(proj.targetX, proj.targetY, 10);
          } else {
            this.applyImpact(world, proj);
            this.impactedRooms.add(proj.targetRoomEntity);

            // Reactive tutorial: player MISSILE successfully hitting enemy.
            if (proj.weaponType === 'MISSILE' && !proj.isEnemyOrigin) {
              const missileOwner = world.getComponent<OwnerComponent>(proj.targetRoomEntity, 'Owner');
              const missileFac   = world.getComponent<FactionComponent>(
                missileOwner?.shipEntity ?? -1, 'Faction',
              );
              if (missileFac?.id === 'ENEMY') {
                this.playerMissileHitEnemyThisUpdate = true;
              }
            }

            // Spawn noise-dissolve explosion scaled by weapon damage.
            this.explosionSystem?.spawnExplosion(
              world, proj.targetX, proj.targetY, proj.weaponType, proj.damage,
            );
            // Deal direct hit damage to all crew in the room.
            if (proj.damage > 0) {
              this.damageCrew(world, proj.targetRoomEntity, CREW_HIT_DAMAGE);
            }
            // Award gunnery XP to the player crew member manning the WEAPONS room.
            if (!proj.isEnemyOrigin) {
              this.awardGunneryXP(world);
            }
          }
        }

        this.evaluatedProjectiles.delete(entity);
        world.destroyEntity(entity);
      } else {
        const nx = dx / dist;
        const ny = dy / dist;
        pos.x += nx * step;
        pos.y += ny * step;
        // Record position for trail rendering; keep at most 8 entries.
        proj.history.push({ x: pos.x, y: pos.y });
        if (proj.history.length > 8) proj.history.shift();
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Rolls accuracy vs evasion for a newly spawned projectile.
   * Mutates proj.targetX/Y and proj.targetRoomEntity on miss/near-miss.
   */
  private evaluateAccuracy(world: IWorld, entity: number, proj: ProjectileComponent): void {
    if (proj.neverMisses || proj.targetRoomEntity === undefined) return;

    const evasion   = this.getTargetShipEvasion(world, proj.targetRoomEntity);
    const hitChance = Math.max(0.05, Math.min(1.0, proj.accuracy - evasion));

    if (Math.random() > hitChance) {
      // Full miss.
      const displayX = proj.targetX;
      const displayY = proj.targetY;
      const dx = proj.targetX - proj.originX;
      const dy = proj.targetY - proj.originY;
      proj.targetX = proj.originX + dx * MISS_OVERSHOOT_FACTOR;
      proj.targetY = proj.originY + dy * MISS_OVERSHOOT_FACTOR;
      proj.targetRoomEntity = undefined;
      this.missMap.set(entity, { displayX, displayY });
      return;
    }

    // Near-miss scatter.
    if (Math.random() < NEAR_MISS_CHANCE) {
      const redirect = this.findNearMissTarget(world, proj.targetRoomEntity);
      if (redirect !== null) {
        proj.targetRoomEntity = redirect.entity;
        proj.targetX = redirect.x;
        proj.targetY = redirect.y;
      }
    }
  }

  /**
   * If the ship owning `targetRoomEntity` has an active shield layer, deplete it
   * and record the ship for the visual flash.
   *
   * Weapon-type rules:
   *   MISSILE — bypasses shields entirely (returns false immediately).
   *   ION     — absorbed by shields AND applies ion damage to the SHIELDS system.
   *   LASER   — absorbed normally (hull/system damage negated, one layer depleted).
   *
   * @returns true if a shield absorbed the hit (no further damage should be applied).
   */
  private checkAndAbsorbShield(
    world: IWorld,
    targetRoomEntity: number,
    proj: ProjectileComponent,
  ): boolean {
    // Missiles pierce shields.
    if (proj.weaponType === 'MISSILE') return false;

    const ownerComp = world.getComponent<OwnerComponent>(targetRoomEntity, 'Owner');
    if (ownerComp === undefined) return false;

    const shield = world.getComponent<ShieldComponent>(ownerComp.shipEntity, 'Shield');
    if (shield === undefined) return false;

    const activeLayers = Math.floor(shield.currentLayers);
    if (activeLayers < 1) return false;

    // Deplete one layer and reset fractional progress.
    shield.currentLayers = activeLayers - 1;
    this.shieldHitShips.add(ownerComp.shipEntity);

    // Reactive tutorial: player LASER collapsing enemy's last shield layer.
    if (
      proj.weaponType === 'LASER' &&
      activeLayers === 1 &&
      !proj.isEnemyOrigin
    ) {
      const fac = world.getComponent<FactionComponent>(ownerComp.shipEntity, 'Faction');
      if (fac?.id === 'ENEMY') {
        this.laserCollapsedEnemyShieldThisUpdate = true;
      }
    }

    // ION: additionally damage the SHIELDS system (power disruption).
    if (proj.ionDamage > 0) {
      this.applyIonToShieldsSystem(world, ownerComp.shipEntity, proj.ionDamage);
    }

    return true;
  }

  /**
   * Adds ion damage to the SHIELDS system of the given ship.
   * Ion damage increments `damageAmount` without reducing `maxCapacity`,
   * temporarily disrupting shield recharge until repaired.
   */
  private applyIonToShieldsSystem(world: IWorld, shipEntity: number, ionDamage: number): void {
    for (const roomEntity of world.query(['System', 'Owner'])) {
      const owner = world.getComponent<OwnerComponent>(roomEntity, 'Owner');
      if (owner?.shipEntity !== shipEntity) continue;
      const sys = world.getComponent<SystemComponent>(roomEntity, 'System');
      if (sys?.type === 'SHIELDS') {
        sys.damageAmount += ionDamage;
        return;
      }
    }
  }

  private getTargetShipEvasion(world: IWorld, targetRoomEntity: number): number {
    const ownerComp = world.getComponent<OwnerComponent>(targetRoomEntity, 'Owner');
    if (ownerComp === undefined) return 0;
    const ship = world.getComponent<ShipComponent>(ownerComp.shipEntity, 'Ship');
    return ship?.evasion ?? 0;
  }

  private findNearMissTarget(
    world: IWorld,
    originalTarget: number,
  ): { entity: number; x: number; y: number } | null {
    const ownerComp = world.getComponent<OwnerComponent>(originalTarget, 'Owner');
    if (ownerComp === undefined) return null;

    const candidates: Array<{ entity: number; x: number; y: number }> = [];
    for (const roomEntity of world.query(['Room', 'Position', 'Owner'])) {
      if (roomEntity === originalTarget) continue;
      const owner = world.getComponent<OwnerComponent>(roomEntity, 'Owner');
      if (owner?.shipEntity !== ownerComp.shipEntity) continue;
      const pos  = world.getComponent<PositionComponent>(roomEntity, 'Position');
      const room = world.getComponent<RoomComponent>(roomEntity, 'Room');
      if (pos === undefined || room === undefined) continue;
      candidates.push({
        entity: roomEntity,
        x: pos.x + (room.width  * TILE_SIZE) / 2,
        y: pos.y + (room.height * TILE_SIZE) / 2,
      });
    }

    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  private applyImpact(world: IWorld, proj: ProjectileComponent): void {
    if (proj.targetRoomEntity === undefined) return;

    const room      = world.getComponent<RoomComponent>(proj.targetRoomEntity, 'Room');
    const system    = world.getComponent<SystemComponent>(proj.targetRoomEntity, 'System');
    const ownerComp = world.getComponent<OwnerComponent>(proj.targetRoomEntity, 'Owner');

    // Physical damage: reduce system capacity by actual weapon damage (clamped to remaining capacity).
    if (proj.damage > 0 && system !== undefined && system.maxCapacity > 0) {
      const sysDmg = Math.min(system.maxCapacity, proj.damage);
      system.maxCapacity  -= sysDmg;
      system.damageAmount += proj.damage;
      if (system.currentPower > system.maxCapacity) {
        const lostPower = system.currentPower - system.maxCapacity;
        system.currentPower = system.maxCapacity;
        // Refund the lost power to the ship's reactor so it isn't permanently leaked.
        if (ownerComp !== undefined) {
          const reactor = world.getComponent<ReactorComponent>(ownerComp.shipEntity, 'Reactor');
          if (reactor !== undefined) reactor.currentPower += lostPower;
        }
      }
    }

    // Ion damage: disrupts the targeted system without reducing maxCapacity.
    if (proj.ionDamage > 0 && system !== undefined) {
      system.damageAmount += proj.ionDamage;
    }

    if (proj.damage > 0) {
      if (ownerComp === undefined) return;
      const ship = world.getComponent<ShipComponent>(ownerComp.shipEntity, 'Ship');
      if (ship !== undefined && ship.currentHull > 0) {
        ship.currentHull -= proj.damage;
        if (ship.currentHull < 0) ship.currentHull = 0;
      }
    }

    // Secondary hazard effects: fire and breach.
    if (room !== undefined) {
      if (proj.fireChance > 0 && Math.random() < proj.fireChance && !room.hasFire) {
        room.hasFire    = true;
        room.fireHealth = FIRE_HEALTH_INITIAL;
      }
      if (proj.breachChance > 0 && Math.random() < proj.breachChance && !room.hasBreach) {
        room.hasBreach    = true;
        room.breachHealth = BREACH_HEALTH_INITIAL;
      }
    }
  }

  /**
   * Finds the PLAYER ship entity, then finds any crew member currently occupying the
   * WEAPONS room, and awards them +1 gunnery XP.
   * Called once per confirmed player-projectile hit (not shielded, not a miss).
   */
  /**
   * Deals `damage` HP to every crew member whose pixel position falls inside
   * the hit room.  Destroys any crew whose health reaches 0.
   */
  private damageCrew(world: IWorld, targetRoomEntity: number, damage: number): void {
    const roomPos  = world.getComponent<PositionComponent>(targetRoomEntity, 'Position');
    const roomComp = world.getComponent<RoomComponent>(targetRoomEntity, 'Room');
    if (roomPos === undefined || roomComp === undefined) return;

    const left   = roomPos.x;
    const top    = roomPos.y;
    const right  = roomPos.x + roomComp.width  * TILE_SIZE;
    const bottom = roomPos.y + roomComp.height * TILE_SIZE;

    const toDestroy: number[] = [];
    for (const crewEntity of world.query(['Crew', 'Position'])) {
      const pos  = world.getComponent<PositionComponent>(crewEntity, 'Position');
      if (pos === undefined) continue;
      if (pos.x >= left && pos.x < right && pos.y >= top && pos.y < bottom) {
        const crew = world.getComponent<CrewComponent>(crewEntity, 'Crew');
        if (crew === undefined) continue;
        crew.health -= damage;
        if (crew.health <= 0) toDestroy.push(crewEntity);
      }
    }
    for (const e of toDestroy) world.destroyEntity(e);
  }

  private awardGunneryXP(world: IWorld): void {
    // Locate the player ship entity.
    let playerShipEntity: number | undefined;
    for (const entity of world.query(['Ship', 'Faction'])) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id === 'PLAYER') { playerShipEntity = entity; break; }
    }
    if (playerShipEntity === undefined) return;

    // Find the WEAPONS room entity owned by the player ship.
    let weaponsRoomEntity: number | undefined;
    for (const entity of world.query(['Room', 'System', 'Owner'])) {
      const owner  = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (owner?.shipEntity !== playerShipEntity) continue;
      const system = world.getComponent<SystemComponent>(entity, 'System');
      if (system?.type === 'WEAPONS') { weaponsRoomEntity = entity; break; }
    }
    if (weaponsRoomEntity === undefined) return;

    // Get the room bounds so we can check if a crew member is inside.
    const roomPos  = world.getComponent<PositionComponent>(weaponsRoomEntity, 'Position');
    const roomComp = world.getComponent<RoomComponent>(weaponsRoomEntity, 'Room');
    if (roomPos === undefined || roomComp === undefined) return;

    const left   = roomPos.x;
    const top    = roomPos.y;
    const right  = roomPos.x + roomComp.width  * TILE_SIZE;
    const bottom = roomPos.y + roomComp.height * TILE_SIZE;

    // Award XP to any player crew member currently inside the WEAPONS room.
    for (const entity of world.query(['Crew', 'Position', 'Owner'])) {
      const owner = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (owner?.shipEntity !== playerShipEntity) continue;
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      if (pos === undefined) continue;
      if (pos.x >= left && pos.x < right && pos.y >= top && pos.y < bottom) {
        const crew = world.getComponent<CrewComponent>(entity, 'Crew');
        if (crew !== undefined) awardXP(crew, 'gunnery', 1);
      }
    }
  }
}
