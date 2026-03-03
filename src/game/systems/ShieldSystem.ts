import { Time } from '../../engine/Time';
import { calculateMaxShields, rechargeShields } from '../logic/ShieldMath';
import type { IWorld } from '../../engine/IWorld';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { ShieldComponent } from '../components/ShieldComponent';
import type { SystemComponent } from '../components/SystemComponent';

/**
 * Reads each ship's SHIELDS system power allocation every frame and:
 *   1. Updates ShieldComponent.maxLayers via calculateMaxShields().
 *   2. Clamps currentLayers to the new maxLayers (handles power removal).
 *   3. Recharges currentLayers toward maxLayers using rechargeShields().
 *
 * The ShieldComponent lives on the ship root entity, not the room.
 */
export class ShieldSystem {
  update(world: IWorld): void {
    const dt = Time.deltaTime;

    const shipEntities = world.query(['Ship', 'Shield']);
    for (const shipEntity of shipEntities) {
      const shield = world.getComponent<ShieldComponent>(shipEntity, 'Shield');
      if (shield === undefined) continue;

      const shieldPower = this.getShieldSystemPower(world, shipEntity);
      const newMax = calculateMaxShields(shieldPower);
      shield.maxLayers = newMax;

      // Clamp current if power was removed.
      if (shield.currentLayers > shield.maxLayers) {
        shield.currentLayers = shield.maxLayers;
      }

      // Recharge.
      shield.currentLayers = rechargeShields(
        shield.currentLayers,
        shield.maxLayers,
        shieldPower > 0,
        dt,
      );
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Returns effective power for the SHIELDS system (currentPower + zoltanBonus). */
  private getShieldSystemPower(world: IWorld, shipEntity: number): number {
    const entities = world.query(['System', 'Owner']);
    for (const entity of entities) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== shipEntity) continue;
      const sys = world.getComponent<SystemComponent>(entity, 'System');
      if (sys?.type === 'SHIELDS') return sys.currentPower + sys.zoltanBonus;
    }
    return 0;
  }
}
