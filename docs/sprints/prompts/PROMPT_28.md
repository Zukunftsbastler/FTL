We have uncovered some critical data balancing issues and a hardcoded damage bug that are preventing the enemy AI from functioning fully.

Please read `docs/sprints/SPRINT_28_BALANCING_AND_DAMAGE.md`.

**Execution Rules:**
1. **JSON Editing:** Carefully edit `data/ships.json`. For `rebel_a` and `rebel_fighter`, change the WEAPONS system level to 2 so they can actually power the Burst Laser. Add a HUMAN crew member to their `startingCrew` array in `roomId: 0` so they can repair their shields when you shoot them.
2. **System Damage Math:** In `ProjectileSystem.ts` -> `applyImpact()`, change the `system.maxCapacity -= 1` logic to subtract the actual `proj.damage` (clamped by the remaining `maxCapacity` so it doesn't go below 0). 
3. Ensure zero TypeScript errors (`tsc --noEmit`) and valid JSON (`data/ships.json`).

**Version Control Instructions:**
Once the enemy templates are updated and the damage math is fixed, please stage and commit all changes. Use the commit message: "fix: Sprint 28 complete - Enemy weapon capacity, crew repair additions, and correct system damage scaling".

Please begin and let me know when the commit is successful!