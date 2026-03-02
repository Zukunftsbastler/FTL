# SPRINT 16: Advanced Event Logic (RNG & Requirements)

## 1. Sprint Objective
**To the AI Assistant:** We have populated `data/events.json` with 30 complex narrative events. However, our current `EventSystem` from Sprint 15 does not support random outcomes or requirement checking (e.g., checking if the player has an Engi crew member or enough scrap). The goal of this sprint is to upgrade the Event System to parse these new fields and fully support FTL-style event branching.

## 2. Tasks

### A. Schema Updates (`docs/api/DATA_SCHEMA.md` & `EventTemplate.ts`)
* Add `randomOutcomes?: { chance: number, nextEventId: string }[]` to the `EventChoice` interface.
* Update the code in `src/game/data/EventTemplate.ts` to match.

### B. Requirement Parsing (`src/game/systems/EventSystem.ts`)
* Before rendering an event choice button, check if it has a `requirementId`. If it does, parse it:
  * Format `crew:RACE` (e.g., `crew:ENGI`): Query player crew. Show button ONLY if a crew member has `race === 'ENGI'`.
  * Format `system:TYPE:LEVEL` (e.g., `system:MEDBAY:2`): Show button ONLY if player has that system at `maxCapacity >= LEVEL`.
  * Format `scrap:AMOUNT` (e.g., `scrap:25`): Show button ONLY if player `scrap >= AMOUNT`.
* *UI Note:* If the requirement is met, draw the button text in a special colour (e.g., blue) to indicate a special blue option! If not met, do not render the choice at all.

### C. Random Outcomes RNG
* When processing a clicked choice, if it has `randomOutcomes` instead of `nextEventId`:
  * Generate `Math.random()`.
  * Iterate through the `randomOutcomes` array, accumulating their `chance` values until you find the selected outcome.
  * Load the resulting `nextEventId`.

### D. Negative Rewards & Constraints (`src/main.ts` or `VictorySystem.ts`)
* Some events give negative scrap (e.g., paying a bribe) or negative hull repair (taking damage).
* Update `applyEventReward` logic:
  * Ensure `ship.scrap` never drops below 0.
  * Ensure `ship.currentHull` never exceeds `maxHull`.
  * If `hullRepair` is negative, subtract it. If hull reaches 0 during an event, transition to `GAME_OVER`.

### E. Hazard Display
* If the loaded `EventTemplate` has a `hazard` string (e.g., "SOLAR_FLARE"), draw a bright yellow/red warning banner at the very top of the Event UI modal (e.g., "WARNING: SOLAR FLARE DETECTED"). (We will implement the actual combat effects of hazards in a later sprint, just the UI for now).

## 3. Success Criteria
* Events with `randomOutcomes` correctly route to different results based on RNG.
* "Blue options" (requirements) only appear when the player actually possesses the correct crew, system level, or scrap.
* Negative rewards (bribes, trap damage) correctly deduct resources without causing negative scrap values.
* Taking lethal hull damage from an event traps triggers a Game Over.
* Hazard warnings display on the UI.
* No TypeScript errors.