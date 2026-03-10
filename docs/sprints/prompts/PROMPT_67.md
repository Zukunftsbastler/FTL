We need to polish our Event Engine. We have a timing issue with our intro events, a game-design flaw where critical nodes are being overwritten, and a visual bug where event colors aren't rendering.

Please carefully read the requirements in `docs/sprints/SPRINT_67_EVENT_POLISH_AND_PROTECTION.md`.

**Execution Rules:**
1. **Intro Timing (Task A):** Update your run initialization logic. After setting up the player ship and map, immediately push the game into the `EVENT` state and trigger the active story's `introEvent`.
2. **Node Protection (Task B):** Update the node selection logic in `MapSystem.ts` (or `NarrativeSystem`). Add strict conditions to prevent overwriting `STORE` nodes, the `EXIT` node, or nodes that are already marked as special.
3. **UI Colors (Task C):** Fix the rendering in `EventSystem.ts` and `UIRenderer.ts`. Ensure `drawBeveledPanel` can accept a custom border color, and pass the correct hex color based on the current event's `type` (Red for hostile, Green for friendly, Cyan for story/quest).
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the intro fires immediately, the map nodes are protected, and the event borders change colors, stage and commit the changes.
Use the commit message: "fix: Sprint 67 complete - Fixed intro event timing, protected critical map nodes, and enabled UI color coding".

Please begin by checking `HangarSystem.ts` (or run initialization), `MapSystem.ts`, and `UIRenderer.ts`. Let me know when the commit is successful!