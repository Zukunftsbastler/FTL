# SPRINT 06: Power Management & Test-Driven Foundation

## 1. Sprint Objective
**To the AI Assistant:** Our ship has a crew and physical space, but no power. The goal of this sprint is to introduce the Reactor, assign power capacities to ship systems (Shields, Weapons, O2), and allow the player to route power between them. 
Crucially, because power routing involves strict mathematical limits, we will initialize our testing framework (Vitest) and write unit tests for the power logic *before* hooking it up to the game loop. We will also generate the project's README.

## 2. Tasks

### A. Testing Setup & TDD (`tests/`)
* Install `vitest` as a dev dependency. Update `package.json` with a `"test": "vitest run"` script.
* Create `tests/game/PowerMath.test.ts`. 
* Write pure logic functions (not ECS systems yet) that handle power allocation:
  * `allocatePower(reactor, system)`: Reduces reactor available power by 1, increases system power by 1. Fails if reactor is empty or system is at max capacity.
  * `deallocatePower(reactor, system)`: Vice versa.
* Make sure the tests pass before proceeding.

### B. Project Documentation (`README.md`)
* Create a comprehensive `README.md` in the root directory.
* It must include: Project Title (FTL Engine Clone), Description, Setup Instructions (`npm install`, `npm run dev`), How to run tests (`npm run test`), and a brief overview of the custom ECS architecture.

### C. Power Components (`src/game/components/`)
Create the data structures for power management.
* `ReactorComponent` (`_type = 'Reactor'`): `{ totalPower: number; currentPower: number; }`
* `SystemComponent` (`_type = 'System'`): `{ type: SystemType; maxCapacity: number; currentPower: number; roomId: number; }`

### D. Update Factory & JSON (`data/ships.json`, `src/game/world/ShipFactory.ts`)
* Ensure `data/ships.json` gives the Kestrel a `startingReactorPower` (e.g., 8).
* Ensure the JSON `systems` array defines starting capacities (e.g., SHIELDS: 2, WEAPONS: 2).
* Update `ShipFactory.spawnShip`: 
  * Spawn one generic Entity representing the Ship's Core, attaching the `ReactorComponent`.
  * When iterating through the rooms, if a room has a `system`, create a `SystemComponent` and attach it to that room's Entity.

### E. Basic Power UI & Interaction (`src/game/systems/PowerSystem.ts`, `src/game/systems/RenderSystem.ts`)

* **Interaction:** For now, keep it simple. If the player presses the `UP` arrow while hovering the mouse over a room with a System, allocate 1 power to it. If they press `DOWN`, deallocate 1 power. Use the pure functions from Task A.
* **Rendering:** Update `RenderSystem.ts`. In rooms that have a System, draw a small visual indicator of its power state (e.g., `[ ||  ]` for 2/4 power) below the system name. Draw the total available Reactor Power in the bottom left corner of the screen.

## 3. Success Criteria
* `npm run test` executes successfully and passes all power allocation tests.
* `README.md` exists and accurately describes the project.
* Hovering over a system room (e.g., Shields) and pressing UP/DOWN dynamically changes the system's power and the global reactor power without violating max capacity or dropping below 0.
* Visual indicators update accordingly on the Canvas.
* No TypeScript errors (`tsc --noEmit`).