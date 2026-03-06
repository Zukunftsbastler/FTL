We are undertaking a massive Quality of Life and UX sprint. The current control scheme is fragmented. We need to unify the controls into the classic RTS / FTL paradigm: Left-click means Select/Increase/Activate, Right-click means Command/Decrease/Cancel.

Please read `docs/sprints/SPRINT_22_INTERACTION_PARADIGM.md`.

**Execution Rules:**
1. **Context Menu Block:** Start with Task A in `Input.ts`. Use `e.preventDefault()` on the `contextmenu` event. If the browser menu pops up during gameplay, the game is unplayable. Ensure Right-Click maps correctly to `isMouseJustPressed(2)`.
2. **Hitbox Calculation:** For Task B, the systems are drawn in the Player Dashboard at the top-left (or bottom-left depending on your current RenderSystem layout). You will need to expose the bounding boxes of these drawn text/bar elements so the `PowerSystem` can check if `Input.getMousePosition()` falls inside them on a click.
3. **Delete old logic:** Completely remove the `ArrowUp` and `ArrowDown` hover logic from the `PowerSystem`.
4. **Weapon States:** In Task C, carefully manage the weapon power state. A weapon can only be powered if the `WEAPONS` SystemComponent has enough spare capacity (power not already used by other weapons).
5. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the browser context menu is blocked, power is routed via Left/Right clicks on the system HUD, and weapons are powered/targeted via Left/Right clicks on their UI boxes, please stage and commit all changes. Use the commit message: "feat: Sprint 22 complete - Unified Left/Right click interaction paradigm and context menu block".

Please begin and let me know when the commit is successful!