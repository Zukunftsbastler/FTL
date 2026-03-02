Fantastic execution on Sprint 4. The movement and rendering layers are working beautifully. 

Please read `docs/sprints/SPRINT_05_DOORS_AND_PATHFINDING.md`.

In this sprint, we are upgrading the crew from "ghosts" to physical entities constrained by the ship's architecture. We are introducing Doors and an A* Pathfinding system.

**Execution Rules:**
1. **The Grid Logic:** FTL ships are not open fields. A tile is only walkable if it belongs to a room. Adjacent tiles in *different* rooms are separated by solid walls and cannot be traversed unless a Door exists between them.
2. **Pathfinding Constraints:** You must implement a strict 4-way movement A* algorithm (Manhattan distance heuristic). No diagonal movement is allowed.
3. **Movement System Update:** Modify the `MovementSystem` so it consumes the `path` array node-by-node. Lerp to `path[0]`, snap to it upon arrival, `shift()` the array, and proceed to the next node.
4. Work step-by-step through Tasks A to D. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the doors are rendering and crew members successfully navigate around walls and through doors to reach their right-click destinations, please stage and commit all changes. Use the commit message: "feat: Sprint 5 complete - Doors, NavGrid, and A* Pathfinding".

Please begin and let me know when the commit is successful!