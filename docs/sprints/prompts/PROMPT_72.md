We are preparing the foundation for a dynamic tutorial system. This requires adding a highly visible "Hazard Tape" UI panel and a centralized modal director that pauses the game to deliver information.

Please read the architectural requirements in `docs/sprints/SPRINT_72_TORIAL_ENGINE_AND_VISUALS.md`.

**Execution Rules:**
1. **State & Toggle (Task A & D):** Add `tutorialEnabled` and `seenTutorials` to `GameState.ts`. Add a simple toggle button for the tutorial in `HangarSystem.ts`.
2. **Hazard UI (Task B):** Open `UIRenderer.ts`. Implement `drawHazardPanel`. You must creatively use canvas API features (like `createPattern` or `setLineDash` over a yellow stroke) to create a thick, diagonally striped black-and-yellow border following our beveled path geometry.
3. **Tutorial Director (Task C):** Create `TutorialSystem.ts` (or similar). Implement the `showTutorial` logic. When active, it must block background updates (pause the game), render the darkened overlay and the colored/hazard panel in the center with the provided text, and provide an "UNDERSTOOD" button to dismiss it.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the state tracking, the new hazard visual, and the modal logic are implemented, stage and commit the changes.
Use the commit message: "feat: Sprint 72 complete - Implemented Tutorial Director and black/yellow hazard UI rendering".

Please begin by checking `GameState.ts` and `UIRenderer.ts`. Let me know when the commit is successful!