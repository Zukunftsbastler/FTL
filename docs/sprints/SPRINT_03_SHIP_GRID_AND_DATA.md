# SPRINT 03: The Ship Grid & Data-Driven Spawning

## 1. Sprint Objective
**To the AI Assistant:** Now that our ECS foundation and AssetLoader are functional, we need to implement our Data-Driven architecture. The goal of this sprint is to load a ship's layout from a JSON file, parse it into ECS entities (Rooms), and render the ship's floorplan onto the canvas. 

## 2. Tasks

### A. Create the Test Data (`data/ships.json`)
Create a simple JSON file containing a single test ship based on the `ShipTemplate` interface defined in `docs/api/DATA_SCHEMA.md`.
* Create a ship with at least 3 distinct rooms (e.g., Piloting, Shields, Engines).
* Ensure the rooms have explicit grid coordinates (`x`, `y`) and sizes (`width`, `height`). Note: These represent grid tiles, not literal screen pixels.

### B. Create Game Components (`src/game/components/`)
We need data containers to represent the ship's physical space.
* `ShipComponent` (`_type = 'Ship'`): Contains `id` and `maxHull`.
* `RoomComponent` (`_type = 'Room'`): Contains `roomId`, grid coordinates (`x`, `y`), dimensions (`width`, `height`), and the optional `system` type (e.g., 'SHIELDS').

### C. The Ship Factory (`src/game/world/ShipFactory.ts`)
Create a static class or function responsible for translating the JSON data into ECS Entities.
* `spawnShip(world: IWorld, templateId: string, startX: number, startY: number): void`
* This function should fetch the parsed JSON from `AssetLoader`.
* It creates a parent Entity for the Ship (with `ShipComponent`).
* It iterates through the `rooms` array in the JSON, creating a new Entity for each room.
* Each room Entity should receive a `RoomComponent` and a `PositionComponent`. 
* *Crucial Math:* The `PositionComponent`'s `x` and `y` must be calculated by multiplying the room's grid `x`/`y` by a constant `TILE_SIZE` (e.g., 32 or 40 pixels) and adding the ship's `startX`/`startY` offset.

### D. Update the Render System (`src/game/systems/RenderSystem.ts`)
Teach the RenderSystem how to draw rooms.
* Add a query for Entities with `['Room', 'Position']`.
* Iterate through them and use `Renderer.drawRect()` to draw the room. 
* Fill the room with a dark gray color, and give it a lighter gray or white border so the individual rooms are clearly distinguishable.
* Render the name of the system (if present) in the center of the room using `Renderer.drawText()`.

### E. Integration (`src/main.ts`)
* In the Pre-load phase, instruct `AssetLoader` to load `data/ships.json`.
* After the test entity from Sprint 2 is created, call `ShipFactory.spawnShip()` to spawn the test ship in the center of the canvas.
* The cursor entity from Sprint 2 should still work and hover *over* the rendered ship.

## 3. Success Criteria
* `data/ships.json` is successfully fetched and parsed on startup.
* The screen displays a grid of connected rectangular rooms representing the ship.
* The rooms are visually distinct (borders) and display their assigned System name (e.g., "SHIELDS").
* No TypeScript errors (`tsc --noEmit`).