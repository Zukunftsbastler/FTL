# SPRINT 13: Victory State, Loot Distribution & Crew XP

## 1. Sprint Objective
**To the AI Assistant:** The combat loop is complete, but there is no reward for winning. The goal of this sprint is to handle the destruction of the enemy ship gracefully, display a Victory/Loot screen, distribute generated rewards (Resources, Weapons, Crew), and implement a "Learning by doing" XP system for the player's crew.

## 2. Tasks

### A. Loot Schema & Generator (`src/game/logic/RewardGenerator.ts`)
* Define a `Reward` interface: `{ scrap: number; fuel: number; missiles: number; droneParts: number; weaponId?: string; newCrew?: CrewTemplate; }`
* Create a pure function `generateCombatReward(sectorLevel: number): Reward`.
  * It should always guarantee some Scrap.
  * It has a high chance to drop Fuel and Missiles.
  * It has a low chance (e.g., 10%) to drop a random `weaponId` from `weapons.json`.
  * It has a very low chance (e.g., 5%) to generate a random `CrewTemplate`.

### B. Victory State & UI (`src/engine/GameState.ts`, `src/game/systems/VictorySystem.ts`)
* Add a new GameState: `State.VICTORY`.
* Update `CombatSystem`: If `ENEMY_HULL <= 0`, do NOT immediately jump to `STAR_MAP` (as we did in Sprint 9). Instead, generate a `Reward` object, store it globally or pass it to the state machine, and change state to `State.VICTORY`.
* **Visuals (RenderSystem):** In `State.VICTORY`, draw a large, centered modal box. List the contents of the `Reward` object clearly. Draw a "Collect & Jump" button.
* When "Collect & Jump" is clicked:
  1. Add the resources to the Player's `ShipComponent`.
  2. If a `weaponId` is present, add it to the Ship's inventory/cargo (we will build the equip-UI later, just store the ID string array on the ship for now).
  3. If `newCrew` is present, use `ShipFactory` to spawn a new Crew entity in the Piloting room.
  4. Transition to `State.STAR_MAP` and clean up the Enemy ship entity.

### C. "Learning by Doing" Crew XP (`src/game/components/`, `src/game/systems/`)
FTL grants XP per action, not per kill. Let's implement the two easiest ones to track:
* **Gunnery XP:** In `ProjectileSystem`, when a player projectile successfully hits an enemy room (not blocked by shield, not a miss), find the Crew member currently manning the WEAPONS room and add `+1` to their `xp.gunnery`.
* **Repair XP:** In `RepairSystem`, every time a crew member successfully removes `1.0` full point of `damageAmount` from a system, add `+1` to their `xp.repair`.
* **Level Up Math:** If an XP stat reaches a threshold (e.g., 15 for level 1, 30 for level 2), increment the actual skill level (`skills.gunnery++`) and reset the XP for that skill.
* *Note:* Update the Crew UI from Sprint 11 to show progress bars or `(xp/max)` text next to the skill dots.

### D. Death State (`src/game/systems/CombatSystem.ts`)
* Just to be safe: If `PLAYER_HULL <= 0` or all player Crew are dead, transition to `State.GAME_OVER`. Draw a simple "Game Over" screen with a "Restart" button that reloads the page (`window.location.reload()`).

## 3. Success Criteria
* When the enemy hull reaches 0, the game pauses combat and shows a Victory Modal.
* The modal displays randomly generated scrap, fuel, and occasionally weapons/crew.
* Clicking "Collect & Jump" correctly adds the resources to the player's dashboard and transitions to the Star Map.
* Crew members actively manning Weapons or repairing gain XP in real-time during combat.
* Crew skills level up when XP thresholds are met, updating their stats in the UI.
* Player ship destruction results in a Game Over screen.
* No TypeScript errors.