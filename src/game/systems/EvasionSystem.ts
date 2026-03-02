import type { IWorld } from '../../engine/IWorld';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { ShipComponent } from '../components/ShipComponent';
import type { SystemComponent } from '../components/SystemComponent';

/** Evasion added per ENGINES power unit. */
const ENGINES_EVASION_PER_POWER = 0.05;

/** Hard cap on evasion from all sources combined. */
const MAX_EVASION = 0.95;

/**
 * Resets ship evasion to 0 each frame, then adds ENGINES power-based evasion
 * for every ship (player and enemy).
 *
 * Must run BEFORE ManningSystem so crew bonuses are layered on top of the
 * power baseline without double-resetting.
 */
export class EvasionSystem {
  update(world: IWorld): void {
    // ── 1. Reset evasion for all ships ────────────────────────────────────────
    for (const shipEntity of world.query(['Ship'])) {
      const ship = world.getComponent<ShipComponent>(shipEntity, 'Ship');
      if (ship !== undefined) ship.evasion = 0;
    }

    // ── 2. Add ENGINES power-based bonus for each ship ────────────────────────
    for (const roomEntity of world.query(['System', 'Owner'])) {
      const sys = world.getComponent<SystemComponent>(roomEntity, 'System');
      if (sys?.type !== 'ENGINES') continue;

      const owner = world.getComponent<OwnerComponent>(roomEntity, 'Owner');
      if (owner === undefined) continue;

      const ship = world.getComponent<ShipComponent>(owner.shipEntity, 'Ship');
      if (ship !== undefined) {
        ship.evasion = Math.min(
          MAX_EVASION,
          ship.evasion + sys.currentPower * ENGINES_EVASION_PER_POWER,
        );
      }
    }
  }
}
