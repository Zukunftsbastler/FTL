# SPRINT 38: Advanced Hull Geometry & Engine VFX

## 1. Sprint Objective
**To the AI Assistant:** The procedural hulls generated in Sprint 37 wrap too tightly around the rooms (like shrink-wrap). We want aerodynamic, organic ships. We will achieve this by heavily modifying the 2D `roomMask` before it goes to the shader. By drawing large "Chassis" polygons (sweeping noses, wings, and engine nacelles) onto the mask in white, the GLSL shader will automatically texture them as part of the metallic hull. Additionally, we will add procedural engine glow FX to the GLSL shader.

## 2. Tasks

### A. Increase Padding & Canvas Size (`src/game/world/ShipGenerator.ts`)
* Increase `HULL_PAD` from `40` to `100`. We need this extra canvas space to draw wings and noses that extend far beyond the actual rooms.

### B. The Chassis Polygon (Mask Enhancement)
* In `generateShipSprite`, BEFORE drawing the room rectangles onto `maskCtx`, draw an underlying "Chassis" shape in white (`#ffffff`).
* **Math Setup:** You have `minX`, `maxX`, `minY`, `maxY`. Calculate `width`, `height`, and `midY`.
* **Player Shape (Facing Right):**
  * `ctx.beginPath()`
  * Rear Left/Top Wing: `moveTo(startX, startY - 40)`
  * Nose Cone: `lineTo(endX + 60, midY)`
  * Rear Right/Bottom Wing: `lineTo(startX, endY + 40)`
  * Engine block: `lineTo(startX - 20, midY)`
  * `ctx.fill()`
* **Enemy Shape (Facing Left):** Mirror this logic so the nose points left (`startX - 60`) and wings flare right.
* *Result:* The `roomMask` will now be a large, solid aerodynamic shape. The room rectangles drawn on top will ensure the playable area is completely covered, but the hull extends far into space.

### C. Engine Nacelles & Structural Details
* Add logic to draw engine blocks. For example, at the rear of the ship (`minX`), draw two thick horizontal lines or rounded rectangles (e.g., at `midY - 30` and `midY + 30`) extending backwards by 30px.
* Because they are drawn in white on the mask, the WebGL shader will automatically give them the metallic edge and noise paneling.

### D. GLSL Engine Glow (Fragment Shader)
* Update the WebGL fragment shader string in `ShipGenerator.ts`.
* After calculating the hull, add an "Engine Glow" pass.
* If a pixel is empty (transparent) but its UV coordinates are directly behind the ship's rear bounds, render a gradient glow.
* *Hint:* For the player ship, if `uv.x < rearBoundary`, use a smoothstep or sine function based on `uv.y` and `time` (or static if time isn't passed) to create two glowing exhaust plumes (e.g., bright cyan `vec4(0.0, 0.8, 1.0, 1.0)` fading to transparent).

## 3. Success Criteria
* Ships no longer look like shrink-wrapped rooms; they have massive aerodynamic silhouettes (noses, wings) that encompass the rooms.
* The dark "cutaway" effect in RenderSystem remains perfectly tied to the rooms, allowing the player to look "into" the center of the larger aerodynamic hull.
* Ships feature procedural engine blocks and glowing GLSL exhaust trails at the rear.
* No TypeScript errors.