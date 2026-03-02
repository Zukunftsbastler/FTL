We have just expanded our `data/events.json` to include 30 complex events featuring RNG outcomes, skill checks, and hazards. 

Please read `docs/sprints/SPRINT_16_EVENT_LOGIC.md`.

In this sprint, we must upgrade the engine's EventSystem to parse these new mechanics.

**Execution Rules:**
1. **Schema Check:** First, make sure you update the TypeScript interface `EventChoice` in `EventTemplate.ts` to support the new `randomOutcomes` array.
2. **Requirement Parsing:** Task B is essentially writing a string parser. Split the `requirementId` string by `:` (e.g. `req.split(':')`) and check the player's ECS components to see if they pass. If they pass, color the text light blue `#66ccff`.
3. **Reward Math:** In Task D, ensure `scrap` and `hull` clamping is safe. 
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the Event UI properly hides/shows blue options based on ECS state, RNG choices work, and negative rewards process correctly, please stage and commit all changes. Use the commit message: "feat: Sprint 16 complete - Event RNG, requirements parsing, and hazard UI".

Please begin and let me know when the commit is successful!