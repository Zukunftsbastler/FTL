We have an incredible bug: Enemy crew are flying through space to man stations on the player's ship because `MovementSystem` has the player's pixel coordinates hardcoded in its constructor! We need to fix this and perform a massive visual UI overhaul using Canvas APIs.

Please read `docs/sprints/SPRINT_29_VISUALS_AND_CREW_FIXES.md`.

**Execution Rules:**
1. **Dynamic Pixel Origin:** In Task A, refactor `MovementSystem.ts` so it looks up the `PositionComponent` of the crew member's parent ship (via `OwnerComponent`) to establish `shipX` and `shipY`. Delete the constructor parameters. 
2. **Procedural Hull:** In Task B, to draw the hull, iterate over the ship's room entities to find `Math.min` and `Math.max` for X and Y coordinates (including room width/height). Use that bounding box with padding to draw a `fillRect` behind the rooms.
3. **UI Layout:** For Task C, hardcode the layout using clean, dark UI panels (`rgba` colors) to give the game a professional "Command Terminal" look instead of floating text.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the MovementSystem translates coordinates per-ship, the UI is enclosed in beautiful dark panels, procedural hulls render behind rooms, and a starfield scrolls, please stage and commit all changes. Use the commit message: "fix/feat: Sprint 29 complete - Dynamic movement coordinates, procedural hulls, and UI layout panels".

Please begin and let me know when the commit is successful!