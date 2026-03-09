# SPRINT 64: Combat UI Unification

## 1. Sprint Objective
**To the AI Assistant:** The user noted that the Combat UI looks visually disconnected from the Star Map UI. The Combat System currently renders primitive rectangles for weapon slots, drone slots, and buttons. We need to overhaul `CombatSystem.ts` to strictly use the new FTL-style UI paradigms established in `UIRenderer.ts` (thick-bordered beveled panels and cyan item pills).

## 2. Tasks

### A. Generic Beveled Buttons (`UIRenderer.ts`)
* **The Fix:** Create a reusable method `drawBeveledButton(ctx, x, y, width, height, text, isHovered, isActive)` in `UIRenderer.ts`.
  1. It should use the exact same angular path logic as `drawBeveledPanel` (with the capped corner cutouts and thick white border).
  2. If `isActive` or `isHovered` is true, fill the background with the cyan color (`#00FFFF`) and draw the text in dark navy/black.
  3. If false, fill with the standard dark transparent background and white text.

### B. Combat UI Layout - The Weapons Panel (`CombatSystem.ts`)
* **The Fix:** Group the player's weapon slots visually.
  1. Draw a large `drawBeveledPanel` at the bottom of the screen to house the weapons array (and auto-fire button).
  2. For each weapon slot inside this panel, use the new `UIRenderer.drawBeveledButton` or `drawCyanPill` style. 
  3. If a weapon is powered/selected, it must use the inverted cyan style (cyan background, dark text) to clearly indicate its active state.

### C. Unified Standalone Buttons (`CombatSystem.ts`)
* **The Fix:** Update the "JUMP", "AUTO-FIRE", and any other standalone combat buttons.
  1. Replace their current rendering logic with the new `drawBeveledButton` from Task A.
  2. Ensure the "JUMP" button matches the size and visual weight of the "SHIP" button from the Star Map.

### D. System & Power Bars (`CombatSystem.ts` / `UIRenderer.ts`)
* **The Fix:** Ensure that the player's systems list (Shields, Engines, Oxygen) on the bottom left is also enclosed within a `drawBeveledPanel` to separate it clearly from the space background, matching the modular "island" design from the Upgrade screen.

## 3. Success Criteria
* `CombatSystem.ts` no longer uses primitive `fillRect`/`strokeRect` for its primary UI elements.
* Weapons, Systems, and standalone buttons are enclosed in thick-bordered, beveled panels.
* Active/powered weapons and hovered buttons utilize the high-contrast cyan background with dark text.
* The visual aesthetic is 100% consistent between the Star Map and Combat views.
* No TypeScript errors.