We have a critical physics bug causing a permanent reactor power leak during combat, and the projectile visual effects from Sprint 40 were skipped. We must fix the reactor refund logic and implement a proper Projectile Render System.

Please read `docs/sprints/SPRINT_43_POWER_LEAK_AND_VFX.md`.

**Execution Rules:**
1. **The Power Refund:** In Task A, carefully review `ProjectileSystem.ts` (and anywhere else system damage is applied). If `currentPower` is forced down by damage, you MUST add that exact amount back to `reactor.freePower` on the owning ship!
2. **History Tracking:** In Task B, projectiles must actively record their last 8-10 positions into an array in `ProjectileSystem`. This data is essential for drawing trails.
3. **The VFX Rendering:** In Task C, create `ProjectileRenderSystem.ts`. You MUST use `ctx.shadowBlur` and `ctx.shadowColor` when drawing lasers/ions to create the neon effect. For missiles, loop over the `history` array to draw a tapering line. ALWAYS reset `shadowBlur = 0` afterwards.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the power leak is fixed (energy is refunded on damage) and projectiles are drawn via a dedicated system with glowing shaders and trails, please stage and commit all changes. Use the commit message: "fix/feat: Sprint 43 complete - Reactor power leak refund and procedural Projectile VFX".

Please begin and let me know when the commit is successful!