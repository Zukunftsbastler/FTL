# SPRINT 75: Dynamic Tutorial Anchors & UI Highlighting

## 1. Sprint Objective
**To the AI Assistant:** The user wants tutorial pop-ups to visually highlight and point to the specific UI elements they are explaining (e.g., the reactor, the weapons, the jump button). Because UI coordinates are dynamically calculated and may change, we will implement an "Immediate-Mode UI Anchor Registry". Systems will register their bounding boxes during the render loop, and the `TutorialSystem` will use these anchors to "punch a hole" in the dark overlay, draw a glowing highlight, and point an arrow to the element.

## 2. Tasks

### A. The UI Anchor Registry (`GameState.ts`)
* **The Fix:** Add a new global registry to the game state: 
  `uiAnchors: Record<string, { x: number, y: number, w: number, h: number }>`
* Ensure it initializes as an empty object `{}`.

### B. Registering Elements (`CombatSystem.ts` / `MapSystem.ts`)
* **The Fix:** Update the render loops to report their positions to the registry.
  1. In `CombatSystem` where the Reactor is drawn: `state.uiAnchors['reactor'] = { x, y, width, height }`.
  2. Where the Weapons are drawn: `state.uiAnchors['weapons'] = { x, y, width, height }`.
  3. Where the Systems (Shields, etc.) are drawn: `state.uiAnchors['systems'] = { x, y, width, height }`.
  4. In `MapSystem` for the Fleet indicator and the Jump button.

### C. Upgrading the Tutorial Director (`TutorialSystem.ts` & `UIRenderer.ts`)
* **The Fix:** 1. Update `showTutorial(id, text, type, targetAnchorId?)`. Store `targetAnchorId` in the tutorial state.
  2. Modify the rendering logic of the active tutorial:
     * Draw the standard dark semi-transparent overlay over the whole screen.
     * **If `targetAnchorId` exists in `state.uiAnchors`:**
       * **The Spotlight:** Set `ctx.globalCompositeOperation = 'destination-out'`. Fill a rectangle matching the anchor's `x, y, w, h` to make it completely transparent (punching a hole in the overlay so the UI element underneath is fully bright). Reset to `source-over`.
       * **The Highlight:** Draw a thick, glowing border (e.g., `#FFFF00`) around the anchor's bounding box.
       * **The Arrow:** Draw a line/arrow from the edge of the Tutorial Modal Box to the edge of the Anchor Box.

### D. Update Existing Triggers (`CombatSystem.ts`, etc.)
* **The Fix:** Update the tutorial triggers from Sprint 73 to pass the new anchor IDs.
  * e.g., `showTutorial("tut_power", "...", "INFO", "reactor")`
  * e.g., `showTutorial("tut_weapons", "...", "INFO", "weapons")`

## 3. Success Criteria
* The game state tracks UI element bounding boxes dynamically.
* When a tutorial with a target fires, the rest of the screen darkens but the targeted UI element remains brightly illuminated.
* A clear visual highlight and connecting line directs the player's eye from the text to the UI element.
* No TypeScript errors.