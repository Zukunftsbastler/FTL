We have manually added 9 new story campaigns to the data folders. We need to update our loading pipeline and initialization logic so the game randomly picks one of the 10 available stories for every new run, ensuring massive replayability.

Please read the details in `docs/sprints/SPRINT_61_FULL_CAMPAIGN_INTEGRATION.md`.

**Execution Rules:**
1. **Asset Loading (Task A):** Open `src/utils/AssetLoader.ts` (or wherever JSONs are loaded). Add the 9 new story files to the loading list alongside `story_quarantine.json`.
2. **Random Selection (Task B):** Open `src/engine/GameState.ts` (or the initialization function). Replace the hardcoded `"story_quarantine"` assignment with the random array selection logic provided in the sprint document.
3. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once all stories load correctly and the random selection works on game start, stage and commit the changes.
Use the commit message: "feat: Sprint 61 complete - Integrated all 10 narrative campaigns with random selection on new runs".

Please begin by checking `AssetLoader.ts` and `GameState.ts`. Let me know when the commit is successful!