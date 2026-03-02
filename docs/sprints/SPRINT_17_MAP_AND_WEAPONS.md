# SPRINT 17: Star Map Overhaul & Weapon Power Refactor

## 1. Sprint Objective
**To the AI Assistant:** The game loop is functional, but lacks crucial FTL mechanics. The goal of this sprint is three-fold:
1. Delete the legacy debug cursor from Sprint 2.
2. Refactor Weapon Power: Power allocated to the WEAPONS system acts as a pool. Players must explicitly toggle individual weapons ON/OFF in the UI to consume that power.
3. Overhaul the Star Map: Generate a networked graph of 15-20 nodes, implement 1-Fuel travel along connected paths, track "visited" nodes (no repeat events), add an "EXIT" node, and implement the encroaching Rebel Fleet timer.


## 2. Tasks

### A. Remove the Debug Cursor
* In `main.ts` or wherever it was initialized in Sprint 2, completely remove the creation of the dummy `SpriteComponent`/`PositionComponent` entity that follows the mouse. We rely purely on standard mouse clicks and UI hover states now.

### B. Weapon Power Refactor (`src/game/components/WeaponComponent.ts`, `src/game/systems/`)
* **The Concept:** `SystemComponent` for WEAPONS determines the *maximum available power pool*.
* **Weapon Toggle:** Update the Weapon UI strip. Add a clear toggle state (e.g., a green light if active, dark if inactive). Clicking a weapon's UI box should toggle it ON or OFF.
* **Validation:** A weapon can only be toggled ON if its `powerCost` is `<= (WeaponsSystem.currentPower - sumOfOtherActiveWeaponsPower)`. If a player deallocates power from the WEAPONS room and it drops below the required threshold, automatically toggle active weapons OFF starting from the rightmost slot.
* *UI Targeting:* Left-clicking the weapon UI should target it (if active). Maybe add a small "power button" inside the weapon UI box to toggle it, or use Right-Click to toggle power and Left-Click to target. Pick the most intuitive UI implementation.

### C. Star Map Graph & Travel (`src/game/systems/MapSystem.ts`)
* **Generation:** Generate 15-20 star nodes with `x, y` coordinates. Node 0 is on the far left (START). One node on the far right is the `EXIT`.
* **Connections:** Generate between 1 and 5 logical paths (links) between nodes that are close to each other. Not all neighboring nodes must be connected with a link. There must be a connection between any two given nodes via a finite number of links.
* **State Tracking:** Track `currentNodeId` in the GameState. Nodes must have a `visited: boolean` flag.
* **Interactivity:** The player can ONLY click nodes that have a direct path connection to the `currentNodeId`.
* **Fuel & Visited:** Clicking a valid node deducts 1 Fuel. If `visited` is false, load its assigned random event. If `visited` is true, display a generic "Empty Space" event. Set `visited = true` upon arrival.
* **Rendering:** Draw lines between connected nodes. Highlight the `currentNodeId`.

### D. The Rebel Fleet (`src/game/systems/MapSystem.ts`, `RenderSystem.ts`)
* Add `rebelFleetX` to the map state. It starts far to the left of the screen (e.g., `x = -100`).
* Every time the player jumps to a new node, advance `rebelFleetX` to the right by a fixed amount (e.g., 60-80 pixels).
* **Rendering:** Draw a semi-transparent red zone covering everything from `x = 0` to `rebelFleetX`. Add a "WARNING: REBEL FLEET" label.
* **Danger:** If the player jumps to a node whose `x` coordinate is `< rebelFleetX` (inside the red zone), they do NOT get the normal event. Instead, force a harsh combat event against an elite `rebel_a` ship (and perhaps turn off rewards for fleet fights to discourage farming).

## 3. Success Criteria
* The blue square debug cursor is gone.
* Weapons must be manually powered ON/OFF and draw from the Weapons System power pool. Removing power from the room disables weapons.
* The Star Map is a connected graph. Players can only travel along lines and it costs 1 Fuel.
* Visiting a node twice does not trigger its event again.
* The red Rebel Fleet zone advances every jump. Being caught in it forces a fight.
* No TypeScript errors.