# SPRINT 27: AI Power Starvation & Map Event Routing

## 1. Sprint Objective
**To the AI Assistant:** We have discovered critical logic flaws. Enemy ships are not firing because the auto-power sequence starves their Weapons system of reactor power. Second, jumping to a Combat node on the Map completely bypasses the narrative Event screen. Finally, hidden map nodes are visually indistinguishable from the background. We will fix these immediately.

## 2. Tasks

### A. Fix AI Power Starvation (`src/game/world/ShipFactory.ts`)
* Change the `POWER_PRIORITY` array to: `['OXYGEN', 'SHIELDS', 'WEAPONS', 'ENGINES', 'PILOTING']`. 
* By putting `WEAPONS` before `ENGINES` and `PILOTING`, enemy ships will always allocate power to their guns before boosting their evasion, ensuring they can actually shoot back.

### B. Fix Map Event Routing (`src/game/systems/MapSystem.ts`)
* In the `jump` method, the `switch (node.nodeType)` logic is flawed. It currently calls `callbacks.onCombat('rebel_a')` directly for `COMBAT` nodes, completely skipping the text event.
* **The Fix:** Change the `COMBAT` case. It should pick a random event ID from a hardcoded list of combat-triggering events (e.g., `['rebel_patrol', 'pirate_ambush', 'automated_rebel_scout', 'slug_surrender_trick']`) and pass it to `callbacks.onEvent(eventId)`. This ensures the player sees the narrative modal *before* the fight starts.

### C. Fix Hidden Node Visibility (`src/game/systems/MapSystem.ts`)
* Increase `NODE_HIDDEN_RADIUS` from `4` to `10`.
* Change `NODE_HIDDEN_FILL` from `#1a2030` to `#556677` (a much brighter, visible greyish-blue).
* Change `NODE_HIDDEN_BORDER` to `#778899`.
* This ensures players can actually see the entire star field layout from the start of the sector, even if the paths are hidden.

## 3. Success Criteria
* Enemies immediately power their weapons and fire at the player.
* Clicking a red [SHIP] node on the map opens an Event dialogue box instead of jumping straight to the combat screen.
* Hidden stars are clearly visible on the dark background.
* No TypeScript errors.