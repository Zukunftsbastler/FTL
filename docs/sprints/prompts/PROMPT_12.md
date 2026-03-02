Sprint 10 was a massive leap forward in game feel. The projectiles and the split UI look incredible. 

We are now moving to Sprint 11. Please read `docs/sprints/SPRINT_11_SHIELDS_AND_AI.md`.

This sprint introduces actual combat tension. The enemy will shoot back, and we are introducing the Shield system to block physical projectiles.

**Execution Rules:**
1. **TDD First:** Do Task A first. FTL shields are unique: 1 power = 0 shields. 2 power = 1 shield. 3 power = 1 shield. 4 power = 2 shields. Test this math thoroughly in `ShieldMath.test.ts` before writing the ECS system.
2. **ECS Interception:** In Task C, the `ProjectileSystem` must check for shields *before* dealing damage. This is a perfect example of why decoupling damage from the firing action in Sprint 10 was the right choice!
3. **Enemy AI:** Keep the AI dumb for now (Task D). Randomly picking a player room as a target once the weapon is charged is perfectly fine.
4. Ensure zero TypeScript errors (`tsc --noEmit`) and ensure all tests pass (`npm run test`).

**Version Control Instructions:**
Once the tests pass, both ships render shield bubbles, the enemy ship fires back at you, and shields successfully intercept projectiles, please stage and commit all changes. Use the commit message: "feat: Sprint 11 complete - Shields, projectile interception, and basic Enemy AI".

Please begin and let me know when the commit is successful!