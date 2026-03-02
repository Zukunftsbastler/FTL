Sprint 14 was a masterpiece. The upgrade scaling and inventory management work flawlessly, and the UI is incredibly clean.

We are now moving to Sprint 15. Please read `docs/sprints/SPRINT_15_EVENTS_AND_NARRATIVE.md`.

In this sprint, we are injecting the story and decision-making aspect of the roguelike loop. The Star Map will no longer jump straight to combat, but instead route through the Event System.

**Execution Rules:**
1. **Text Wrapping:** Canvas 2D does not support automatic text wrapping. In Task B, you MUST write a small helper function in `Renderer.ts` (e.g., `drawTextWrapped(text, x, y, maxWidth, lineHeight)`) that splits the string by spaces and measures the width to create line breaks. Otherwise, the event text will run off the screen.
2. **Schema Compliance:** Ensure your `data/events.json` strictly follows the `EventTemplate` schema we defined way back in `DATA_SCHEMA.md`.
3. **Data Preloading:** Don't forget to update `main.ts` to `AssetLoader.loadJSON('events', 'data/events.json')` in the initial `Promise.all` block.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the Star Map successfully transitions to narrative events, text wraps correctly inside the UI, and choices properly route to Combat, Rewards, or back to the Map, please stage and commit all changes. Use the commit message: "feat: Sprint 15 complete - Narrative Event system, text wrapping, and choice resolution".

Please begin and let me know when the commit is successful!