We have uncovered some critical bugs after our recent architectural overhauls, and the game is currently crashing or featuring enemies that refuse to shoot. We are also going to implement FTL's strict, deterministic enemy AI rules.

Please read `docs/sprints/SPRINT_25_AI_AND_CRITICAL_FIXES.md`.

**Execution Rules:**
1. **Fix the Crash First:** In Task A, the crash at `ShipFactory.ts:116` happens because `events.json` asks for ship IDs that don't exist in `ships.json`. Add the missing placeholders to `ships.json` AND add error throwing in `ShipFactory`.
2. **Fix the Pacifist AI:** The AI hasn't been turning its weapons on since we introduced the power pool in Sprint 22. In `EnemyAISystem`, you must write logic that loops through the enemy's weapons and sets `isPowered = true`, decrementing available `Weapons` system power just like the player does.
3. **Missile Ammo:** Ensure the player cannot fire missiles if they have 0 ammo, and that firing consumes 1 ammo.
4. **AI Targeting & Crew:** Implement the weighted targeting and the strict crew priorities (Self-Preservation -> Piloting -> Repair). 
5. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the bugs are fixed (enemies shoot back, no crashes, ammo depletes) and the enemy AI dynamically prioritizes rooms and repairs, please stage and commit all changes. Use the commit message: "fix/feat: Sprint 25 complete - Critical bug fixes, ammo consumption, and FTL deterministic Enemy AI".

Please begin and let me know when the commit is successful!