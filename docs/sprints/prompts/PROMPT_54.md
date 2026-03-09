We need to implement the overarching Sector Selection Map (macro-strategy) and unify our Star Map UI by utilizing our established combat UI panels (the frames with beveled edges).

Please review the requirements in `docs/sprints/SPRINT_54_SECTOR_TREE_AND_MAP_UI.md`.

**Execution Rules:**
1. **Map UI Updates (Task A):** Open `MapSystem.ts` (and `UIRenderer.ts` if needed). Remove the faint gray sector text. Use the existing function that draws the combat menu panels (beveled edges) to create two new panels at the bottom of the star map screen. One for "Sector: X" and one for the Sector Type. ALL information must be framed this way.
2. **Sector Tree (Task B):** Define a branching tree structure in `GameState.ts` for the 8 sectors. Generate it dynamically at the start of a run using templates from `data/sectors.json`.
3. **Sector Selection State (Task C):** Create the logic and rendering for the `SECTOR_MAP_SELECTION` state. When escaping the EXIT beacon, the player must view this tree, see the paths, and click a connected node to advance. Frame all UI elements (titles, tooltips) here with the beveled panel renderer.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the bottom UI panels are rendering correctly and the sector selection tree allows path-dependent progression, stage and commit all changes. 
Use the commit message: "feat: Sprint 54 complete - Sector Tree selection map and beveled UI panels for sector info".

Please begin by analyzing `MapSystem.ts`, `GameState.ts`, and your UI rendering engine to locate the beveled panel function. Let me know when the commit is successful!