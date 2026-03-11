# SPRINT 76: Sector Map Polish & Player Ship Map Icons

## 1. Sprint Objective
**To the AI Assistant:** The user wants to polish the macro navigation. First, the `SectorMapSystem` must color-code its nodes based on `SectorType` (Hostile, Neutral, Nebula) and display a legend. Second, we must display a miniature icon of the player's current ship next to their current location on BOTH the Sector Map and the local Star Map. This icon MUST be rendered using the exact same procedural hull-drawing algorithm used in the Hangar/Combat, just scaled down.

## 2. Tasks

### A. Reusable Ship Outline Rendering (`UIRenderer.ts` or `RenderSystem.ts`)
* **The Fix:** Find the logic that parses a ship template's geometry/path (used for the Hangar or Combat hull outlines).
* Extract this into a globally accessible, reusable function: 
  `export function drawShipIcon(ctx: CanvasRenderingContext2D, template: ShipTemplate, x: number, y: number, scale: number, color: string)`
* Use `ctx.save()`, apply `ctx.translate(x, y)` and `ctx.scale(scale, scale)`, draw the hull path, and `ctx.restore()`.

### B. Sector Map Coloring & Legend (`SectorMapSystem.ts`)
* **The Fix:**
  1. Modify the node rendering. If a sector is `HOSTILE`, draw it Red (`#FF4444`). If `NEUTRAL` / Civilian, draw it Green (`#44FF44`). If `NEBULA`, draw it Purple (`#AA44FF`).
  2. Draw a Legend in an empty corner of the screen using `drawBeveledPanel`. List the three colors and their meanings: "Green: Civilian", "Red: Hostile", "Purple: Nebula".

### C. Sector Map Player Icon (`SectorMapSystem.ts`)
* **The Fix:** During the render loop, identify the node matching `GameState.currentSectorId`.
* Fetch the player's active ship template (e.g., from `data/ships.json` using `GameState.playerShipId`).
* Call `drawShipIcon` to render a tiny (e.g., `scale: 0.1` or `0.2`) version of the player's ship directly above or next to the current sector node.

### D. Star Map Player Icon (`MapSystem.ts`)
* **The Fix:** Similarly, in the local Star Map render loop, identify the node matching `GameState.currentSectorNode`.
* Call `drawShipIcon` to render the miniature ship hull next to this beacon, replacing or augmenting any simple circle/highlight currently used to denote the player's position.

## 3. Success Criteria
* Sector Map nodes are color-coded by type.
* A clear legend exists on the Sector Map.
* A scaled-down, geometrically accurate version of the player's specific ship is rendered at the current node on both the Sector Map and the Star Map.
* No duplicate hull-drawing logic; everything runs through one single source of truth for ship geometry.
* No TypeScript errors.