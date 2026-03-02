Sprint 7 is perfectly executed. The oxygen simulation is brilliant and the tests give us a lot of confidence.

We are now moving to Sprint 8. Please read `docs/sprints/SPRINT_08_WEAPONS_AND_TARGETING.md`.

This is a massive milestone: we are implementing Ship-to-Ship combat. Because of our clean ECS, spawning an enemy ship should be as simple as calling `ShipFactory.spawnShip` a second time with different coordinates!

**Execution Rules:**
1. **Scope the UI:** The weapon UI doesn't need to be fancy. A simple `Renderer.drawRect` with text showing the weapon name and a green progress bar for the charge is enough for now.
2. **Instant Hit:** Do not build a complex physics system for flying projectiles yet. When a weapon fires, apply the damage instantly to the target room/hull and maybe flash the room white or draw a simple line for 1 frame. We will build projectile travel time and evasion in a later sprint.
3. **Power Requirement:** A weapon only charges if the Ship's WEAPON system has enough power allocated to it. Ensure the logic respects this limit.
4. Remember to write the TDD tests for `WeaponMath.ts` before implementing the ECS systems.

**Version Control Instructions:**
Once the tests pass, two ships render, weapons charge based on allocated power, and you can click to target an enemy room and deal damage, please stage and commit all changes. Use the commit message: "feat: Sprint 8 complete - Enemy ship spawning, weapon UI, targeting, and combat logic".

Please begin and let me know when the commit is successful!