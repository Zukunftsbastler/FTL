We are adding premium UI polish to our Tutorial System. We want the tutorial to visually point to and spotlight specific UI elements (like the reactor or weapons) without hardcoding coordinates, using a dynamic UI anchor registry.

Please carefully read the implementation steps in `docs/sprints/SPRINT_75_DYNAMIC_TUTORIAL_ANCHORS.md`.

**Execution Rules:**
1. **Registry (Task A):** Add `uiAnchors` to `GameState.ts`.
2. **Registration (Task B):** Open `CombatSystem.ts` and `MapSystem.ts`. During the render loops, right after you determine the position of key UI groups (Reactor, Systems, Weapons, Jump Button), write their `x, y, w, h` into the `uiAnchors` registry.
3. **Tutorial Spotlight (Task C):** Open `TutorialSystem.ts`. Update the signature to accept `targetAnchorId`. In the render block, if the anchor is found, use Canvas `globalCompositeOperation = 'destination-out'` to cut a hole in the dark overlay exactly over the anchor. Then draw a highlight border and a line connecting the tutorial modal to the anchor.
4. **Update Triggers (Task D):** Update the triggers we wrote in Sprint 73 to include these new anchor IDs.
5. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the dynamic highlighting, hole-punching, and pointing arrows are working, stage and commit the changes.
Use the commit message: "feat: Sprint 75 complete - Implemented dynamic UI anchors and tutorial spotlighting".

Please begin by updating `GameState.ts` and `TutorialSystem.ts`. Let me know when the commit is successful!