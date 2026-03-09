We need to implement critical fixes to our FTL jump mechanics during combat, perfectly mirroring the original game's charge rates, and fix the enemy hull scaling to match the original game's authentic +1 HP per sector progression.

Please read `docs/sprints/SPRINT_46_FTL_ESCAPE_AND_SCALING_FIXES.md` for the exact requirements and the math table.

**Execution Rules:**
1. **Authentic FTL Charge (Task A):** Implement the exact FTL charge times based on Engine power (from 68s at 1 power down to 23s at 8 power). Ensure the FTL drive ONLY charges if the Piloting room is manned (or system level >= 2). Add a 10% charge rate bonus if Engines are manned. Update `ftlCharge` on the `ShipComponent`.
2. **FTL Escape UI (Task B):** Refactor `JumpSystem.ts`. The FTL button must always be visible during combat and feature a filling yellow charge bar. Once `ftlCharge >= 1.0`, it becomes clickable to escape the fight. Escaping must NOT destroy the enemy ship.
3. **Hull Scaling (Task C):** Update `EnemyScaler.ts`. Ensure that when an enemy ship is scaled, its `maxHull` and `currentHull` are explicitly set to its base `maxHull` plus `(sector - 1)`.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the authentic FTL charge math, escape UI, and hull scaling are fully implemented and working, stage and commit all changes. 
Use the commit message: "fix: Sprint 46 complete - Authentic FTL charge math, combat escape UI, and accurate +1 hull scaling".

Please begin by analyzing `JumpSystem.ts` and `EnemyScaler.ts`. Let me know when the commit is successful!