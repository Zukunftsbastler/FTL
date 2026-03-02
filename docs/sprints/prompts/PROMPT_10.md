Sprint 9 was a massive success. The game is playable, the state machine works perfectly, and the tooltips are a huge help. However, the game currently lacks "juice" and clear UI organization.

Please read `docs/sprints/SPRINT_10_GAME_FEEL_AND_UI.md`.

In this sprint, we are overhauling the visual feedback of combat. We are moving away from "instant hit" math and introducing physical projectiles that travel across the screen. We are also cleaning up the UI to match the classic FTL layout.

**Execution Rules:**
1. **The Layout:** The split-screen approach in Task A is vital. FTL uses the vast empty space between the two ships to emphasize the distance projectiles have to travel. Ensure the HUD elements are clearly readable.
2. **Decoupling Damage:** In Task C, you must remove the damage logic from the `CombatSystem` and move it into the `ProjectileSystem`. The `CombatSystem`'s only job when firing is to spawn the Projectile entity. The `ProjectileSystem` handles the impact and the math.
3. **Projectile Math:** For drawing the projectile in Task D, you can calculate the angle using `Math.atan2(targetY - originY, targetX - originX)` so the laser line points in the correct direction while traveling.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the UI is reorganized into top-corner dashboards, a center divider is drawn, and weapons fire visible projectiles that travel and deal damage upon impact, please stage and commit all changes. Use the commit message: "feat: Sprint 10 complete - Projectiles, impact feedback, and UI layout overhaul".

Please begin and let me know when the commit is successful!