We are undertaking a major visual UX pass. The game currently looks like a developer's debug view. We need to implement a dedicated UI rendering framework with a distinct "Sci-Fi" aesthetic (chamfered corners, gradients, thick borders), scale the ships up drastically, and fix UI overlapping issues.

Please read `docs/sprints/SPRINT_30_UI_FRAMEWORK_AND_SCALE.md`.

**Execution Rules:**
1. **The UIRenderer:** In Task A, building `drawSciFiPanel` is critical. To draw chamfered (cut) corners, do not use `fillRect`. You must trace the path. For example, start at `moveTo(x + chamfer, y)`, go to `lineTo(x + w, y)`, then down to `lineTo(x + w, y + h - chamfer)`, etc. Fill it, then stroke it.
2. **Global Scaling:** In Task B, changing `TILE_SIZE` to 55 or 60 in `constants.ts` will make the ships huge. This is intended. Make sure any hardcoded pixel offsets in `RenderSystem` (like drawing crew or doors) scale proportionally if they weren't already.
3. **Safe Zones:** Task C is vital to fix the overlapping bug. The player ship must be pushed to the right so it clears the Left Pillar UI (width ~250px), and pushed down so it clears the Top Bar. Use exact math to center them in the remaining screen space.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the UIRenderer is implemented, all game states use it for menus, ships are scaled up via TILE_SIZE, and the safe zone prevents overlaps, please stage and commit all changes. Use the commit message: "feat: Sprint 30 complete - Sci-Fi UIRenderer, increased ship scaling, and safe zone anti-overlap".

Please begin and let me know when the commit is successful!