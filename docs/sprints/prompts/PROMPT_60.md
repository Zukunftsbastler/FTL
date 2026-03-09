The JSON data for our first full narrative campaign, "The Quarantine Protocol", has been manually added. We now need to wire it into the engine so it actually plays!

Please read `docs/sprints/SPRINT_60_STORY_INTEGRATION.md`.

**Execution Rules:**
1. **Asset Loading (Task A):** Check `src/utils/AssetLoader.ts` (or your asset loading pipeline) and ensure the new story file `data/stories/story_quarantine.json` is fetched, parsed, and stored in the game's data registry.
2. **Initialization (Task B):** Find where a new run is initialized (likely `src/engine/GameState.ts` or the main game loop setup). Set the initial active story to `"story_quarantine"` so the Narrative Director activates it immediately.
3. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the story is wired up and loads successfully on game start, stage and commit the changes.
Use the commit message: "feat: Sprint 60 complete - Wired up 'The Quarantine Protocol' campaign to initialize on new runs".

Please begin by checking `AssetLoader.ts` and `GameState.ts`. Let me know when the commit is successful!