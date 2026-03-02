# SPRINT 09: Game States & Quality of Life (QoL)

## 1. Sprint Objective
**To the AI Assistant:** Our engine successfully simulates a complex ship, but the game is currently unplayable due to immediate suffocation and lack of clear UI states. The goal of this sprint is two-fold:
1. Implement a basic State Machine so we can transition from a "Map/Jump" screen to the "Combat" screen.
2. Fix major Quality of Life issues: Ships must spawn with vital systems (O2) pre-powered, and we need simple on-screen instructions/tooltips so the user knows how to route power and fire weapons.

## 2. Tasks

### A. Auto-Power Vital Systems (`src/game/logic/PowerMath.ts`, `ShipFactory.ts`)
* Currently, systems spawn with 0 power. 
* Update `ShipFactory.ts` (or create an initialization function) so that when a ship spawns, it automatically attempts to allocate power to its vital systems up to their current capacity, prioritizing OXYGEN and SHIELDS. This prevents the crew from instantly suffocating on load.

### B. Game State Machine (`src/engine/GameState.ts`, `src/main.ts`)
* Implement a simple State Machine pattern.
* Define at least two states: `State.STAR_MAP` and `State.COMBAT`.
* **State.STAR_MAP:** A simple screen drawing a few "Star" nodes. Clicking a node transitions the game to the `COMBAT` state.
* **State.COMBAT:** This is our current gameplay loop (updating and rendering the ECS).
* Update `main.ts` to use this state machine, starting in `STAR_MAP`. When entering `COMBAT`, *that* is when the Enemy ship should be spawned via `ShipFactory`.

### C. Contextual Help / Tooltips (`src/game/systems/RenderSystem.ts`)
We need to guide the player without building a massive AI tutorial agent yet.
* Implement a `drawTooltip(x, y, text)` function in `Renderer.ts`.
* In `RenderSystem.ts` (or a dedicated `UISystem`), check the mouse position.
  * If hovering over a System Room, display a tooltip: *"Press UP/DOWN to route power"*.
  * If hovering over a Weapon in the UI, display: *"Click to select, then click enemy room to target"*.

### D. The FTL Jump Mechanic (`src/game/components/`, `src/game/systems/JumpSystem.ts`)
* Add a button or UI element in the `COMBAT` state labeled "FTL JUMP".
* This button should only be clickable if the ENEMY ship is destroyed (Hull <= 0). (We will add charging later).
* Clicking it destroys the Enemy ship entity (and all its rooms/components) and transitions the Game State back to `STAR_MAP`.

## 3. Success Criteria
* The game boots into a "Star Map" screen, not directly into combat.
* Clicking a node on the map transitions to the Combat screen and spawns an enemy.
* The player's Oxygen system starts automatically powered so the crew doesn't suffocate immediately.
* Hovering over rooms and weapons displays helpful tooltips.
* Destroying the enemy hull allows the player to "Jump" back to the Star Map.
* No TypeScript errors.