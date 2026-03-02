# SPRINT 05: Doors and A* Pathfinding

## 1. Sprint Objective
**To the AI Assistant:** Currently, crew members move in a straight line, clipping through ship walls. The goal of this sprint is to spawn Door entities based on the ship's JSON data, render them, and implement an A* pathfinding algorithm restricted to 4-way movement (North, South, East, West). Crew must only be able to move between rooms if a door connects them.

## 2. Tasks

### A. Door Components & Factory (`src/game/components/`, `src/game/world/ShipFactory.ts`)
* Create `DoorComponent` (`_type = 'Door'`): Contains `roomA`, `roomB`, `isOpen: boolean`, and `isVertical: boolean`.
* Update `ShipFactory.spawnShip`: Iterate over the `doors` array from the JSON template. For each door, create an Entity with a `PositionComponent` (using the door's grid x/y) and a `DoorComponent`.

### B. Render Doors (`src/game/systems/RenderSystem.ts`)
* Query for `['Door', 'Position']`.
* Draw the doors over the room borders. 
* *Visual suggestion:* If a door is vertical, draw a tall, thin rectangle. If horizontal, a short, wide rectangle. Use a distinct color (e.g., `#888888`) so they stand out from the room borders.

### C. The Navigation Grid / Pathfinder (`src/utils/Pathfinder.ts`)
Create a utility class to handle the A* algorithm. It needs to understand the ship's layout.
* **Nodes:** Every tile inside a room is a walkable node. Tiles in space (outside rooms) are non-walkable.
* **Edges (Connections):** * Adjacent tiles *within the same room* are always connected.
  * Adjacent tiles in *different rooms* are ONLY connected if there is a Door entity at that shared boundary.
* **Algorithm:** Implement standard A* using the Manhattan distance heuristic (no diagonal movement allowed).
* The output should be a function `findPath(startX, startY, targetX, targetY): GridCoord[]`.

### D. Update Movement Logic (`src/game/systems/MovementSystem.ts` & `SelectionSystem.ts`)
* **SelectionSystem:** On right-click, instead of just setting `targetX/Y`, call `Pathfinder.findPath()`. If a path is found, store the resulting array in the selected crew's `PathfindingComponent.path`.
* **MovementSystem:** Update the lerp logic. Instead of lerping to the final target, lerp to the *first* coordinate in the `path` array. Once the crew reaches that exact pixel coordinate, remove it from the array (`path.shift()`) and begin lerping to the next one. Stop when the array is empty.

## 3. Success Criteria
* Doors are visually rendered on the borders between rooms.
* Right-clicking commands the crew to walk along the grid (horizontally and vertically only).
* Crew route themselves *through* doors to reach other rooms.
* If a player clicks a tile outside the ship (in space) or an unreachable room, the crew member does not move (pathfinding returns null/empty).
* No TypeScript errors (`tsc --noEmit`).