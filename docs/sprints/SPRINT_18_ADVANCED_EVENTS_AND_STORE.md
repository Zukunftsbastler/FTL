# SPRINT 18: Advanced Events, Store Integration, and Meta-Progression

## Objective
Implement the engine logic required to support the new, complex event nodes added to `data/events.json`. This includes parsing conditional event choices (requirements), handling advanced rewards/penalties (crew death, system damage), tracking the Rebel Fleet's advancement, and stubbing out a Store state.

## Context
The `events.json` data has been expanded with choices that require specific systems, crew, or drones to be selected, as well as rewards that damage the ship, reveal the map, or trigger a "Store" UI. The current engine lacks the schema definitions and system logic to parse and execute these properties.

---

## Tasks for AI Agent (Claude Code)

### Task 1: Update Event Data Schemas
Update the TypeScript interfaces and documentation to recognize the new event properties.
1. **Modify `src/game/data/EventTemplate.ts` (Create if missing) & `docs/api/DATA_SCHEMA.md`:**
   - Add `openStore?: boolean;` to the `EventChoice` interface.
   - Add the following properties to the `EventReward` interface:
     - `loseCrewMember?: boolean;`
     - `revealMap?: boolean;`
     - `delayRebels?: number;`
     - `fleetAdvancement?: number;`
     - `systemDamage?: Record<string, number>;` (e.g., `{ "ENGINES": 1 }`)
     - `crewDamage?: number;`

### Task 2: Implement Fleet Tracking in GameState & JumpSystem
The Rebel Fleet is a core FTL mechanic that advances every jump.
1. **Update `src/engine/GameState.ts`:**
   - Add `public rebelFleetPosition: number = 0;`
   - Add `public rebelFleetAdvancementRate: number = 1;`
   - Add a new state to the Status enum/type: `STORE`.
2. **Update `src/game/systems/JumpSystem.ts`:**
   - When a successful jump occurs, increment `GameState.rebelFleetPosition` by `GameState.rebelFleetAdvancementRate`.

### Task 3: Enhance EventSystem Parsing and Application
Create or update `src/game/systems/EventSystem.ts` to process the new event rules.
1. **Requirement Checking Logic:**
   - Implement an `isChoiceAvailable(choice, playerShipEntity)` method.
   - Parse `choice.requirementId` (string format: `"type:value:level"`).
   - Support `"scrap:X"` -> Check `ShipComponent.resources.scrap >= X`.
   - Support `"system:TYPE:LEVEL"` -> Query ECS for `SystemComponent` matching `type` with `level >= LEVEL`.
   - Support `"drone:ID"` -> Check if player ship has the specified drone schematic.
   - Support `"crew:RACE"` -> Query ECS for `CrewComponent` with matching `race`.
2. **Advanced Reward Processing:**
   - Update the `applyReward(reward)` logic to handle the new keys.
   - `loseCrewMember`: Query all player `CrewComponent` entities, pick one randomly, and call `world.destroyEntity()`.
   - `crewDamage`: Query all player `CrewComponent` entities, pick one randomly, subtract `reward.crewDamage` from health. Destroy if <= 0.
   - `systemDamage`: Query player `SystemComponent` matching the dictionary key, decrement its capacity/health by the value.
   - `revealMap` / `delayRebels` / `fleetAdvancement`: Mutate the corresponding variables in `GameState`.
   - `openStore`: Set `GameState.status` to `'STORE'`.

### Task 4: Stub the Store System and UI
1. **Create `src/game/systems/StoreSystem.ts`:**
   - Create a basic system that listens for `GameState.status === 'STORE'`.
   - It should generate a dummy inventory (e.g., fuel, repairs, and a random weapon).
   - Expose a method to buy an item (deduct scrap, add to ship).
2. **Update UI / Render State (`src/main.ts` or UI logic):**
   - Ensure the game loop pauses combat and event updates when in the `STORE` state.
   - Provide a way to exit the store (revert state to `MAP` or `IDLE`).

---

## Acceptance Criteria
- [ ] TypeScript compiles successfully without interface errors.
- [ ] Complex requirements (e.g., `[Level 2 Medbay]`) correctly disable/enable event buttons based on the player ship's ECS components.
- [ ] Events with `"loseCrewMember": true` correctly destroy a player crew entity in the ECS.
- [ ] Jumping to a new node increments the Rebel Fleet position.
- [ ] Choosing an event with `"openStore": true` safely changes the game state without crashing.