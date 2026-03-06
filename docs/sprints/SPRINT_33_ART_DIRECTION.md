# SPRINT 33: Art Direction, Procedural Hulls & Backgrounds

## 1. Sprint Objective
**To the AI Assistant:** We have a robust UI layout engine, but the game currently looks too abstract. We need to introduce actual "Art Direction" using procedural Canvas drawing. The goals are:
1. Redesign the procedural ship hulls to look like aerodynamic sci-fi ships (Delta wings/nosecones) rather than rounded boxes.
2. Add atmospheric planetary bodies to the scrolling background.
3. Update the `CombatHUD` AST to include a dedicated "Enemy Target" UI window in the top right, mimicking FTL's layout.
4. Refine power bar rendering to look like segmented, glowing hardware slots.

## 2. Tasks

### A. Procedural Sci-Fi Hulls (`src/game/systems/RenderSystem.ts`)
* Modify the logic that draws the dark-grey background behind a ship's rooms.
* Calculate the bounding box of the rooms (`minX`, `maxX`, `minY`, `maxY`, `midY`).
* **Player Ship Hull (Facing Right):** Draw a geometric path using `ctx.lineTo()`. 
  * Draw a sweeping nose cone that extends 40px beyond `maxX` at `midY`.
  * Draw sweeping wings that extend 30px above `minY` and below `maxY` at the rear (`minX - 20`).
  * Fill with the existing dark grey, stroke with a lighter grey.
* **Enemy Ship Hull (Facing Left):** Mirror the logic. The nose cone points left (`minX - 40`), and the wings flare out at the right (`maxX + 20`).
* *Result:* The ships should look like angular spaceships (Delta-wing style) carrying the rectangular rooms on their backs.

### B. Planetary Backgrounds (`RenderSystem.ts`)
* In the background rendering (behind the stars), generate a procedural planet.
* Create a large circle (e.g., `radius: 300` to `500`) positioned randomly on the right side of the screen.
* Fill it with a radial gradient or linear gradient using sci-fi colors (e.g., rusty orange/red `rgba(200, 80, 40, 0.8)` fading into the black of space).
* Apply a very slow parallax scrolling effect to the planet (slower than the stars) so it slowly drifts left during combat.

### C. The Enemy Target Window (`RenderSystem.ts` AST)
* Update the `COMBAT_HUD` tree definition.
* **Current Top Bar:** It spans 100% width. 
* **New Layout:** Replace the single Top Bar with a `Row` containing:
  * A left `Panel` (Width: e.g., 400px or `auto`) for Player Resources (Hull, Scrap, Fuel).
  * A `Spacer` (`flexGrow: 1`) to create an empty gap in the top middle.
  * A right `Panel` (Width: e.g., 300px) acting as the "Enemy Target" window.
* Move the rendering of `ENEMY HULL: X/X` into this new right panel. 
* Because the Layout Engine is smart, the Safe Zone (`Spacer` in the middle of the screen) will naturally accommodate this new UI structure.

### D. Segmented Power Bars (`RenderSystem.ts` / `UIRenderer.ts`)
* When drawing the power capacities for systems, ensure they look like individual hardware slots.
* Draw a 2px gap between every capacity block.
* **Empty block:** Dark background (`#1a1d24`), with a subtle 1px border (`#4c5866`).
* **Powered block:** Bright neon fill (`#39ff14`).

## 3. Success Criteria
* Ships have distinct, angular sci-fi shapes (nosecones and wings) instead of simple rectangles.
* A large, gradient-filled planet scrolls slowly in the background.
* The Top UI is split into a Player Resource panel on the left and an Enemy Target panel on the right.
* Power bars look like distinctly separate, glowing battery segments.
* No TypeScript errors.