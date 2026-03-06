We have diagnosed three critical UX/Logic bugs that are ruining the game loop. Enemy weapons are starved of power due to bad priority sorting, map nodes are bypassing the Event System, and hidden map nodes are painted in colors too dark to see.

Please read `docs/sprints/SPRINT_27_AI_POWER_AND_MAP_FIXES.md`.

**Execution Rules:**
1. **ShipFactory:** Simply alter the `POWER_PRIORITY` array so `WEAPONS` comes before `ENGINES` and `PILOTING`.
2. **Map Routing:** In `MapSystem.ts`, the `jump()` method must NOT call `callbacks.onCombat` directly. For `COMBAT` nodes, pick a random ID from `['rebel_patrol', 'pirate_ambush', 'automated_rebel_scout', 'slug_surrender_trick']` and call `callbacks.onEvent(...)`.
3. **Map Colors:** Update the constants at the top of `MapSystem.ts` so hidden nodes are visibly drawn.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once enemies shoot back, combat nodes route through the Event System, and hidden nodes are visible, please stage and commit all changes. Use the commit message: "fix: Sprint 27 complete - AI power priority, map event routing, and node visibility".

Please begin and let me know when the commit is successful!