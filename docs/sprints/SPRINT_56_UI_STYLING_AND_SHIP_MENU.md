# SPRINT 56: UI Styling Overhaul & Ship Menu Access

## 1. Sprint Objective
**To the AI Assistant:** The UI needs a stylistic overhaul to improve readability and sci-fi aesthetics. Beveled panels must have thick white borders and much larger bevel cuts. When panels contain grouped items (like Resources or Sector Info), the individual items must be backed by cyan rounded rectangles with high-contrast text. Furthermore, the Resource bar overflows in Combat, lacks consistency across views, and the Star Map is missing a "SHIP" button to access the equipment/upgrade screen.

## 2. Tasks

### A. Global Beveled Panel Styling (`UIRenderer.ts` / UI Rendering logic)
* **The Fix:** Locate the function responsible for drawing the beveled combat menu panels.
  1. **Border:** Change the border stroke color to solid white (`#FFFFFF`) and make it significantly thicker (e.g., `lineWidth = 3` or `4`).
  2. **Bevel Size:** Increase the pixel inset for the chamfered/beveled corners so they take up a much larger, highly noticeable portion of the corners (e.g., increase the offset from ~5px to ~20px).

### B. Grouped Item "Pill" Styling
* **The Fix:** Introduce a styling pattern for elements grouped inside a beveled panel (specifically the Resource Bar and the Sector Info panel).
  1. Inside the beveled frame, draw a cyan (`#00FFFF` or a fitting sci-fi cyan) rounded rectangle behind each distinct text entry (e.g., behind the Fuel counter, the Missiles counter, etc.).
  2. The text inside these cyan rectangles must be changed to a highly contrasting color (e.g., dark navy or black).

### C. Resource Bar Consistency & Overflow Fix (`MapSystem.ts`, `CombatSystem.ts`)
* **The Problem:** The Resource bar is currently too narrow, causing the "Scrap" value to overflow on the right side. It is also positioned inconsistently between map and combat views.
* **The Fix:**
  1. Dynamically calculate the width of the Resource panel based on its contents so it securely wraps all items (Fuel, Missiles, Drones, Scrap) and their new cyan backgrounds.
  2. Render the Resource panel at the exact same top-left coordinate `(x: 10, y: 10)` in BOTH the Star Map and Combat View.

### D. Ship Equipment Menu Button (`MapSystem.ts`, `GameState.ts`)
* **The Problem:** The player cannot access their ship equipment/upgrades from the Star Map.
* **The Fix:**
  1. Render a new prominent button labeled "SHIP" (or "EQUIPMENT") directly below the Resource panel on the Star Map (e.g., aligned left). Use the updated beveled panel style for it.
  2. Add interaction logic: Clicking this button must change the game state to open the existing Ship/Upgrade screen (e.g., transition to the `UPGRADE` state or equivalent screen where the player can install systems and assign power).

## 3. Success Criteria
* All beveled panels have thick white borders and prominent angled corners.
* The Resource Bar securely contains all elements without overflow.
* Resource and Sector items are drawn inside cyan rounded rectangles with dark text.
* The Resource Bar appears consistently at the absolute top-left on both the Map and Combat screens.
* A functional "SHIP" button appears below the Map resource bar, successfully opening the equipment screen.
* No TypeScript errors.