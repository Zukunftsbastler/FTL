Outstanding work on Sprint 3. The data-driven factory and the rendering pipeline for the ship grid are perfect. We are now ready for Sprint 4.

Please read `docs/sprints/SPRINT_04_CREW_AND_INTERACTION.md`.

In this sprint, we are bringing the ship to life by spawning Crew entities, implementing mouse-based selection, and adding a rudimentary movement command. 

**Execution Rules:**
1. Update `docs/api/DATA_SCHEMA.md` first to reflect the new `startingCrew` array in the `ShipTemplate`, then update `data/ships.json` accordingly.
2. In `src/game/systems/SelectionSystem.ts`, use the `Time` and `Input` systems to detect clicks. You will need to reverse-calculate the grid coordinates from the mouse's pixel coordinates (accounting for the ship's centering offset and `TILE_SIZE`).
3. **CRITICAL:** For Task F (`MovementSystem`), DO NOT implement A* pathfinding or wall collision. We will do that in Sprint 5. For now, when a right-click occurs, simply update the selected crew member's `PositionComponent` to teleport them directly to the target tile, or write a very simple linear lerp (straight line movement) over a few frames. Keep it as simple as possible.
4. Work step-by-step through Tasks A to F. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the crew spawns, can be selected (highlighted) with left-click, and moves to a target tile with right-click, please stage and commit all changes. Use the commit message: "feat: Sprint 4 complete - Crew spawning, selection, and basic movement".

Please begin and let me know when the commit is successful!