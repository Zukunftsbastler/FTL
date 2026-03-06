The game currently suffers from a severe state-leakage bug and some Map UI issues. We need to do a critical bugfix pass.

Please read `docs/sprints/SPRINT_26_STATE_AND_MAP_FIXES.md`.

**Execution Rules:**
1. **Pass-by-Reference Bug:** Task A is the most critical. You must find everywhere in `ShipFactory.ts` that reads from `AssetLoader` and wrap it in `JSON.parse(JSON.stringify(...))` to prevent mutating the global template cache.
2. **Map Visibility:** For Task C, separate the rendering of the nodes (stars) from the rendering of the lines. Draw ALL stars. But only draw a line `if (nodeA.visibility !== 'HIDDEN' || nodeB.visibility !== 'HIDDEN')` (or similar logic).
3. **Fleet Pacing:** In Task B, push the `rebelFleetPosition` far enough into the negative X coordinates so the player has breathing room at the start of the sector.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the templates are deep-copied, all map stars are visible (but lines hidden), and the Rebel Fleet pacing is fixed to allow narrative events, please stage and commit all changes. Use the commit message: "fix: Sprint 26 complete - Deep copy JSON templates, fix map star visibility, and adjust Fleet pacing".

Please begin and let me know when the commit is successful!