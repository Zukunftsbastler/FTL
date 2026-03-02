# SPRINT 15: Narrative Events & Choices

## 1. Sprint Objective
**To the AI Assistant:** The game currently jumps directly from the Star Map into combat. To recreate the FTL experience, we need to introduce the narrative layer. The goal of this sprint is to implement the Event System. Jumping to a standard node will now transition the game to an `EVENT` state, displaying text and choices from a JSON file. These choices will dictate whether the player enters combat, receives free loot, or simply moves on.

## 2. Tasks

### A. Event Data (`data/events.json`)
* Create a `data/events.json` file conforming to the `EventTemplate` schema defined in `docs/api/DATA_SCHEMA.md`.
* Create at least 3 distinct events:
  1. **Safe Node:** Friendly dialogue, choice to just "Continue".
  2. **Free Loot (Distress Beacon):** Text describing a derelict ship. Choice A: "Scrap it" (grants a generic Reward).
  3. **Rebel Encounter:** Text describing a hostile ambush. Choice A: "Prepare to fight!" (triggers combat with `rebel_a`).

### B. Event State & UI (`src/engine/GameState.ts`, `src/game/systems/EventSystem.ts`)
* Add a new GameState: `State.EVENT`.
* Create `EventSystem.ts`. It should handle drawing the event screen and processing clicks.
* **UI Layout:** Draw a large modal (similar to the Victory screen). Draw the `event.text` at the top. Below it, draw a list of clickable buttons for each choice in `event.choices`.
* *Tip for Text Rendering:* Implement a simple text-wrapping utility in `Renderer.ts` if you haven't already, so long event descriptions don't flow off the screen.

### C. Choice Resolution Logic
When the player clicks an `EventChoice`, process its properties:
* If the choice has a `reward`: Apply the reward to the player (you can reuse logic from `VictorySystem` or `applyRewardAndJump`), show a brief summary of what was gained, and return to `STAR_MAP`.
* If the choice has `triggerCombatWithShipId`: Transition to `State.COMBAT` and use `ShipFactory` to spawn the specified enemy ship ID.
* If the choice has `nextEventId`: Immediately load and display that new event.
* If none of the above (a simple "Continue" button): Transition back to `State.STAR_MAP`.

### D. Map Integration (`src/game/systems/MapSystem.ts`)
* Load `events.json` via the `AssetLoader` in `main.ts`.
* Update the Star Map logic: When clicking a standard star node (not the STORE), pick a random event ID from the loaded events.
* Transition to `State.EVENT` and pass the selected event ID to the `EventSystem` to display.

## 3. Success Criteria
* Clicking a star node opens an Event modal instead of instantly starting combat.
* The modal correctly displays the narrative text and clickable choices.
* Choices that trigger combat successfully spawn the enemy and start the fight.
* Choices that grant rewards update the player's inventory correctly.
* Long event texts wrap correctly and stay within the UI box.
* No TypeScript errors.