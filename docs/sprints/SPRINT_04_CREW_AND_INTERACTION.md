# SPRINT 04: Crew Entities & Basic Interaction

## 1. Sprint Objective
**To the AI Assistant:** The ship grid is currently empty. The goal of this sprint is to populate the ship with Crew Entities, implement a selection mechanic via the mouse, and allow the player to command a selected crew member to move to a different room. 

## 2. Tasks

### A. Data Schema Updates (`docs/api/DATA_SCHEMA.md` & `data/ships.json`)
* Update `ShipTemplate` in the schema to include an array of `startingCrew`. Each entry should specify a `name`, `race` (e.g., 'HUMAN'), and the `roomId` where they spawn.
* Update your `data/ships.json` to spawn 3 human crew members in different rooms (e.g., Piloting, Weapons, Engines).

### B. New Components (`src/game/components/`)
Create the data containers necessary for living entities.
* `CrewComponent` (`_type = 'Crew'`): Contains `name`, `race`, `health` (100), and `maxHealth`.
* `SelectableComponent` (`_type = 'Selectable'`): A simple flag `isSelected: boolean`.
* `PathfindingComponent` (`_type = 'Pathfinding'`): Contains `targetX`, `targetY` (grid coordinates), and an array of grid coordinates representing the `path` to the target.

### C. Update ShipFactory (`src/game/world/ShipFactory.ts`)
* After the rooms are spawned, iterate through the `startingCrew` array from the JSON.
* For each crew member, create an Entity with `CrewComponent`, `SelectableComponent`, and a `PositionComponent`.
* *Math:* Their initial `PositionComponent` should place them exactly in the center of the first available tile of their assigned `roomId`.

### D. Crew Selection System (`src/game/systems/SelectionSystem.ts`)
Implement the logic to select a crew member using the `IInput` system.
* Listen for `Input.isMouseJustPressed(0)` (Left Click).
* Convert the mouse's pixel coordinates back into grid coordinates based on the ship's offset and `TILE_SIZE`.
* Query all Entities with `['Crew', 'Selectable', 'Position']`.
* If the click intersects with a Crew's tile, set `isSelected = true`. If the player clicks empty space, set `isSelected = false` for all crew (deselect).

### E. Crew Render System Update (`src/game/systems/RenderSystem.ts`)
Teach the renderer to draw the crew.
* Draw crew members as simple colored circles (e.g., green for Humans) inside their respective room tiles.
* If a crew member has `SelectableComponent.isSelected === true`, draw a bright green bounding box or outline around them to indicate they are active.

### F. Basic Movement Logic (`src/game/systems/MovementSystem.ts`)
* Listen for `Input.isMouseJustPressed(2)` (Right Click).
* If a Crew member is currently selected, assign the clicked grid coordinates to their `PathfindingComponent` as a target.
* *Simplification for this sprint:* Do not write a complex A* pathfinder yet. Simply teleport the crew member to the target tile, OR write a basic linear lerp (straight line) over a few frames. We will implement collision and pathing around walls in Sprint 5.

## 3. Success Criteria
* The ship spawns with 3 distinct crew members visible inside their assigned rooms.
* Left-clicking a crew member highlights them visually.
* Left-clicking off a crew member deselects them.
* Right-clicking an empty tile while a crew member is selected moves that crew member to the new tile.
* No TypeScript errors (`tsc --noEmit`).