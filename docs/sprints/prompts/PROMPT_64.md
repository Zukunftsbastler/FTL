We need to unify our visual design. The Combat UI currently uses primitive rectangles, which clashes with the beautifully styled, beveled panels and cyan pills we recently added to the Star Map.

Please carefully review the requirements in `docs/sprints/SPRINT_64_COMBAT_UI_UNIFICATION.md`.

**Execution Rules:**
1. **New Button Style (Task A):** Open `src/engine/ui/UIRenderer.ts`. Add a `drawBeveledButton` function that perfectly mimics the FTL panel style (thick white borders, capped bevels). It must support an active/hover state that turns the background cyan with dark text.
2. **Combat Layout Overhaul (Task B, C, & D):** Open `src/game/systems/CombatSystem.ts`. Find the `renderCombatUI` logic. 
   - Wrap the weapons list in a `drawBeveledPanel`.
   - Render individual weapon slots using the new `drawBeveledButton` (pass `isActive` if the weapon is powered/selected).
   - Wrap the systems list (bottom left) in its own `drawBeveledPanel`.
   - Replace the "JUMP" and "AUTO-FIRE" buttons with the new beveled button function.
3. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the combat UI is completely restyled and matches the modular, beveled FTL aesthetic of the star map, stage and commit the changes.
Use the commit message: "style: Sprint 64 complete - Unified Combat UI with FTL beveled panels and cyan buttons".

Please begin by analyzing `UIRenderer.ts` and `CombatSystem.ts`. Let me know when the commit is successful!