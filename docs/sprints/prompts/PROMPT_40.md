We have a major feature adjustment and three critical physics/rendering bugs to fix. We need to restrict upgrades strictly to the Store, allow purchasing of new Systems, fix a transparency bleed-through in our WebGL hulls, fix the repair loop, and restore vacuum mechanics for open airlocks.

Please read `docs/sprints/SPRINT_40_STORE_AND_FIXES.md`.

**Execution Rules:**
1. **The Bleed-Through:** Task A is a simple Canvas layering fix. In `RenderSystem.ts`, just do a pass drawing solid black `fillRect` over the room grid before applying any other semi-transparent masks or room floors.
2. **Repairs:** In Task B, check `RepairSystem`. It must interact with `system.damageAmount`. Don't forget to give the player visual feedback (a red icon or floor tint) in `RenderSystem` if a room contains a damaged system!
3. **Oxygen:** In Task C, verify the adjacency check. If a door is open and is an exterior door, the room's O2 must plummet. 
4. **Store UI:** In Task D, ensure the AST LayoutEngine gracefully handles the new "Buy Subsystems" and "Upgrade Ship" buttons inside the Store modal. 
5. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the planet no longer bleeds through, crew successfully repair damage, airlocks vent oxygen, and the Store offers system purchases + upgrades, please stage and commit all changes. Use the commit message: "fix/feat: Sprint 40 complete - Store system purchases, repair logic, vacuum physics, and render fixes".

Please begin and let me know when the commit is successful!