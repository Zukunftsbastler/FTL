We need to fix the repetitive enemy encounters by introducing new ship templates, mapping them correctly to our events, and displaying the enemy ship's name during combat.

Please review the requirements in `docs/sprints/SPRINT_47_ENEMY_VARIETY_AND_COMBAT_UI.md`.

**Execution Rules:**
1. **Ship Variety (Task A):** Add templates for `pirate_interceptor`, `mantis_scout`, and `auto_assault` to `data/ships.json`. Keep their base `maxHull` values reasonable (around 8 to 10) so our new sector scaling doesn't make them bullet sponges.
2. **Event Mapping (Task B):** Edit `data/events.json`. Find all events that trigger combat and change the `triggerCombatWithShipId` to match the narrative (e.g., pirates spawn pirates, mantis spawn mantis).
3. **UI Update (Task C):** Update `ShipComponent.ts` to include a `name` property. Populate this property in `ShipFactory.ts` using the template's name. Finally, update the UI rendering logic (e.g., in `RenderSystem.ts` or your combat UI system) to draw this name prominently at the top center of the screen while in combat.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the new ships are added, events are correctly mapped, and the enemy name displays in the combat UI, stage and commit all changes. 
Use the commit message: "feat: Sprint 47 complete - Added new enemy templates, corrected event spawning, and implemented combat UI enemy name".

Please begin by analyzing `data/ships.json`, `data/events.json`, and `ShipFactory.ts`. Let me know when the commit is successful!