# SPRINT 07: Oxygen Simulation & Door Interaction

## 1. Sprint Objective
**To the AI Assistant:** Our ship has power, crew, and a physical layout. Now we need a breathable atmosphere. The goal of this sprint is to simulate oxygen levels per room, allow the player to click doors to open/close them, equalize oxygen through open doors, vent oxygen to space, and suffocate the crew if O2 drops too low.
Since we have a testing framework, the math for oxygen equalization must be unit-tested before integration.

## 2. Tasks

### A. TDD: Oxygen Math (`tests/game/OxygenMath.test.ts`)
* Create pure functions in `src/game/logic/OxygenMath.ts`.
* `calculateO2Change(currentO2, isPowered, hasBreach)`: Returns the new O2 level. Should slowly increase if powered, slowly decrease if unpowered.
* `equalizeO2(roomA_O2, roomB_O2, doorIsOpen)`: If the door is open, both rooms should step towards the average of their O2 levels. If one "room" is SPACE (0% O2), the internal room loses O2 rapidly.
* Write at least 4 tests covering these scenarios and ensure they pass.

### B. Door Interaction (`src/game/systems/DoorSystem.ts`)
* We need to let the player control the doors.
* Update or create a system that listens for `Input.isMouseJustPressed(0)`.
* If the click intersects with a Door's render bounding box, toggle its `isOpen` state.
* Note: Crew pathfinding might need a slight tweak. If a door is closed, crew should automatically open it when walking through, but for this sprint, it's okay if they just walk through it or if we treat closed doors as walkable for crew but blocked for O2. *For now, let's say crew can walk through any interior door, but O2 only flows if the door is explicitly `isOpen`.*

### C. Oxygen Components & ECS (`src/game/components/`, `src/game/systems/OxygenSystem.ts`)
* Create `OxygenComponent` (`_type = 'Oxygen'`): `{ level: number }` (0 to 100). Starts at 100.
* Update `ShipFactory` to attach an `OxygenComponent` to every room Entity.
* Create `OxygenSystem.ts`:
  * Find the 'OXYGEN' system entity to check its current power.
  * Apply `calculateO2Change` to all rooms based on power.
  * Iterate through all `DoorComponent` entities. If `isOpen`, apply `equalizeO2` to the connected rooms (or drain to 0 if connected to 'SPACE').

### D. Crew Suffocation (`src/game/systems/CrewSystem.ts`)
* If a crew member is standing in a room where `OxygenComponent.level < 5`, reduce their `health` slightly every frame using `Time.deltaTime`.
* If `health <= 0`, call `world.destroyEntity(crew)`.

### E. Rendering Updates (`src/game/systems/RenderSystem.ts`)
* **O2 Overlay:** When drawing rooms, if O2 is below 100%, draw a semi-transparent red or pink overlay over the room tile to visualize the lack of oxygen. The lower the O2, the more opaque the red overlay.
* **Doors:** Visually distinguish open doors from closed doors (e.g., closed = solid line, open = dashed line or empty gap).

## 3. Success Criteria
* `npm run test` passes with the new Oxygen math tests.
* Clicking a door toggles its visual state (open/closed).
* Deallocating power from the O2 system causes room overlays to slowly turn red.
* Opening an airlock (door to space) rapidly turns the connected room red.
* Crew members in red rooms lose health and disappear (die) at 0 health.
* No TypeScript errors.