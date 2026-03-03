import { Time } from '../../engine/Time';
import type { IWorld } from '../../engine/IWorld';
import type { CrewComponent } from '../components/CrewComponent';
import type { FactionComponent } from '../components/FactionComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { ShipComponent } from '../components/ShipComponent';
import type { SystemComponent } from '../components/SystemComponent';
import type { WeaponComponent } from '../components/WeaponComponent';

/** Charge-rate boost per `automated_reloader` augment (stackable). */
const AUTO_RELOAD_BOOST = 0.10;

/** Passive heal rate (HP/s) from `engi_medbot_dispersal` while Medbay is powered. */
const MEDBOT_HEAL_RATE = 1.0;

/**
 * Applies passive augmentation effects every frame.
 *
 * Handled augments:
 *   - `automated_reloader`:  Increases player weapon charge rate by 10% per stack.
 *   - `engi_medbot_dispersal`: Heals ALL crew 1 HP/s while Medbay is powered.
 *
 * Effects handled elsewhere (not per-frame):
 *   - `weapon_pre_igniter`:  Full charge on combat start — applied in main.ts/enterCombat().
 *   - `scrap_recovery_arm`:  10% more scrap — applied in main.ts/applyRewardEffects().
 *   - `stealth_weapons`:     No cloak break on fire — checked in CombatSystem.
 *   - `zoltan_shield`:       Super-shield buffer — reserved for future SprintSystem.
 */
export class AugmentSystem {
  update(world: IWorld): void {
    const dt = Time.deltaTime;

    for (const shipEntity of world.query(['Ship', 'Faction'])) {
      const faction = world.getComponent<FactionComponent>(shipEntity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;

      const ship = world.getComponent<ShipComponent>(shipEntity, 'Ship');
      if (ship === undefined) continue;

      // ── automated_reloader: boost chargeRateMultiplier on owned weapons ─────
      const reloaderCount = ship.augments.filter((a) => a === 'automated_reloader').length;
      if (reloaderCount > 0) {
        const multiplier = 1.0 + reloaderCount * AUTO_RELOAD_BOOST;
        for (const wEntity of world.query(['Weapon', 'Owner'])) {
          const ownerComp = world.getComponent<OwnerComponent>(wEntity, 'Owner');
          if (ownerComp?.shipEntity !== shipEntity) continue;
          const weapon = world.getComponent<WeaponComponent>(wEntity, 'Weapon');
          if (weapon !== undefined) {
            // Only apply if no other system has further modified the multiplier downward.
            // We set the base so that chargeRateMultiplier reflects the augment stack.
            // Manning / cloaking systems further multiply on top.
            weapon.chargeRateMultiplier = Math.max(weapon.chargeRateMultiplier, multiplier);
          }
        }
      }

      // ── engi_medbot_dispersal: heal all crew while Medbay is powered ─────────
      if (ship.augments.includes('engi_medbot_dispersal')) {
        const medbayPowered = this.isMedbayPowered(world, shipEntity);
        if (medbayPowered) {
          for (const crewEntity of world.query(['Crew', 'Owner'])) {
            const ownerComp = world.getComponent<OwnerComponent>(crewEntity, 'Owner');
            if (ownerComp?.shipEntity !== shipEntity) continue;
            const crew = world.getComponent<CrewComponent>(crewEntity, 'Crew');
            if (crew !== undefined && crew.health < crew.maxHealth) {
              crew.health = Math.min(crew.maxHealth, crew.health + MEDBOT_HEAL_RATE * dt);
            }
          }
        }
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private isMedbayPowered(world: IWorld, shipEntity: number): boolean {
    for (const entity of world.query(['System', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== shipEntity) continue;
      const sys = world.getComponent<SystemComponent>(entity, 'System');
      if (sys?.type === 'MEDBAY') return sys.currentPower > 0;
    }
    return false;
  }
}
