# SPRINT 26: State Isolation, Map Refinements & Fleet Pacing

## 1. Sprint Objective
**To the AI Assistant:** The game currently suffers from severe state-leakage bugs and UI oversights. Ships and weapons mutate their global JSON templates, causing damage and upgrades to persist across new runs and new enemy spawns. Furthermore, the Star Map hides nodes completely instead of just hiding connections, and the Rebel Fleet catches the player too quickly, skipping narrative events. The goal of this sprint is to fix these critical issues.

## 2. Tasks

### A. Deep Copying Templates (`src/game/world/ShipFactory.ts`)
* **The Bug:** `AssetLoader.getShipTemplate()` and `getWeaponTemplate()` return references to the cached JSON. Modifying a spawned entity currently mutates the global template.
* **The Fix:** Whenever `ShipFactory` retrieves a template from the `AssetLoader`, it MUST perform a deep copy before using it. 
  * Use `const template = JSON.parse(JSON.stringify(AssetLoader.getShipTemplate(id)));` (or `structuredClone` if environment permits) to ensure a completely fresh instance. Do this for Ships, Weapons, Drones, and Crew.

### B. Rebel Fleet Pacing (`src/engine/GameState.ts`, `src/game/systems/JumpSystem.ts`)
* **The Bug:** The fleet starts too close and immediately intercepts the player on the first few jumps, forcing combat and skipping the `events.json` narrative text.
* **The Fix:** * In `GameState`, initialize `rebelFleetPosition` to a negative value (e.g., `-250` or `-300`).
  * Ensure the fleet advancement per jump allows the player to explore roughly 60-70% of the map before being caught.

### C. Map Node Visibility (`src/game/systems/UpgradeSystem.ts` / Map Renderer)
* **The Bug:** Nodes with state `HIDDEN` are completely invisible. In FTL, you can see all stars, but not the paths.
* **The Fix:** * Update the Star Map rendering logic. Iterate over ALL nodes in the sector and draw a small circle (the star) for every single one, regardless of its `visibility` state.
  * Only draw the connecting lines (paths) between two nodes if at least ONE of them is `VISITED` or `ADJACENT`.
  * Only draw tags (e.g., STORE, HAZARD) if the node is `ADJACENT`, `VISIBLE`, or `VISITED`.

### D. Map Generation RNG (Start Node Connections)
* **The Bug:** The START node often generates with only 1 connecting path, creating a forced linear start.
* **The Fix:** In the Map Generation logic, explicitly ensure the START node connects to at least 2 or 3 of its closest neighbors, overriding the standard intersection/radius rules slightly if necessary to guarantee early-game branching.

## 3. Success Criteria
* Upgrading a system or taking damage no longer persists after a page reload or applies to newly spawned enemy ships.
* The Star Map displays all nodes as dots from the beginning.
* Connecting lines and event details remain hidden under Fog of War.
* The Rebel Fleet starts far enough back that normal narrative events trigger on the first few jumps.
* The START node always has multiple path choices.
* No TypeScript errors.