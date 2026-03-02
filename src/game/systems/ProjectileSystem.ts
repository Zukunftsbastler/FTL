import { Time } from '../../engine/Time';
import { TILE_SIZE } from '../constants';
import type { IWorld } from '../../engine/IWorld';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { ProjectileComponent } from '../components/ProjectileComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { ShieldComponent } from '../components/ShieldComponent';
import type { ShipComponent } from '../components/ShipComponent';
import type { SystemComponent } from '../components/SystemComponent';

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
  /** Room entities damaged this frame — cleared at start of each update(). */
  private readonly impactedRooms = new Set<number>();

  /** Ship entities whose shields absorbed a hit this frame — cleared each update(). */
  private readonly shieldHitShips = new Set<number>();

  /**
   * Projectile entities already evaluated for accuracy (Set cleared when entity destroyed).
   */
  private readonly evaluatedProjectiles = new Set<number>();

  /**
   * Maps projectile entity → display position for "MISS" text.
   * Entry removed when the projectile is destroyed.
   */
  private readonly missMap = new Map<number, { displayX: number; displayY: number }>();

  getImpactedRooms(): ReadonlySet<number> { return this.impactedRooms; }
  getShieldHitShips(): ReadonlySet<number> { return this.shieldHitShips; }

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
          const shielded = this.checkAndAbsorbShield(world, proj.targetRoomEntity);
          if (shielded) {
            // Shield absorbed the hit — no hull/system damage.
          } else {
            this.applyImpact(world, proj);
            this.impactedRooms.add(proj.targetRoomEntity);
          }
        }

        this.evaluatedProjectiles.delete(entity);
        world.destroyEntity(entity);
      } else {
        const nx = dx / dist;
        const ny = dy / dist;
        pos.x += nx * step;
        pos.y += ny * step;
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
   * @returns true if a shield absorbed the hit (no further damage should be applied).
   */
  private checkAndAbsorbShield(world: IWorld, targetRoomEntity: number): boolean {
    const ownerComp = world.getComponent<OwnerComponent>(targetRoomEntity, 'Owner');
    if (ownerComp === undefined) return false;

    const shield = world.getComponent<ShieldComponent>(ownerComp.shipEntity, 'Shield');
    if (shield === undefined) return false;

    const activeLayers = Math.floor(shield.currentLayers);
    if (activeLayers < 1) return false;

    // Deplete one layer and reset fractional progress.
    shield.currentLayers = activeLayers - 1;
    this.shieldHitShips.add(ownerComp.shipEntity);
    return true;
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

    const system = world.getComponent<SystemComponent>(proj.targetRoomEntity, 'System');
    if (system !== undefined && system.maxCapacity > 0) {
      system.maxCapacity  -= 1;
      system.damageAmount += 1;
      if (system.currentPower > system.maxCapacity) {
        system.currentPower = system.maxCapacity;
      }
    }

    const ownerComp = world.getComponent<OwnerComponent>(proj.targetRoomEntity, 'Owner');
    if (ownerComp === undefined) return;
    const ship = world.getComponent<ShipComponent>(ownerComp.shipEntity, 'Ship');
    if (ship !== undefined && ship.currentHull > 0) {
      ship.currentHull -= 1;
    }
  }
}
