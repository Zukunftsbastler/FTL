import { Time } from '../../engine/Time';
import type { IWorld } from '../../engine/IWorld';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { ProjectileComponent } from '../components/ProjectileComponent';
import type { ShipComponent } from '../components/ShipComponent';
import type { SystemComponent } from '../components/SystemComponent';

/** Cap dt so a tab backgrounded for a long time doesn't teleport projectiles. */
const MAX_DT = 0.1;

/**
 * Advances all projectiles toward their targets each frame.
 *
 * When a projectile reaches its target:
 *   1. System damage is applied to the target room (maxCapacity − 1).
 *   2. Hull damage is applied to the ship that owns the target room.
 *   3. The target room entity is added to `impactedRooms` so RenderSystem
 *      can draw the white flash overlay on the same frame.
 *   4. The projectile entity is destroyed.
 */
export class ProjectileSystem {
  /** Room entities that were hit this frame. Cleared at the start of each update(). */
  private readonly impactedRooms = new Set<number>();

  /** Called by RenderSystem to drive the hit-flash overlay. */
  getImpactedRooms(): ReadonlySet<number> {
    return this.impactedRooms;
  }

  update(world: IWorld): void {
    this.impactedRooms.clear();
    const dt = Math.min(Time.deltaTime, MAX_DT);

    const entities = world.query(['Projectile', 'Position']);
    for (const entity of entities) {
      const proj = world.getComponent<ProjectileComponent>(entity, 'Projectile');
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      if (proj === undefined || pos === undefined) continue;

      const dx   = proj.targetX - pos.x;
      const dy   = proj.targetY - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const step = proj.speed * dt;

      if (dist <= step) {
        // Projectile reached (or passed) its target this frame.
        pos.x = proj.targetX;
        pos.y = proj.targetY;
        this.applyImpact(world, proj);
        this.impactedRooms.add(proj.targetRoomEntity);
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

  private applyImpact(world: IWorld, proj: ProjectileComponent): void {
    // Damage the target room's system.
    const system = world.getComponent<SystemComponent>(proj.targetRoomEntity, 'System');
    if (system !== undefined && system.maxCapacity > 0) {
      system.maxCapacity -= 1;
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
