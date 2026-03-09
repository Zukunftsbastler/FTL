We need to overhaul our Store mechanics. Currently, the store is completely hardcoded inside the render loop of `UpgradeSystem.ts`. We need to move to a generated, persistent store inventory per map node.

Please read `docs/sprints/SPRINT_45_STORE_OVERHAUL.md` carefully.

**Execution Rules:**
1. **State & Generation (Task A & B):** Do not generate random items inside `drawStoreScreen`. Create a `StoreGenerator` that creates a `StoreInventory` object. Save this object in `GameState` when a store event is triggered.
2. **Context-Aware Filter (Task A):** When generating the `SYSTEMS` category in the store, query the ECS world to find the player's current systems. The store MUST NEVER offer a system the player already has installed.
3. **UI Refactor (Task C):** Rewrite `drawStoreScreen` in `UpgradeSystem.ts` to read from the new `GameState.currentStore`. Use a clean grid/card layout. Ensure purchased items are marked as "SOLD OUT" or removed from the list. If `scrap` is insufficient, disable the buy button.
4. **Installation (Task D):** Ensure that buying a system correctly finds an empty room, attaches the `SystemComponent`, and also attaches any necessary root components (like `CloakComponent` for cloaking).
5. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the store generation, UI layout, and system purchasing logic are fully implemented and working, please stage and commit all changes. 
Use the commit message: "feat: Sprint 45 complete - Persistent store generation, dynamic UI layout, and system purchasing".

Please begin by analyzing `UpgradeSystem.ts`, `EventSystem.ts`, and `GameState.ts`. Let me know when the commit is successful!