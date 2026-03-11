We need to overhaul our door mechanics and visuals to perfectly match the original FTL experience. Currently, the UI uses confusing colors, and pathfinding might be incorrectly blocking friendly crew.

Please read the requirements in `docs/sprints/SPRINT_69_DOOR_MECHANICS_AND_VISUALS.md`.

**Execution Rules:**
1. **Visuals (Task A):** Open your ship rendering logic (likely `RenderSystem.ts`). Overhaul the door rendering. Stop using colors for state. Instead, if a door is closed, draw a full thick rectangle. If it is open, draw two small stubs on the edges and leave the center completely empty. Ensure airlocks and inner doors look functionally identical.
2. **Pathfinding (Task B):** Open `Pathfinder.ts` (or your navigation logic). Update the graph generation or neighbor checking. A closed door must NOT be considered an obstacle if the path is being calculated for a friendly crew member. Friendly crew ignore closed door restrictions.
3. **Interaction (Task C):** Verify that clicking a door toggles `door.isOpen`.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once doors render geometrically (gaps for open, solid for closed) and friendly crew can route through closed doors, stage and commit the changes.
Use the commit message: "fix: Sprint 69 complete - Overhauled door rendering to geometric style and fixed friendly crew pathfinding".

Please begin by checking `RenderSystem.ts` and `Pathfinder.ts`. Let me know when the commit is successful!