# SPRINT 37: WebGL Procedural Ships & Cutaway Rendering

## 1. Sprint Objective
**To the AI Assistant:** We want to replace the basic polygonal ship hulls with highly detailed, procedural WebGL pixel-art hulls (synergizing with the WebGL infrastructure from Sprint 36, inspired by Deep-Fold). Crucially, the hull MUST perfectly enclose the existing ECS room grid without rooms poking out. We will achieve this by rendering the room footprint as a 2D mask, passing it to a GLSL shader to "extrude" a metallic hull outwards, and then rendering a "Cutaway" mask inside the rooms to make it look like the roof is sliced open.

## 2. Tasks

### A. The Room Footprint Mask (`src/game/world/ShipGenerator.ts`)
* Create a new utility class `ShipGenerator`.
* Method `generateShipSprite(rooms: RoomComponent[], faction: string): HTMLCanvasElement`
* Calculate the bounding box of the rooms. Add a large padding (e.g., 60px) to allow the hull to grow.
* Create a temporary 2D `<canvas>` of this padded size. Draw a solid white rectangle for every room on a black background. This is our `roomMask`.

### B. The WebGL Hull Shader (`ShipGenerator.ts`)
* Set up a WebGL pipeline inside `generateShipSprite` (you can reuse the boilerplate from `PlanetGenerator`).
* Upload the `roomMask` 2D canvas as a `sampler2D` texture to the WebGL context.
* **The GLSL Fragment Shader:**
  * Sample the mask texture. To "extrude" the hull, check neighboring pixels (a simple blur or distance field approach). If a pixel is near a white room pixel, it becomes part of the hull.
  * Modulate the extrusion distance based on UV coordinates to create a shape: For the player (facing right), push the extrusion further out on the right (X > 0.5) to form a nose, and flare the top/bottom left to form wings.
  * Apply procedural Simplex noise to create "hull paneling" (greebles) and color it with metallic palettes (e.g., Kestrel grey/orange, Rebel blue/orange).
  * Draw a bright edge highlight around the absolute border.

### C. Caching the Hull (`src/game/world/ShipFactory.ts`)
* When spawning a ship, call `ShipGenerator.generateShipSprite(rooms, template.faction)` and store the resulting Canvas element inside a new or existing component (e.g., `SpriteComponent` or `ShipComponent.hullSprite`).

### D. The Cutaway Render Logic (`src/game/systems/RenderSystem.ts`)
* Completely remove the old `ctx.lineTo()` procedural hull logic.
* **Layer 1 (The Hull):** Draw the cached WebGL hull sprite (`ship.hullSprite`).
* **Layer 2 (The Cutaway Mask):** Iterate through all rooms. Draw a black rectangle with `alpha: 0.85` for each room. Stroke it with a 3px dark grey line. This creates the "hole" in the hull.
* **Layer 3 (The Rooms):** The existing room rendering loop continues as normal, drawing the grid lines, systems, and crew *inside* that dark cutaway hole.

## 3. Success Criteria
* Ships have detailed, metallic, pixel-art hulls generated via WebGL shaders.
* No ECS rooms ever stick out into the black space; the hull perfectly wraps around the arbitrary room configurations.
* The rooms sit inside a dark "cutaway" mask, giving the illusion of looking through an open roof into the ship.
* No performance drops (rendering is cached once per ship spawn).
* No TypeScript errors.