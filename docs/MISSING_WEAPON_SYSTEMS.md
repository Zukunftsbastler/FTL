# MISSING_WEAPON_SYSTEMS.md

To fully support the weapons defined in `data/weapons.json`, the following engine systems and logic must be implemented or heavily refactored.

## 1. Projectile Component & Spawning Logic
Currently, `CombatSystem.fireWeapon` hardcodes a single projectile with `damage: 1`. 
* **Multiple Projectiles:** `CombatSystem` needs to read `weaponTemplate.projectiles` and spawn that many `ProjectileComponent` entities. They should be spawned with slight delays (using a timer/coroutine) so they don't overlap visually.
* **Data Pass-Through:** The `ProjectileComponent` needs to be expanded to carry the full damage object (`hull`, `system`, `ion`, `crew`), as well as `fireChance` and `breachChance`. 

## 2. Resource Consumption
* **Missiles:** `CombatSystem` currently ignores `missileCost`. Before charging or firing, it must check if `ShipComponent.fuel/missiles` >= `weapon.missileCost`. Upon firing, the global ship missile count must be decremented.

## 3. The Shields System
The biggest missing combat mechanic is Shields. 
* **ShieldComponent:** Needs to track `maxLayers` and `activeLayers`. 
* **ShieldSystem:** A new system that regenerates shield layers over time based on the power allocated to the `SHIELDS` room.
* **Collision Logic:** `ProjectileSystem` must intercept projectiles *before* they hit the room.
    * `LASER`: If shields > 0, destroy projectile and remove 1 shield layer.
    * `MISSILE`: Ignore shields entirely.
    * `ION`: Remove 1 shield layer AND apply ion damage to the Shield system itself.

## 4. Evasion (Engines & Piloting)
Currently, projectiles always hit their exact target room coordinate.
* **Evasion Calculation:** A new system must calculate the ship's evasion chance based on power in `ENGINES`, presence of an active `PILOTING` subsystem, and crew manning bonuses.
* **Miss Mechanic:** `ProjectileSystem` should roll a random number against the evasion chance when a projectile approaches the ship. If it "misses", the projectile entity should fly past the ship and eventually be destroyed off-screen instead of applying impact damage.

## 5. Beam Weapons
Beams in FTL behave fundamentally differently from Lasers/Missiles.
* **Targeting:** `TargetingSystem` needs a state for Beams to draw a "line" across multiple rooms instead of targeting a single room point.
* **Execution:** Instead of spawning a slow-moving `ProjectileComponent`, beams instantly apply damage to all rooms intersecting their line.
* **Shield Interaction:** Beam damage to hull/systems is reduced by 1 for every active shield layer the enemy has.

## 6. Complex Damage Application (`ProjectileSystem.ts`)
Currently, `ProjectileSystem.applyImpact` hardcodes `-1` to system capacity and `-1` to hull. It must be updated to process the new data payload:
* **System/Hull Damage:** Apply `damage.hull` and `damage.system` dynamically.
* **Crew Damage:** Query all `CrewComponent` entities located in the target room's bounds and subtract `damage.crew` from their `health`.
* **Ion Damage:** Implement an "Ionized" state on `SystemComponent` that locks `X` power for `Y` seconds per point of ion damage.
* **Hazards (Fire & Breach):** Roll `Math.random()` against `fireChance` and `breachChance`. If successful, spawn a `FireComponent` or `BreachComponent` at the room's tile, which the `OxygenSystem` and `CrewSystem` will need to react to.