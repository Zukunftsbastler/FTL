# SPRINT 40: Store Expansions, System Purchasing & Physics Fixes

## 1. Sprint Objective
**To the AI Assistant:** The user wants to strictly restrict Ship Upgrades to Store nodes (removing the free-floating upgrade button from the map). Furthermore, Stores should offer random, tier-scaled unowned Systems (like Cloaking, Drone Control) for purchase. We also need to fix three critical bugs: the background planet bleeding through the ship hull, crew ignoring damaged systems, and open exterior doors no longer draining oxygen.

## 2. Tasks

### A. Bugfix: The WebGL Bleed-Through (`src/game/systems/RenderSystem.ts`)
* **The Bug:** The WebGL procedural hull is transparent in the center, allowing the background planet to show through the rooms.
* **The Fix:** In `RenderSystem.ts`, right after drawing the `ship.hullSprite` and BEFORE drawing the rooms or cutaway mask, iterate over the ship's rooms and fill their coordinates with a solid `#000000` (alpha 1.0) rectangle. This blocks the background completely.

### B. Bugfix: Repair Logic Disconnect (`src/game/systems/RepairSystem.ts`)
* **The Bug:** Crew ignores broken systems.
* **The Fix:** Update `RepairSystem.ts`. The condition to repair a system MUST check `if (system.damageAmount > 0)`. When repairing, slowly decrease a repair timer. When the timer pops, `system.damageAmount -= 1` and `system.maxCapacity += 1`.
* **Visual:** In `RenderSystem.ts`, draw a visible red wrench or a red tint on the floor of a room if `system.damageAmount > 0` so the player sees it's broken.

### C. Bugfix: Exterior Door Vacuum (`src/game/logic/OxygenMath.ts` / `OxygenSystem.ts`)
* **The Bug:** Opening exterior airlocks no longer drains O2.
* **The Fix:** Ensure the logic checks `RoomComponent.hasBreach` OR if any connected `DoorComponent` has `(door.isExterior && door.isOpen)`. If either is true, that specific room's oxygen must rapidly drain toward 0, ignoring the ship's life support refill rate.

### D. Store Overhaul: Upgrades & Systems (`src/game/systems/EventSystem.ts`, `StoreSystem`)
* **Remove Map Button:** Remove the "Upgrade Ship" button from the Map UI.
* **The Store Menu:** Update the Store UI (rendered via AST/LayoutEngine). It should now have three distinct sections/buttons:
  1. **Buy Hull/Fuel/Missiles** (Existing logic)
  2. **Upgrade Ship:** A button that opens the existing `UpgradeSystem` UI.
  3. **Buy Subsystems:** A dynamically generated list of systems the player does NOT currently own (e.g., `CLOAKING`, `TELEPORT`, `DRONE_CTRL`).
* **System Purchasing Logic:** * Prices should be high (e.g., 150 Scrap).
  * Filter available systems based on `GameState.sectorNumber` (Tiers).
  * When purchased, push the new `{ type: 'CLOAKING', level: 1, maxCapacity: 1, currentPower: 0 }` object into the player's `ShipComponent.systems` array, and crucially, assign it to an empty `RoomComponent` on the player's ship.

## 3. Success Criteria
* The background planet is completely occluded by the ship's floor.
* Crew members actively repair systems with `damageAmount > 0`.
* Opening exterior doors aggressively vents oxygen into space, causing crew suffocation.
* The player can only upgrade their ship while at a Store.
* The player can purchase new sub-systems at the Store, which are dynamically placed into empty rooms.
* No TypeScript errors.