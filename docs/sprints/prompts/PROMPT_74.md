We need to completely overhaul the spatial layout of our Combat UI to improve player intuition. We are adopting the original FTL layout: Reactor on the far bottom-left, Systems directly next to it, and Weapons in the bottom-center.

Please carefully read the layout requirements in `docs/sprints/SPRINT_74_POWER_UI_OVERHAUL.md`.

**Execution Rules:**
1. **Reactor (Task A):** Open `src/game/systems/CombatSystem.ts` (or wherever your HUD is drawn). Render the Reactor at the absolute bottom-left as a vertical column of power cells within a beveled panel.
2. **Systems & Lines (Task B):** Move the System UI (Shields, Engines, etc.) to the immediate right of the Reactor. Crucially, draw subtle canvas paths (lines) connecting the Reactor panel to the System panel to show energy flow. Update the click event coordinates for power allocation.
3. **Weapons (Task C):** Shift the Weapons panel to the bottom-center of the screen. Update the bounding box checks for weapon selection clicks!
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the HUD is completely reorganized, the connecting lines are visible, and all clicking/interaction still works accurately at the new coordinates, stage and commit the changes.
Use the commit message: "ui: Sprint 74 complete - Overhauled HUD layout to match FTL power flow design".

Please begin by updating the coordinate constants and render loops in `CombatSystem.ts`. Let me know when the commit is successful!