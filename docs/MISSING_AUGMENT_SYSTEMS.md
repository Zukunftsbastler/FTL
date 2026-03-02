# MISSING_AUGMENT_SYSTEMS.md

Augmentations in FTL are passive global modifiers. Unlike physical systems (like Oxygen or Shields), they don't have health or consume power. Implementing them requires adding conditional checks across several of your existing engine systems.

## 1. Schema & Component Updates
* **AugmentTemplate:** Define this in `src/game/data/` to type-check the JSON above.
* **ShipComponent Update:** The `ShipComponent` needs an array to store active augments: `augments: string[]` (max 3 per ship).
* **AugmentManager:** A utility class or engine service (similar to `AssetLoader`) that holds the definitions of all augments so systems can quickly look up their effects.

## 2. Modifying Existing Systems for Augments

Various ECS systems must check the player's ship for specific augment effects before performing their logic.

### `CombatSystem` & `WeaponMath`
* **Weapon Pre-Igniter:** When entering the `CombatState`, `CombatSystem` must check if the player has `weapon_pre_igniter`. If true, instantly set `charge = cooldown` for all powered weapons.
* **Automated Re-loader:** `WeaponMath` needs to calculate base cooldowns dynamically. If `automated_reloader` is present, `cooldown = baseCooldown * (1 - 0.1 * count)`.
* **Stealth Weapons:** When a weapon fires, `CombatSystem` normally drops the cloak duration. It must bypass this reduction if the `stealth_weapons` augment is equipped.

### `ShieldSystem` & `ProjectileSystem`
* **Zoltan Shield:** * `ShieldSystem` needs a new layer logic specifically for the "Super Shield". At combat start, if the ship has `zoltan_shield`, grant 5 points of Super Shield.
  * `ProjectileSystem` must intercept ALL incoming projectiles (including missiles, which normally pierce standard shields) and boarding drones. Subtract projectile damage from the Super Shield until it hits 0, then let standard mechanics take over.
  * Super Shields block Teleporter usage for the enemy.

### `CrewSystem`
* **Engi Med-bot Dispersal:** Normally, `CrewSystem` only heals crew whose `PositionComponent` intersects with the `MEDBAY` bounds. If this augment is present, it must check the Medbay's power level and apply a fractional heal per second to ALL friendly crew members on the ship, regardless of their room.

### `JumpSystem` / `EventSystem`
* **Long-Ranged Scanners:** When generating the star map UI, the system must check for `long_ranged_scanners`. If present, it sets flags on the UI to reveal `HAS_SHIP` or `HAS_HAZARD` for adjacent nodes.
* **Scrap Recovery Arm:** Whenever an event or combat yields a reward, the central `EventSystem` must intercept the `scrap` value and multiply it by `1.1` before adding it to `ShipComponent.resources`.