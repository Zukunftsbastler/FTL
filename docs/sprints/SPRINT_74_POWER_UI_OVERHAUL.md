# SPRINT 74: FTL-Accurate Power & Systems UI Layout

## 1. Sprint Objective
**To the AI Assistant:** The user noted a severe UI/UX disconnect in our combat HUD. The reactor power, ship systems, and weapons are scattered. We need to implement the original FTL layout: The Main Reactor must be a vertical column at the far bottom-left. The Ship Systems (Shields, Engines, Oxygen, etc.) must be immediately to its right. We must draw visual connecting lines between the reactor and the systems to intuitively communicate power flow. Finally, the Weapons UI must be moved to the bottom-center, directly to the right of the other systems.

## 2. Tasks

### A. Main Reactor UI (Far Bottom-Left) (`CombatSystem.ts` or `UIRenderer.ts`)
* **The Fix:** Create a dedicated rendering function/block for the Reactor.
  1. Position it at the far bottom-left corner of the screen.
  2. Draw a `drawBeveledPanel` as the housing.
  3. Inside, render the reactor power as a **vertical column of pips/bars**. 
  4. Available power should be lit (e.g., bright green or cyan), while used power should be drawn as empty, dark outlines. 
  5. Just as before, damaged elements should be red until they are repaired. 

### B. Ship Systems & Connecting Lines (Bottom-Left, right of Reactor)
* **The Fix:** Reposition the ship systems array.
  1. Move the systems (Shields, Engines, Medbay, Oxygen, etc.) from their current position to sit immediately to the right of the new Reactor panel. Arrange them horizontally.
  2. **Visual Affordance:** Draw subtle structural lines (using `ctx.beginPath()`, `moveTo()`, `lineTo()`, `stroke()`) connecting the right edge of the Reactor panel to the left edge or top of the Systems panel. This visually implies "Power flows from here to here".
  3. Ensure the click zones (hitboxes) for assigning/removing power to these systems are updated to match their new coordinates.

### C. Weapons Array Relocation (Bottom-Center)
* **The Fix:** 1. Move the Weapons panel (and the Auto-Fire button) from the bottom-left to the **bottom-center** of the screen, directly right of the other systems.
  2. Ensure the click bounding boxes for selecting/powering weapons are correctly translated to this new center position.

## 3. Success Criteria
* The layout mirrors original FTL: Reactor (bottom-left) -> Systems (bottom-left, right of reactor) -> Weapons (bottom-center).
* The reactor is visualized as a vertical stack of power cells.
* Painted lines physically connect the reactor UI to the systems UI.
* Clicking to allocate power and clicking to select weapons works flawlessly in their new locations.
* No TypeScript errors.