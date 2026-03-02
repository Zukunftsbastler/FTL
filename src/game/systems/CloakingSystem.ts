import { Time } from '../../engine/Time';
import type { IInput } from '../../engine/IInput';
import type { IWorld } from '../../engine/IWorld';
import type { CloakComponent } from '../components/CloakComponent';
import type { FactionComponent } from '../components/FactionComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { ShipComponent } from '../components/ShipComponent';
import type { SystemComponent } from '../components/SystemComponent';
import type { WeaponComponent } from '../components/WeaponComponent';

/** Evasion bonus granted while the cloak is active. */
const CLOAK_EVASION_BONUS = 0.60;

/** Absolute evasion cap (prevents guaranteed miss vs. any weapon). */
const EVASION_CAP = 1.0;

/**
 * Manages the player ship's cloaking device.
 *
 * Frame order requirements:
 *   EvasionSystem  → resets evasion + adds ENGINES baseline
 *   ManningSystem  → adds crew bonuses on top
 *   CloakingSystem → adds cloak bonus and freezes enemy weapon charges  ← this system
 *
 * Key binding: 'C' to activate / deactivate.
 *
 * Behaviour:
 *   - While active: +0.60 evasion on the player ship, enemy weapon
 *     chargeRateMultiplier set to 0 (freezes charging).
 *   - Deactivates automatically when durationTimer runs out.
 *   - After deactivation the cooldownTimer must reach 0 before re-activation.
 *   - If the player fires a weapon while cloaked, CombatSystem terminates the cloak.
 */
export class CloakingSystem {
  constructor(private readonly input: IInput) {}

  update(world: IWorld): void {
    const dt = Math.min(Time.deltaTime, 0.1);

    for (const shipEntity of world.query(['Ship', 'Faction', 'Cloak'])) {
      const faction = world.getComponent<FactionComponent>(shipEntity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;

      const cloak = world.getComponent<CloakComponent>(shipEntity, 'Cloak');
      const ship  = world.getComponent<ShipComponent>(shipEntity, 'Ship');
      if (cloak === undefined || ship === undefined) continue;

      // ── Tick timers ──────────────────────────────────────────────────────────
      if (cloak.isActive) {
        cloak.durationTimer -= dt;
        if (cloak.durationTimer <= 0) {
          cloak.isActive      = false;
          cloak.durationTimer = 0;
          cloak.cooldownTimer = cloak.maxCooldown;
        }
      } else if (cloak.cooldownTimer > 0) {
        cloak.cooldownTimer -= dt;
        if (cloak.cooldownTimer < 0) cloak.cooldownTimer = 0;
      }

      // ── Key input: 'C' to toggle ─────────────────────────────────────────────
      if (this.input.isKeyJustPressed('KeyC')) {
        if (cloak.isActive) {
          // Manual deactivation.
          cloak.isActive      = false;
          cloak.durationTimer = 0;
          cloak.cooldownTimer = cloak.maxCooldown;
        } else if (cloak.cooldownTimer <= 0 && this.isCloakingPowered(world, shipEntity)) {
          // Activate.
          cloak.isActive      = true;
          cloak.durationTimer = cloak.maxDuration;
        }
      }

      // ── Apply effects while active ───────────────────────────────────────────
      if (cloak.isActive) {
        ship.evasion = Math.min(EVASION_CAP, ship.evasion + CLOAK_EVASION_BONUS);
        this.freezeEnemyWeapons(world);
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private isCloakingPowered(world: IWorld, shipEntity: number): boolean {
    for (const roomEntity of world.query(['System', 'Owner'])) {
      const owner = world.getComponent<OwnerComponent>(roomEntity, 'Owner');
      if (owner?.shipEntity !== shipEntity) continue;
      const sys = world.getComponent<SystemComponent>(roomEntity, 'System');
      if (sys?.type === 'CLOAKING' && sys.currentPower > 0) return true;
    }
    return false;
  }

  private freezeEnemyWeapons(world: IWorld): void {
    for (const weaponEntity of world.query(['Weapon', 'Owner'])) {
      const owner = world.getComponent<OwnerComponent>(weaponEntity, 'Owner');
      if (owner === undefined) continue;
      const faction = world.getComponent<FactionComponent>(owner.shipEntity, 'Faction');
      if (faction?.id !== 'ENEMY') continue;
      const weapon = world.getComponent<WeaponComponent>(weaponEntity, 'Weapon');
      if (weapon !== undefined) weapon.chargeRateMultiplier = 0;
    }
  }
}
