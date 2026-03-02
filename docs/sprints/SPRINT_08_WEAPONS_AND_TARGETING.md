# SPRINT 08: Weapons, Targeting & Ship-to-Ship Combat

## 1. Sprint Objective
**To the AI Assistant:** Our ship is fully simulated, but FTL is about combat. The goal of this sprint is to spawn a second "Enemy" ship, parse weapon data from JSON, allow the player to allocate power to weapons to charge them, and target enemy rooms to deal damage. 

## 2. Tasks

### A. Faction & Enemy Ship (`src/game/components/`, `src/main.ts`)
* Create `FactionComponent` (`_type = 'Faction'`): `{ id: 'PLAYER' | 'ENEMY' }`.
* Update `ShipFactory.spawnShip` to accept a faction parameter and attach this component.
* In `main.ts`, spawn the Player ship on the left side of the canvas, and a second ship (the Enemy) on the right side. *Note: Both ships will automatically have their own O2, Reactor, and Doors because of our ECS!*

### B. Weapon Data & Components (`data/weapons.json`, `src/game/components/`)
* Create a basic `data/weapons.json` containing at least one weapon (e.g., "burst_laser_1") matching the `WeaponTemplate` schema from `DATA_SCHEMA.md`.
* Create `WeaponComponent` (`_type = 'Weapon'`): `{ templateId: string; charge: number; maxCharge: number; powerRequired: number; isPowered: boolean; targetRoomEntity?: Entity; }`
* Update `ShipFactory`: When spawning a ship, read its `startingWeapons` array, fetch the weapon data from `AssetLoader`, and create an Entity for each weapon, attaching the `WeaponComponent` and linking it to the Ship entity (e.g., via an `OwnerComponent` or by storing weapon entity IDs in the `ShipComponent`).

### C. TDD: Weapon Charge Math (`tests/game/WeaponMath.test.ts`)
* Create pure functions in `src/game/logic/WeaponMath.ts`.
* `calculateWeaponCharge(currentCharge, maxCharge, isPowered, dt)`: Increases charge linearly if powered. Returns new charge clamped to `[0, maxCharge]`.
* Write and pass at least 3 tests for charging, pausing when unpowered, and capping at max.

### D. Weapon UI & Targeting System (`src/game/systems/TargetingSystem.ts`)
* We need a way to select a weapon and aim it.
* **UI:** Draw a simple box at the bottom of the screen for each of the player's weapons. Show its name, power requirement, and a charge bar.
* **Interaction:** 1. Click the weapon UI box -> State changes to "Targeting Mode" for that weapon.
  2. Click a room on the ENEMY ship -> Set the weapon's `targetRoomEntity` to that room.
  3. Draw a red crosshair over the targeted room.

### E. Combat Logic (`src/game/systems/CombatSystem.ts`)
* Each frame, charge weapons that are `isPowered`. (A weapon is powered if the player allocated enough power to the WEAPONS system to cover its `powerRequired`).
* If a weapon's `charge >= maxCharge` AND it has a `targetRoomEntity`:
  * **Fire!** Reset its `charge` to 0.
  * *For this sprint (Instant Hit):* Instantly apply 1 damage to the target room's System capacity (if it has a `SystemComponent`) and 1 damage to the enemy's `ShipComponent.currentHull`. 
  * Play a brief visual effect (e.g., draw a white line from the player ship to the enemy room for 0.1 seconds, or simply flash the enemy room white).

## 3. Success Criteria
* `npm run test` passes with the new Weapon math tests.
* Two complete ships spawn on the canvas (Player left, Enemy right).
* Player can see their equipped weapons in the UI.
* Weapons charge up over time, but ONLY if power is routed to the WEAPONS system.
* Player can click a weapon, then click an enemy room to target it.
* When fully charged, the weapon fires, resets its charge, and damages the enemy ship/system.
* No TypeScript errors.