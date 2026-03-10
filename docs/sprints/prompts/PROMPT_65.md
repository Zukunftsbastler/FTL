We need to overhaul our Event Engine to support visual categorization (coloring event windows based on hostility) and dynamic map markers (allowing events to spawn future quests on the map).

Please carefully review the architecture in `docs/sprints/SPRINT_65_EVENT_TYPES_AND_MAP_MARKERS.md`.

**Execution Rules:**
1. **Schema Updates (Task A):** Open `src/game/data/EventTemplate.ts`. Add the `type` property to the template and the `addQuest` object to `EventChoice`.
2. **Visual Feedback (Task B):** Update `EventSystem.ts` and `UIRenderer.ts`. Apply contextual coloring (Red, Green, Cyan, White) to the event UI frame or header depending on the event's `type`.
3. **Quest State (Task C):** Update `GameState.ts` with `activeQuests`. When resolving a choice in `EventSystem.ts` with `addQuest`, find a node at the requested distance and push it to the state.
4. **Map Logic (Task D):** Open `MapSystem.ts`. Render the markers (QUEST/DISTRESS) above the targeted nodes. When the player clicks that node, override the default event with the quest event and clean up the state.
5. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the dynamic map markers are rendering correctly and the event windows change colors based on their type, stage and commit the changes.
Use the commit message: "feat: Sprint 65 complete - Added event categorization visuals and dynamic map quest markers".

Please begin by updating `EventTemplate.ts` and `GameState.ts`. Let me know when the commit is successful!