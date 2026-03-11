# SPRINT 72: Tutorial Engine & Hazard UI Visuals

## 1. Sprint Objective
**To the AI Assistant:** We are building a dynamic, state-aware Tutorial System. Before writing the actual tutorial content, we need the technical foundation. We must update the `GameState` to track a user toggle (Tutorial On/Off) and seen tutorial flags. We also need to add a new rendering function for critical alerts: a beveled panel with a thick, diagonally striped black-and-yellow "hazard tape" border. Finally, we need a modal UI overlay that can pause the game and display these tutorial messages.

## 2. Tasks

### A. Tutorial State Management (`GameState.ts`)
* **The Fix:**
  1. Add `tutorialEnabled: boolean` (default `true`).
  2. Add `seenTutorials: Set<string>` (or `Record<string, boolean>`). This will track which specific tutorial pop-ups have already been shown in the current save/session so they don't repeat endlessly.

### B. Hazard Tape Panel Rendering (`UIRenderer.ts`)
* **The Fix:** Create a new function `drawHazardPanel(ctx, x, y, width, height, ...)` based on the existing `drawBeveledPanel` path.
  1. Instead of a solid white/colored stroke, the border must be rendered with a diagonal black and yellow striped pattern (like construction hazard tape).
  2. *Hint:* You can achieve this by creating a temporary `OffscreenCanvas` or `CanvasPattern` with diagonal yellow/black lines, or by drawing the thick path twice (once yellow, and then using a dash array for the black stripes, e.g., `ctx.setLineDash([15, 15])`).
  3. The inside should still be the standard translucent dark background.

### C. The Tutorial Director & Modal (`TutorialSystem.ts` & UI)
* **The Fix:** Create a new system or manager that handles displaying tutorials.
  1. It should have a method: `showTutorial(id: string, text: string, type: 'INFO' | 'WARNING' | 'CRITICAL')`.
  2. If `tutorialEnabled` is false or the `id` is in `seenTutorials`, ignore the call.
  3. Otherwise, set the game's internal time/update to PAUSED, add the `id` to `seenTutorials`, and render a large floating modal in the center of the screen.
  4. If `type === 'CRITICAL'`, use the new `drawHazardPanel`. If `WARNING`, use a red beveled panel. If `INFO`, use cyan/blue.
  5. The modal must include a large "UNDERSTOOD" (or "OK") button at the bottom. Clicking it closes the modal and unpauses the game.

### D. Hangar Toggle (`HangarSystem.ts`)
* **The Fix:** Add a checkbox or toggle button in the Hangar Menu to let experienced players turn `tutorialEnabled` on or off before launching a run.

## 3. Success Criteria
* A new `drawHazardPanel` function successfully renders a diagonal black/yellow striped border.
* The game tracks which tutorials have been seen.
* A central, dismissable modal can pop up, pausing the game while active.
* The Hangar includes a toggle for the tutorial.
* No TypeScript errors.