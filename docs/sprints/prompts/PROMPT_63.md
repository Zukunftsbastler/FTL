We need to finalize our Hangar menu by introducing a systemic Difficulty Setting. The difficulty will scale elegantly by modifying starting resources, scrap economy, rebel pursuit speed, and our ECS Enemy Scaler.

Please carefully read `docs/sprints/SPRINT_63_DIFFICULTY_SETTINGS.md`.

**Execution Rules:**
1. **State & UI (Task A & B):** Define the `Difficulty` enum. Update `HangarSystem.ts` to render a difficulty selector. Visually indicate which mode is active.
2. **Resource Bootstrapping (Task C):** Update the `startNewRun` logic. Base the player's initial scrap, fuel, missiles, and drone parts strictly on the selected difficulty.
3. **Scaling Logic (Task D & E):** - Inject the difficulty multiplier into `RewardGenerator.ts` (Scrap yields).
   - Inject the multiplier into `MapSystem.ts` for the Rebel Fleet advance radius.
   - Update `EnemyScaler.ts` to apply a sector level offset (`-1` for Easy, `+1` for Hard) so the ECS assigns weaker/stronger systems dynamically.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the difficulty toggle is in the Hangar and all 4 scaling vectors (Resources, Rewards, Fleet, Enemies) are wired up, stage and commit the changes.
Use the commit message: "feat: Sprint 63 complete - Added Hangar difficulty selection and integrated systemic difficulty scaling".

Please begin by updating `GameState.ts` and `HangarSystem.ts`. Let me know when the commit is successful!