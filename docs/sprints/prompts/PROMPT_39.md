We have critical power management bugs holding back the combat loop. Furthermore, we want to introduce a balanced, tiered Enemy Scaling system that dynamically adds existing advanced systems (Cloaking, Drones) to enemies as the sectors progress, avoiding early-game overpowered weapons.

Please read `docs/sprints/SPRINT_39_SCALING_AND_FIXES.md`.

**Execution Rules:**
1. **The Upgrade Fix:** Task A is vital. Open `UpgradeSystem.ts`. Everywhere a system's `level` is increased, you must add a line to increase `maxCapacity` by the same amount so it isn't treated as damaged. 
2. **Power Pool:** In `PowerMath.ts`, ensure `deallocatePower` returns energy to the reactor, and `allocatePower` strictly checks `currentPower < maxCapacity`.
3. **Sector Jump:** In `MapSystem.ts`, when jumping to an exit node, call map generation, push the fleet back, and increment `GameStateData.sectorNumber`.
4. **Enemy Scaler (Tiered):** In Task C and D, build the `EnemyScaler.ts` carefully. Deep copy the ship template before mutating it. Use the weapon's `powerRequired` to filter safe weapons for early sectors. Inject `CLOAKING` or `DRONE_CTRL` dynamically to the systems array for later sectors.
5. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once power can be freely added/removed/upgraded, jumping to the exit generates a new sector, and enemies dynamically scale up with Drones/Cloaking and tiered weapons, please stage and commit all changes. Use the commit message: "fix/feat: Sprint 39 complete - Power fixes, tiered enemy scaling, and advanced system integration".

Please begin and let me know when the commit is successful!