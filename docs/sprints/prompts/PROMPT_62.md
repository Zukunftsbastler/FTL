We are building the "Hangar" – our main menu and ship selection screen. This requires breaking up our current hardcoded startup sequence and creating a new pre-game UI state.

Please carefully review the architecture proposed in `docs/sprints/SPRINT_62_THE_HANGAR.md`.

**Execution Rules:**
1. **Data Flagging (Task A):** Open `data/ships.json`. Add `"isPlayerShip": true` to your main player ships. Make sure there are at least two player ships available so the selection logic can be tested.
2. **State & Boot (Task B):** Update `GameState.ts` and `main.ts`. The game must boot into a new `HANGAR` state. The logic that generates the first map, picks the random story campaign (from Sprint 61), and spawns the player ship must be wrapped in a function that is only called when the player clicks "Launch".
3. **Hangar UI (Task C):** Create `src/game/systems/HangarSystem.ts`. Implement the rendering for the ship list, ship details, and the Launch button using our established beveled UI components. Wire up the click events. Make sure this system is registered in your engine loop.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the Hangar completely works, correctly boots a new run with the chosen ship, and transitions to the Star Map without errors, stage and commit the changes.
Use the commit message: "feat: Sprint 62 complete - Implemented Hangar main menu and dynamic ship selection".

Please begin by checking `main.ts`, `GameState.ts`, and `data/ships.json`. Let me know when the commit is successful!