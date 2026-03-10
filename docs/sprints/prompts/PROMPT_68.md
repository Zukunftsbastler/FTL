We need to fix a critical mechanics bug where crew members do not take suffocation damage in a vacuum, and we need to drastically expand our UI tooltip coverage to explain mechanics to the player.

Please review the requirements in `docs/sprints/SPRINT_68_TOOLTIPS_AND_HAZARDS.md`.

**Execution Rules:**
1. **Hazard Fix (Task A):** Check `data/ships.json` for incorrectly opened doors. Then, inspect `HazardSystem.ts` or `CrewSystem.ts`. Implement the logic that reduces `crew.health` when their current `room.oxygen` drops below 5%. Make sure this system updates even when in the `STAR_MAP` state.
2. **Difficulty Tooltips (Task B):** Update `HangarSystem.ts`. Use our existing tooltip rendering logic to explain the mechanical differences between Easy, Normal, and Hard when the user hovers over the selection buttons.
3. **Global Tooltips (Task C):** Update the UI rendering (in `CombatSystem.ts`, `MapSystem.ts`, or `UIRenderer.ts`) to display tooltips when hovering over Fuel, Missiles, Drones, Scrap, and the core ship systems (Shields, Engines, Oxygen).
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the suffocation bug is fixed and the new tooltips are visible and accurate, stage and commit the changes.
Use the commit message: "fix: Sprint 68 complete - Fixed crew suffocation damage and expanded UI tooltip coverage".

Please begin by checking `HazardSystem.ts` and the UI rendering files. Let me know when the commit is successful!