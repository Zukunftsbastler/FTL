import { Time } from '../../engine/Time';
import { TILE_SIZE } from '../constants';
import type { IWorld } from '../../engine/IWorld';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { ProjectileComponent } from '../components/ProjectileComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { ShipComponent } from '../components/ShipComponent';
import type { SystemComponent } from '../components/SystemComponent';

/** Cap dt so a tab backgrounded for a long time doesn't teleport projectiles. */
const MAX_DT = 0.1;

/**
 * Factor by which the overshoot target extends beyond the intended room center.
 * A factor of 4 sends the projectile roughly 4× the origin→target distance off-screen.
 */
const MISS_OVERSHOOT_FACTOR = 4.0;

/**
 * Probability that a projectile which would otherwise "hit" instead impacts a
 * random nearby room (near-miss / scatter).  Applied per projectile.
 */
const NEAR_MISS_CHANCE = 0.08;

/**
 * Advances all projectiles toward their targets each frame.
 *
 * Accuracy / evasion roll (performed once per projectile on its first frame):
 *   hitChance = clamp(accuracy - targetShip.evasion, 0.05, 1.0)
 *   If neverMisses = true, the roll is skipped (always hit).
 *
 * On a full MISS:
 *   • targetX/Y are redirected to an overshoot point far past the enemy ship.
 *   • No damage is applied.  The miss display position (original room centre) is
 *     stored and returned via getMissDisplays() so RenderSystem can draw "MISS".
 *
 * On a NEAR-MISS (8% chance for shots that would otherwise hit):
 *   • The projectile is redirected to a random other room on the enemy ship.
 *   • Damage is still applied (to the new room).
 *
 * On a HIT:
 *   1. System damageAmount is incremented on the target room.
 *   2. Hull damage is applied to the owning ship.
 *   3. The target room entity is added to impactedRooms for RenderSystem flash.
 *   4. The projectile entity is destroyed.
 */
export class ProjectileSystem {
  /** Room entities that were hit this frame. Cleared at the start of each update(). */
  private readonly impactedRooms = new Set<number>();

  /**
   * Projectile entities that have been evaluated for accuracy this session.
   * Cleared when the entity is destroyed.
   */
  private readonly evaluatedProjectiles = new Set<number>();

  /**
   * Maps projectile entity → display position for "MISS" text.
   * Populated when a miss is determined; entry removed when projectile is destroyed.
   */
  private readonly missMap = new Map<number, { displayX: number; displayY: number }>();

  /** Called by RenderSystem to drive the hit-flash overlay. */
  getImpactedRooms(): ReadonlySet<number> {
    return this.impactedRooms;
  }

  /**
   * Returns an array of canvas positions where "MISS" should be rendered this frame.
   * Each position is the centre of the room that was originally targeted.
   */
  getMissDisplays(): ReadonlyArray<{ x: number; y: number }> {
    const result: Array<{ x: number; y: number }> = [];
    for (const display of this.missMap.values()) {
      result.push({ x: display.displayX, y: display.displayY });
    }
    return result;
  }

  update(world: IWorld): void {
    this.impactedRooms.clear();
    const dt = Math.min(Time.deltaTime, MAX_DT);

    const entities = world.query(['Projectile', 'Position']);
    for (const entity of entities) {
      const proj = world.getComponent<ProjectileComponent>(entity, 'Projectile');
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      if (proj === undefined || pos === undefined) continue;

      // ── Accuracy roll (once per projectile, on first frame) ────────────────
      if (!this.evaluatedProjectiles.has(entity)) {
        this.evaluatedProjectiles.add(entity);
        this.evaluateAccuracy(world, entity, proj);
      }

      const dx   = proj.targetX - pos.x;
      const dy   = proj.targetY - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const step = proj.speed * dt;

      if (dist <= step) {
        // Projectile reached (or passed) its target this frame.
        pos.x = proj.targetX;
        pos.y = proj.targetY;

        if (this.missMap.has(entity)) {
          // Complete miss — no damage.
          this.missMap.delete(entity);
        } else if (proj.targetRoomEntity !== undefined) {
          this.applyImpact(world, proj);
          this.impactedRooms.add(proj.targetRoomEntity);
        }

        this.evaluatedProjectiles.delete(entity);
        world.destroyEntity(entity);
      } else {
        // Advance toward target.
        const nx = dx / dist;
        const ny = dy / dist;
        pos.x += nx * step;
        pos.y += ny * step;
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Rolls accuracy vs evasion for a projectile.
   * Mutates proj.targetX/Y and proj.targetRoomEntity if the shot misses or near-misses.
   */
  private evaluateAccuracy(world: IWorld, entity: number, proj: ProjectileComponent): void {
    if (proj.neverMisses || proj.targetRoomEntity === undefined) return;

    // Determine target ship evasion.
    const evasion = this.getTargetShipEvasion(world, proj.targetRoomEntity);
    const hitChance = Math.max(0.05, Math.min(1.0, proj.accuracy - evasion));

    const roll = Math.random();

    if (roll > hitChance) {
      // Full miss: redirect projectile to overshoot beyond the target ship.
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

    // Hit — check for near-miss scatter.
    if (Math.random() < NEAR_MISS_CHANCE) {
      const redirect = this.findNearMissTarget(world, proj.targetRoomEntity);
      if (redirect !== null) {
        proj.targetRoomEntity = redirect.entity;
        proj.targetX = redirect.x;
        proj.targetY = redirect.y;
      }
    }
  }

  /** Returns the evasion of the ship that owns targetRoomEntity. */
  private getTargetShipEvasion(world: IWorld, targetRoomEntity: number): number {
    const ownerComp = world.getComponent<OwnerComponent>(targetRoomEntity, 'Owner');
    if (ownerComp === undefined) return 0;
    const ship = world.getComponent<ShipComponent>(ownerComp.shipEntity, 'Ship');
    return ship?.evasion ?? 0;
  }

  /**
   * Picks a random room on the same ship as originalTargetEntity (excluding the
   * original room) to serve as the near-miss redirect target.
   */
  private findNearMissTarget(
    world: IWorld,
    originalTargetEntity: number,
  ): { entity: number; x: number; y: number } | null {
    const ownerComp = world.getComponent<OwnerComponent>(originalTargetEntity, 'Owner');
    if (ownerComp === undefined) return null;

    const candidates: Array<{ entity: number; x: number; y: number }> = [];
    const roomEntities = world.query(['Room', 'Position', 'Owner']);
    for (const roomEntity of roomEntities) {
      if (roomEntity === originalTargetEntity) continue;
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

    // Increment physical damage on the target room's system.
    const system = world.getComponent<SystemComponent>(proj.targetRoomEntity, 'System');
    if (system !== undefined && system.maxCapacity > 0) {
      system.maxCapacity -= 1;
      system.damageAmount += 1;
      if (system.currentPower > system.maxCapacity) {
        system.currentPower = system.maxCapacity;
      }
    }

    // Damage the ship that owns the target room.
    const ownerComp = world.getComponent<OwnerComponent>(proj.targetRoomEntity, 'Owner');
    if (ownerComp === undefined) return;
    const ship = world.getComponent<ShipComponent>(ownerComp.shipEntity, 'Ship');
    if (ship !== undefined && ship.currentHull > 0) {
      ship.currentHull -= 1;
    }
  }
}
