# SPRINT 77: Comprehensive Ship Icons (Hull + Rooms) & Hangar Preview

## 1. Sprint Objective
**To the AI Assistant:** The user noted that the miniature ship icons on the maps are currently only drawing the rooms, completely missing the ship's outer hull silhouette. We need to upgrade the reusable `drawShipIcon` function to layer the full visual stack: first drawing the hull geometry, then drawing the rooms on top of it. Furthermore, we must use this exact same, high-quality rendering function to draw the selected ship preview in the Hangar.

## 2. Tasks

### A. Upgrade `drawShipIcon` (`UIRenderer.ts` or `RenderSystem.ts`)
* **The Fix:** Update the `drawShipIcon(ctx, template, x, y, scale)` function.
  1. **Layer 1 (The Hull):** First, parse and draw the ship's hull path (usually defined in `template.layout.hull` or similar). Fill it with a solid, dark, mechanical color (e.g., `#2A2A35`) and stroke it with a thick, lighter border (e.g., `#8899A6`).
  2. **Layer 2 (The Rooms):** Iterate over `template.rooms`. For each room, draw its rectangle (`room.x`, `room.y`, `room.width`, `room.height` - remember to account for grid size if your data uses grid coordinates). Fill the rooms with a slightly lighter/transparent color (e.g., `rgba(200, 220, 255, 0.1)`) and a sharp stroke so they stand out against the hull.
  3. Ensure all drawing inside this function happens within `ctx.save()`, `ctx.translate()`, `ctx.scale()`, and `ctx.restore()` so the scale parameter cleanly shrinks both the hull and the rooms.

### B. Hangar Ship Preview (`HangarSystem.ts`)
* **The Fix:**
  1. Locate the rendering block for the selected ship details.
  2. Instead of just listing text or rendering a basic box, invoke the upgraded `drawShipIcon` function in the center of the detail panel.
  3. Use a larger scale (e.g., `scale: 1.0` or `1.5`) so the ship acts as a beautiful visual centerpiece for the selected loadout.

### C. Map Icon Adjustments (`SectorMapSystem.ts` & `MapSystem.ts`)
* **The Fix:**
  1. Since the icon now includes the full hull and rooms, verify the scale used for the map markers. 
  2. Adjust the `scale` factor (e.g., down to `0.08` or `0.15`) so the comprehensive ship icon doesn't obscure too much of the map UI but remains highly recognizable.

## 3. Success Criteria
* `drawShipIcon` renders the full hull silhouette with the internal room layout superimposed.
* The Hangar prominently features this comprehensive rendering for the currently selected ship.
* The Star Map and Sector Map player markers use this same function at a miniature scale.
* No TypeScript errors.