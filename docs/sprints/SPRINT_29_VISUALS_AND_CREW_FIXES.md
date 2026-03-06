# SPRINT 29: Visual Overhaul, Procedural Hulls & Movement Fixes

## 1. Sprint Objective
**To the AI Assistant:** Before implementing the visual overhaul, we must fix a hilarious bug where enemy crew "fly through space" to man stations on the player's ship. `MovementSystem` is incorrectly hardcoded to the player's ship coordinates. Once fixed, we will drastically improve the game's visuals by replacing the empty black background with parallax stars, drawing procedural "hulls" around the floating ship rooms, and structuring the UI into anchored, dark-transparent panels (Top Bar, Left Roster, Bottom Weapons) mirroring the classic FTL layout.

## 2. Tasks

### A. Movement & Selection System Overhaul (The "Flying Crew" Fix)
* **`MovementSystem.ts`:** Remove the hardcoded `shipX` and `shipY` from the constructor. Instead, for *each* crew member being updated, query their `OwnerComponent` to find their parent `Ship` entity. Then query the `PositionComponent` of that Ship entity to get the dynamic `shipX` and `shipY` origin for pixel conversion.
* **`SelectionSystem.ts`:** Only allow selecting a crew entity if its `FactionComponent` is `'PLAYER'`. Ensure the user cannot command enemy crew.
* **`RenderSystem.ts`:** Do not render crew members if their faction is `'ENEMY'` (until we implement the Sensors subsystem).

### B. Procedural Ship Hulls (`src/game/systems/RenderSystem.ts`)
* Currently, ships look like floating floor plans. We need to draw a solid hull behind the rooms.
* Before drawing a ship's rooms, calculate the bounding box (min X, max X, min Y, max Y) of all rooms belonging to that ship.
* Expand this bounding box by a padding of 15-20 pixels.
* Draw a solid, dark-grey (`#2c303a`), rounded rectangle using this padded bounding box to act as the ship's outer chassis/hull. Draw a slightly lighter border around it.

### C. UI Panel Anchoring (`src/engine/Renderer.ts` / `RenderSystem.ts`)
* Stop drawing UI text floating in the void. Create dedicated background panels using dark, semi-transparent rectangles (e.g., `rgba(20, 25, 35, 0.85)` with a 1px border).
* **The Top Bar (Resources):** Draw a horizontal panel spanning the top of the canvas (e.g., height 40px). Move HULL, FUEL, MISSILES, SCRAP, and ENEMY HULL into this neat bar.
* **The Left Pillar (Crew & Systems):** Draw a vertical panel on the left side (below the Top Bar). Move the Crew Roster (permanently displaying player crew names and HP bars) and the System Power UI into this pillar.
* **The Bottom Center (Weapons):** Draw a panel anchored to the bottom center strictly for the weapon UI boxes.

### D. Parallax Starfield Background (`src/game/systems/RenderSystem.ts`)
* Remove the `drawCenterDivider` line entirely.
* Create a simple starfield effect: Generate an array of 100-200 static stars (small white/grey rectangles or circles with varying opacities) initialized with random X/Y coordinates across the canvas.
* In the render loop (only during `COMBAT` and `EVENT` states), slowly move their X coordinates to the left (e.g., `speed = 10 * dt`). If a star moves off the left edge, wrap it back to the right edge. Render them *behind* the ships.

## 3. Success Criteria
* Enemy crew stay on their own ship because `MovementSystem` correctly resolves their parent ship's pixel coordinates.
* Enemy crew cannot be selected by the player.
* Ships have a dark grey chassis drawn behind their rooms.
* The UI is cleanly anchored into a Top Bar, Left Pillar, and Bottom Bar using semi-transparent dark panels.
* A parallax starfield scrolls slowly in the background during combat.
* No TypeScript errors.