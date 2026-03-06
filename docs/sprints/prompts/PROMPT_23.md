The unified Left/Right click paradigm from Sprint 22 feels fantastic. Now, we need to ensure the player understands what those clicks will actually do before they make them. We are focusing on UI/UX, specifically visual affordances and data-rich tooltips.

Please read `docs/sprints/SPRINT_23_UI_AFFORDANCES_AND_TOOLTIPS.md`.

**Execution Rules:**
1. **Cursor Management:** For Task A, the cleanest way to handle the CSS cursor in an ECS is to reset the canvas cursor to 'default' at the very beginning of the `RenderSystem` or `Input` update loop, and then let the various logic systems (Selection, Targeting) overwrite it to 'pointer', 'crosshair', or 'not-allowed' during their frame updates.
2. **Rich Tooltips:** For Tasks C and D, you will need to refactor `Renderer.drawTooltip` to accept either an array of strings or a configuration object so it can draw a proper dark semi-transparent box with multiple lines of aligned text (a "Card"). 
3. **Data Fetching:** Pull the exact numbers for the tooltips directly from the `WeaponTemplate`, `CrewComponent`, and `SystemComponent`. Do not hardcode the descriptions; construct the strings dynamically based on the entity's current stats.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the cursor changes dynamically based on context, power bars clearly show empty/filled/damaged states, and hovering elements produces multi-line data tooltips, please stage and commit all changes. Use the commit message: "feat: Sprint 23 complete - Context-sensitive cursors, rich tooltips, and power bar affordances".

Please begin and let me know when the commit is successful!