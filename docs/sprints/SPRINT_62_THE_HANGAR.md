# SPRINT 62: The Hangar (Main Menu)

## 1. Sprint Objective
**To the AI Assistant:** We need to implement the "Hangar", a pre-game main menu where the player selects their starting ship. Currently, the game forces an immediate start. We must introduce a new `HANGAR` GameState, create a UI system to browse player ships, and delay the run initialization (story selection, map generation, ship spawning) until the player clicks the "LAUNCH" button.

## 2. Tasks

### A. Ship Database Update (`data/ships.json`)
* **The Fix:** We need a way to filter player ships from enemy ships.
  1. Add a boolean flag `"isPlayerShip": true` to the templates the player is allowed to use (e.g., `"kestrel_cruiser"`, `"engi_cruiser"` or whatever the current default player ship is). 
  2. Ensure there are at least two distinct player ships in the JSON to test the selection UI.

### B. State Management (`GameState.ts` & `main.ts`)
* **The Fix:** 1. Add `HANGAR` to your GameState enums/types.
  2. Set `HANGAR` as the initial game state on boot.
  3. Move the run initialization logic (picking the random story from Sprint 61, generating Sector 1, spawning the player ship) *out* of the global startup script and into a dedicated `startNewRun(selectedShipId: string)` function within `GameState` or `GameEngine`.

### C. Hangar UI System (`HangarSystem.ts`)
* **The Fix:** Create a new system that only updates/renders when `state === HANGAR`.
  1. **Background:** Draw a dark, atmospheric background (or the procedural starfield without the map nodes).
  2. **Left Panel (Ship List):** Draw a beveled panel listing all templates from `ships.json` where `isPlayerShip === true`. Allow the player to click and highlight one.
  3. **Center/Right Panel (Ship Details):** Display the selected ship's stats (Max Hull, starting weapons, starting crew races).
  4. **Launch Button:** Draw a prominent, highlighted "LAUNCH" button.
  5. **Interaction:** Clicking "LAUNCH" triggers `startNewRun(selectedShipId)` and changes the state to `STAR_MAP`.

## 3. Success Criteria
* The game boots into the Hangar screen instead of directly into the map.
* A UI lists available player ships.
* Selecting a ship displays its stats.
* Clicking "LAUNCH" properly initializes a new run with the chosen ship, assigns a random story campaign, generates the map, and transitions to the Star Map.
* No TypeScript errors.