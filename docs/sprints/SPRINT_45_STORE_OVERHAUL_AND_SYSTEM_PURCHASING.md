# SPRINT 45: Store Overhaul & Persistent Inventory Generation

## 1. Sprint Objective
**To the AI Assistant:** The current store in `UpgradeSystem.ts` is completely hardcoded inside the render loop (`drawStoreScreen`). We need to decouple store generation from rendering. We must create a persistent store inventory generated once per store encounter. The store needs a proper grid UI, must offer a random selection of contextual categories (Weapons, Systems, Crew, etc.), and must strictly filter out any systems the player already owns.

## 2. Tasks

### A. Persistent Store State & Generator (`StoreGenerator.ts` & `GameState.ts`)
* **The Problem:** `UpgradeSystem.ts` hardcodes items inside the frame-by-frame render loop.
* **The Fix:** 1. Define a `StoreInventory` interface (listing available resources, weapons, systems, crew, etc., with prices and quantities).
  2. Add `currentStore: StoreInventory | null` to `GameState.ts`.
  3. Create `StoreGenerator.generateStore(world, sectorLevel)`: 
     * Always add basic resources (Fuel, Hull, Missiles, Drone parts).
     * Randomly pick 2 additional categories (e.g., 'WEAPONS' and 'SYSTEMS').
     * **CRITICAL:** When generating the 'SYSTEMS' category, query the player's ship for existing `SystemComponent`s. ONLY add systems to the store that the player does *not* currently own.

### B. Event & State Hookup (`EventSystem.ts` or `MapSystem.ts`)
* Ensure that when an event triggers `choice.openStore === true`, we call `StoreGenerator.generateStore(...)` and save it to the GameState *before* transitioning to the STORE screen.
* When leaving the store node completely on the map, clear `currentStore`.

### C. Store UI Layout Refactor (`UpgradeSystem.ts` / `drawStoreScreen`)
* **The Refactor:** Remove the hardcoded `OFFERS` array. Read exclusively from `GameState.currentStore`.
* **The Layout:** Create a clear, block-based layout.
  * Left column/top row: Resources (fixed boxes).
  * Main area: Display the generated categories (e.g., a "WEAPONS" header with up to 3 weapon cards).
  * Item Cards: Show Name, Scrap cost, and hover tooltips. Render cost in red and disable the button if `scrap < price`.
* When an item is bought, deduct it from the `StoreInventory` so it disappears or shows "SOLD OUT".

### D. Dynamic System Installation
* Enhance the existing `findEmptyRoom()` logic in `drawStoreScreen`. When a system is purchased:
  1. Deduct scrap and remove from store inventory.
  2. Assign the system to the empty `RoomComponent`.
  3. Attach the `SystemComponent`.
  4. Ensure any auxiliary components (like `CloakComponent` for CLOAKING, or `DroneComponent` for DRONE_CONTROL) are properly attached to the ship root.

## 3. Success Criteria
* Store inventory is generated once per node and saved in GameState.
* `UpgradeSystem.ts` no longer contains hardcoded subsystem arrays; it reads the generated state.
* Systems the player already owns never appear in the store.
* Bought items are removed from the store's inventory.
* Buying a system installs it into an empty room correctly.
* No TypeScript errors.