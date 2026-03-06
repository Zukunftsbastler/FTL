# SPRINT 39: Tiered Enemy Scaling, System Integration & Power Fixes

## 1. Sprint Objective
**To the AI Assistant:** This sprint addresses critical game-breaking logic bugs in the Power and Upgrade systems. Once fixed, we will implement a highly balanced dynamic enemy scaling system (`EnemyScaler`). Instead of purely random weapon assignment, the scaler will use a "Tiered Pool" based on `powerRequired` to prevent early-game unfairness. Furthermore, the scaler will dynamically equip advanced systems (like `CLOAKING` or `DRONE_CTRL`) onto enemy ships in later sectors to utilize existing mechanics and drastically change combat tactics.

## 2. Tasks

### A. Critical Power & Upgrade Fixes (`src/game/systems/UpgradeSystem.ts`, `PowerMath.ts`)
* **The Upgrade Bug:** In `UpgradeSystem.ts` (or wherever system upgrades are handled), upgrading a system currently only increments `system.level`. You MUST also increment `system.maxCapacity += 1`. Otherwise, the newly bought system level is treated as permanently damaged.
* **The Power Allocation Bug:** In `PowerMath.ts`, review `allocatePower` and `deallocatePower`. 
  * `deallocatePower` must decrease `currentPower` and INCREASE the reactor's free power.
  * `allocatePower` must strictly check that `system.currentPower < system.maxCapacity` (NOT just `system.level`) before allocating.

### B. Sector Progression (`src/engine/GameState.ts`, `MapSystem.ts`)
* Add `sectorNumber: number` (default 1) to `GameStateData`.
* To my knowledge, the following already happens: When jumping to an `isExit: true` node, generate a new map, reset the Rebel Fleet pursuit (to negative X), and increment `sectorNumber`.

### C. Tiered Weapon Scaling (`src/game/logic/EnemyScaler.ts`)
* Create `EnemyScaler.ts` with `scaleEnemy(template: ShipTemplate, sector: number, availableWeapons: WeaponTemplate[]): ShipTemplate`.
* **Reactor & Systems:** Increase `startingReactorPower` by `(sector - 1) * 2`. Increase `SHIELDS` and `ENGINES` levels by 1 for every 2 sectors.
* **Weapon Pools:** Do not assign random weapons. Filter `availableWeapons` into Tiers based on `powerRequired`:
  * Tier 1 (Power 1): `basic_laser`, `artemis_missile`, `mini_beam`, etc.
  * Tier 2 (Power 2): `burst_laser_2`, `hull_laser`, etc.
  * Tier 3 (Power 3+): `glaive_beam`, `flak_2`, etc.
* **Assignment:** Increase the enemy's `WEAPONS` system level. Then, assign weapons from the appropriate Tier pool based on the sector (e.g., Sector 1-2 only pulls from Tier 1; Sector 3-4 from Tier 1 & 2) until their total weapon power matches their system level.

### D. Advanced System Integration (`EnemyScaler.ts`)
* Enemies currently only use Shields, Weapons, and Engines. Let's make them terrifying.
* **Sector 2+ (Drones):** 25% chance to dynamically add `{ type: 'DRONE_CTRL', level: 2 }` to the enemy's `systems` array. If added, also push `"combat_1"` or `"defense_1"` into a new `startingDrones` array on the template so the `DroneControlSystem` spawns it.
* **Sector 3+ (Cloaking):** 20% chance to dynamically add `{ type: 'CLOAKING', level: 1 }` to the `systems` array. 
* *Note:* `ShipFactory` will automatically place these new systems into empty rooms on the enemy ship, visually changing their internal layout!

## 3. Success Criteria
* Upgrading Weapons allows the player to allocate a 3rd power bar and fire two weapons.
* Removing power from Engines returns it to the reactor properly.
* Reaching the Exit node generates a new map and increments the sector.
* Enemies in later sectors intelligently spawn with Cloaking or Drones, and use appropriately scaled weapons (no Glaive Beams in Sector 1).
* No TypeScript errors.