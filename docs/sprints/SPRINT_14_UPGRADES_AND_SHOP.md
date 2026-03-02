# SPRINT 14: Upgrades, Inventory Management & The Shop

## 1. Sprint Objective
**To the AI Assistant:** The player can now earn Scrap and loot weapons, but they have no way to spend Scrap or equip those weapons. The goal of this sprint is to introduce a new `UPGRADE` screen (accessible from the Star Map) where the player can spend Scrap to upgrade System capacities and the Reactor, and equip/unequip weapons from their cargo. We will also add a `STORE` node to the Star Map.

## 2. Tasks

### A. Game State & Screen (`src/engine/GameState.ts`, `src/game/systems/UpgradeSystem.ts`)
* Add a new GameState: `State.UPGRADE`.
* On the `STAR_MAP` screen, draw an "UPGRADE SHIP" button in the corner. Clicking it transitions to `State.UPGRADE`.
* Create `UpgradeSystem.ts` and update `RenderSystem.ts` to draw the Upgrade UI.
  * The left side of the screen should list all installed Systems (Shields, Weapons, O2, etc.) and their current `maxCapacity`.
  * Next to each system, draw an "Upgrade (Cost: X)" button.
  * The cost should scale based on the current level (e.g., Level 1->2 costs 20 Scrap, 2->3 costs 35 Scrap).
  * Draw an "Upgrade Reactor" button (e.g., costs 30 Scrap).
  * Draw a "Done/Back" button to return to `STAR_MAP`.

### B. Upgrade Logic (`src/game/systems/UpgradeSystem.ts`)
* If the player clicks an "Upgrade" button AND has enough Scrap:
  * Deduct the Scrap from `ShipComponent.scrap`.
  * Increase the specific `SystemComponent.maxCapacity` by 1.
  * If the Reactor was upgraded, increase `ReactorComponent.totalPower` by 1 and immediately give +1 to `currentPower`.
* *Crucial Constraint:* A system's capacity cannot exceed 8.

### C. Inventory Management (Weapon Equipping)
* On the right side of the `UPGRADE` screen, list the ship's currently active weapons AND the contents of `ShipComponent.cargoWeapons` (the unequipped inventory).
* Allow the player to click a cargo weapon to move it to active weapons, and vice-versa.
* *Constraint:* The total number of active weapons cannot exceed a hard limit, linked to the ship type (e.g., 4 slots for Artemis). Display empty boxes for unused weapons slots. 

### D. The Store Node (`src/game/systems/MapSystem.ts`)
* Currently, the Star Map just spawns Combat encounters.
* Modify the Star Map generation: One of the star nodes should be labeled "STORE".
* Add a new GameState: `State.STORE`.
* Clicking the "STORE" node transitions to `State.STORE`.
* **Store UI:** Draw a simple interface where the player can buy:
  * Fuel (Cost: 3 Scrap)
  * Missiles (Cost: 6 Scrap)
  * Hull Repair (Cost: 2 Scrap per 1 HP)
* Draw a "Leave Store" button to return to `STAR_MAP`.

## 3. Success Criteria
* The player can access an Upgrade screen from the Star Map.
* The player can spend Scrap to permanently increase system capacities and reactor power.
* The player can swap weapons between their active slots and their cargo inventory.
* The Star Map generates a "Store" node.
* Visiting the Store allows the player to exchange Scrap for Hull repairs, Fuel, and Missiles.
* No TypeScript errors.