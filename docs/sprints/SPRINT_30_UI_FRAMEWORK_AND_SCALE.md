# SPRINT 30: Sci-Fi UI Framework & Ship Scaling

## 1. Sprint Objective
**To the AI Assistant:** The current rendering uses basic rectangles, ships are drawn too small, and UI panels overlap the player's ship. We need to upgrade our visual presentation. The goal of this sprint is to create a dedicated `UIRenderer` utility that draws highly polished, parameterized "Sci-Fi" panels (with chamfered corners, borders, and gradients). We will also massively increase the `TILE_SIZE` and implement a dynamic "Safe Zone" so ships never overlap with the UI.

## 2. Tasks

### A. The UIRenderer Utility (`src/engine/ui/UIRenderer.ts`)
* Create a new folder `src/engine/ui/` and a new class `UIRenderer`.
* Implement a core method: `drawSciFiPanel(ctx: CanvasRenderingContext2D, x, y, width, height, options)`
* **Options interface:** `{ title?: string; chamfer?: number; alpha?: number; borderColor?: string; bgColor?: string; }`
* **Drawing Logic:**
  * Use `ctx.beginPath()`, `ctx.moveTo()`, and `ctx.lineTo()` to draw a rectangle where the corners (usually top-left and bottom-right) can be "cut off" diagonally by the `chamfer` amount (e.g., 10px).
  * Fill with a vertical linear gradient (e.g., from `rgba(30, 35, 45, alpha)` at the top to `rgba(15, 18, 25, alpha)` at the bottom).
  * Stroke with a 2px `borderColor` (default `#4c5866`).
  * If a `title` is provided, draw a solid header bar at the top of the panel and render the title text in bold, uppercase, light-grey letters.

### B. Global Scaling (`src/game/constants.ts`)
* Increase `TILE_SIZE` from 35 to `55` (or `60`) to drastically increase the visual footprint of the ships.
* *Note:* This will automatically scale the rooms and crew because our engine uses `x * TILE_SIZE`. Ensure doors and procedural hulls adapt correctly.

### C. Dynamic Safe Zones & Anti-Overlap (`src/game/systems/RenderSystem.ts`)
* Currently, `shipX` and `shipY` are hardcoded or poorly calculated.
* **Define UI Bounds:**
  * Top Bar Height: 50px
  * Left Pillar Width: 250px
  * Bottom Bar Height: 120px
* **Calculate Safe Zone:** The remaining empty space on the canvas is the "Safe Zone".
* **Ship Positioning:** * Position the player ship's center at exactly 25% of the Safe Zone's width, and vertically centered in the Safe Zone.
  * Position the enemy ship's center at 75% of the Safe Zone's width, vertically centered.
  * *Important:* Ensure the procedural hull drawing uses these new coordinates.

### D. Apply UIRenderer Across the Game
* Refactor `RenderSystem.ts`: Replace the crude rectangles for the Top Bar, Left Pillar, and Bottom Weapons with `UIRenderer.drawSciFiPanel`.
* Refactor `EventSystem.ts`: Draw the main event modal using a beautiful chamfered Sci-Fi panel.
* Refactor `UpgradeSystem.ts`: Draw the store and upgrade screens using the new panels.

## 3. Success Criteria
* `TILE_SIZE` is increased, making ships huge and detailed.
* Ships no longer clip under the UI panels; they are drawn squarely within the "Safe Zone".
* All UI elements (Combat HUD, Events, Upgrades) are rendered using `UIRenderer.drawSciFiPanel` featuring gradients, thick borders, and sci-fi angled corners.
* No TypeScript errors.