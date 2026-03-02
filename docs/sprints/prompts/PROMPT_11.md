The implementation of Sprint 10 was fantastic. The UI layout and physical projectiles give the game a great feel. However, the player's ship lacks tactical depth. The crew are identical, weapons don't have distinct traits like accuracy, and there is no way to repair systems or heal crew.

We are pivoting to add RPG mechanics and tactical depth. Please read `docs/sprints/SPRINT_11_CREW_RPG_AND_REPAIR.md`.

**Execution Rules:**
1. **Schema First:** Start by updating `DATA_SCHEMA.md`, then update `data/ships.json` and `data/weapons.json`. Give our starting weapons different accuracies. Give the crew different Races and Classes.
2. **Visual Distinction:** Do not use external image files for the crew yet. Use Canvas primitives (different colors, shapes, or tiny text initials) in the `RenderSystem` so we can immediately tell an Engi Engineer apart from a Human Gunner.
3. **Manning System:** The `ManningSystem` should apply its buffs smoothly. If a crew member leaves the Weapons room, the weapon charge speed buff must immediately disappear. 
4. **Projectile Misses:** In the `ProjectileSystem`, if the random math determines a MISS, change the projectile's `targetX` so it flies way past the enemy ship, making the miss visually obvious.
5. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the crew has distinct RPG stats shown in the UI, they can heal in the Medbay/repair systems, and projectiles can miss based on accuracy, please stage and commit all changes. Use the commit message: "feat: Sprint 11 complete - Crew RPG mechanics, repair system, manning buffs, and weapon accuracy".

Please begin and let me know when the commit is successful!