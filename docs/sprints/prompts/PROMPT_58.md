We are building a highly advanced, dynamic Narrative Director. Instead of placing story nodes randomly on the map where they might be missed, the Director will intercept the player's jumps and inject story events precisely based on pacing (e.g., the 2nd jump in a sector). We also need to drastically expand our event system to check for ship systems, crew, and resources (FTL's famous "Blue Options").

Please carefully review the architecture proposed in `docs/sprints/SPRINT_58_DYNAMIC_NARRATIVE_DIRECTOR.md`.

**Execution Rules:**
1. **Schema Expansion (Task A):** Update your event JSON schema and TypeScript interfaces to support `ChoiceRequirement` (system levels, crew races, resources, flags). In the UI renderer, ensure choices unlocked by systems or crew are colored blue.
2. **Story Triggers (Task B):** Define the `StoryBeat` and `TriggerCondition` schemas. This will dictate *when* a story event fires (by jump count or distance to exit).
3. **The Interceptor (Task C):** Update the jump logic (likely in `MapSystem.ts` or a new `NarrativeSystem`). When a player commits to jumping to a node, check the Narrative Director. If a pacing condition is met, dynamically overwrite that target node's `eventId` with the story event, ensuring the player sees it. Update `GameState` to track jumps made in the current sector.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the dynamic event injection and the complex contextual choice requirements (Blue options) are working perfectly, stage and commit the changes.
Use the commit message: "feat: Sprint 58 complete - Dynamic Narrative Director and context-aware blue event choices".

Please begin by analyzing `EventSystem.ts`, `MapSystem.ts`, and the Event schemas. Let me know when the commit is successful!