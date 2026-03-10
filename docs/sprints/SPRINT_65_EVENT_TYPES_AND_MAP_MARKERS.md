# SPRINT 65: Event Types & Dynamic Map Markers

## 1. Sprint Objective
**To the AI Assistant:** We are preparing the engine for complex, multi-stage narrative quests. We need to implement visual categories for events (Hostile, Friendly, Quest, etc.) so the player immediately recognizes the tone. Furthermore, we need a dynamic quest system where choices can place targeted "QUEST" or "DISTRESS" markers on future map nodes, overriding their default events.

## 2. Tasks

### A. Event Type Schema (`EventTemplate.ts`)
* **The Fix:** Expand the `EventTemplate` interface.
  1. Add an optional field: `type?: 'HOSTILE' | 'NEUTRAL' | 'FRIENDLY' | 'STORY' | 'DISTRESS' | 'QUEST'`.
  2. Expand `EventChoice` to support triggering future map markers. Add an optional field: 
     ```typescript
     addQuest?: { targetEventId: string, jumpsAway: number, markerType: 'QUEST' | 'DISTRESS' }
     ```

### B. Visual Event Categories (`EventSystem.ts` & `UIRenderer.ts`)
* **The Fix:** When rendering the main Event text panel, modify the UI based on the event's `type`.
  1. Add a colored header line or change the border color of the main event panel.
  2. **Colors:** - `HOSTILE` / `DISTRESS`: Red (`#FF4444`)
     - `FRIENDLY`: Green (`#44FF44`)
     - `STORY` / `QUEST`: Cyan/Blue (`#00FFFF` or `#4444FF`)
     - `NEUTRAL` / Undefined: Standard White/Gray.

### C. Dynamic Quest Engine (`GameState.ts` & `EventSystem.ts`)
* **The Fix:** Allow choices to spawn map markers.
  1. Add `activeQuests: { nodeId: string, eventId: string, markerType: 'QUEST' | 'DISTRESS' }[]` to `GameState`.
  2. In `EventSystem.resolveChoice`, if `addQuest` is present, calculate a target node. You must find a node that is roughly `jumpsAway` connections from the `currentSectorNode`. Add this mapping to `GameState.activeQuests`.

### D. Map Markers & Overrides (`MapSystem.ts`)
* **The Fix:** Render the markers and enforce the quest events.
  1. During the map render loop, check if any node ID exists in `GameState.activeQuests`.
  2. If it does, render a prominent text marker above that node (e.g., yellow "QUEST" or red "DISTRESS").
  3. Update the jump logic: When the player jumps to a node, check if it is in `activeQuests`. If yes, override the node's standard event with the quest's `eventId`, and then remove it from the `activeQuests` array.

## 3. Success Criteria
* Events can be categorized by type, which visibly alters the color scheme of the event window.
* An event choice can dynamically assign a new quest event to a specific future node on the map.
* The map renders "QUEST" or "DISTRESS" markers over these specific nodes.
* Jumping to a marked node successfully triggers the injected quest event.
* No TypeScript errors.