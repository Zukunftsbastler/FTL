# SPRINT 67: Event Polish, Intro Timing, and Node Protection

## 1. Sprint Objective
**To the AI Assistant:** The user reported three issues: 1) The story intro event doesn't trigger immediately upon launching a new run. 2) The Narrative Director and Quest systems are overwriting critical, player-visible map nodes (like Shops or visible Distress beacons), ruining player planning. 3) The visual color-coding for event types (Red/Green/Cyan) from Sprint 65 is not visible in the UI.

## 2. Tasks

### A. Immediate Intro Event (`GameState.ts` / `main.ts` / `HangarSystem.ts`)
* **The Fix:** When `startNewRun()` is executed and the player clicks "Launch", do not just transition to `STAR_MAP`. 
* Instead, immediately trigger the current story's intro event. 
* Set the state to `EVENT` and load the `currentStory.introEvent` so the player reads the narrative setup before seeing the map.

### B. Protect Critical Map Nodes (`MapSystem.ts` & `NarrativeSystem.ts`)
* **The Fix:** Prevent the quest/narrative engine from overwriting essential nodes.
* Locate the logic that finds target nodes for quests (e.g., `findNodeAtDistance`) and the logic that injects narrative beats.
* **Add a strict filter:** A node CANNOT be selected for a quest or story override if:
  1. Its original `eventId` is `'STORE'` (or it is marked as a shop).
  2. It is the `EXIT` node.
  3. It already has a visible marker (like a pre-existing DISTRESS beacon).
* If a target distance is requested but all nodes at that distance are protected, fall back to the nearest unprotected node.

### C. Fix Event UI Colors (`EventSystem.ts` & `UIRenderer.ts`)
* **The Fix:** The event windows are currently not displaying their type-based colors.
* Update `UIRenderer.drawBeveledPanel` to accept an optional `borderColor: string` parameter (defaulting to the current white/gray).
* In `EventSystem.ts`, when rendering the main event panel, check the `currentEvent.type`.
  * `HOSTILE` or `DISTRESS` -> pass `#FF4444`
  * `FRIENDLY` -> pass `#44FF44`
  * `STORY` or `QUEST` -> pass `#00FFFF`
* Pass this color into `drawBeveledPanel` so the thick border actually changes color.

## 3. Success Criteria
* Clicking "Launch" immediately opens the intro event window.
* Shops, Exits, and predefined Distress nodes are never overwritten by story beats or quests.
* The event UI panel visibly changes its border color based on the event `type`.
* No TypeScript errors.