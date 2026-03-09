We need to adjust the combat pacing, improve the UI for repairs, and implement two important core mechanics from the original FTL: Crew Kills and the FTL escape drive.

Please read the details in `docs/sprints/SPRINT_44_COMBAT_PACING_AND_REPAIRS.md`.

**Execution Rules:**
1. **Audit & Fixes (Task A):** Review `HazardSystem.ts` and `RepairSystem.ts` (and `EnemyAISystem.ts`). Ensure that fires spread and cause hull damage over time. Also, verify that the AI truly repairs its systems completely until they are fully operational. Fix anything that is missing or incomplete here.
2. **Repair UI (Task B):** Implement a visible progress bar in the render system (e.g., in `UIRenderer.ts` or wherever rooms/systems are drawn) that fills up while a player system is actively being repaired.
3. **Scaling (Task C):** Adjust `EnemyScaler.ts` or `ShipFactory.ts` so that enemy ships in the first sector start with a base of about 8 Hull, and dynamically scale this value up depending on the current sector depth.
4. **Crew Kill (Task D):** Implement the victory condition in `VictorySystem.ts`: If the enemy crew reaches 0, the combat is instantly won. Provide slightly higher loot multipliers for a "Crew Kill" compared to destroying the hull.
5. **FTL Drive (Task E):** Add `ftlCharge` to the `ShipComponent`. Make this value charge up over time in the `JumpSystem` during combat, based on the active power in the 'Engines' system and whether 'Piloting' is functional. Build a simple UI representation for this charge.
6. Ensure there are zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once all tasks from the sprint are successfully implemented, stage and commit all changes. 
Use the commit message: "feat: Sprint 44 complete - Combat pacing, Repair UI, Crew Kills and FTL Drive charging".

Please begin analyzing the mentioned files now and implement the tasks step by step! Let me know when the commit is successful.