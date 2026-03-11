# Context
We are developing an FTL clone using an ECS architecture. All assets are generated programmatically using Canvas/WebGL, without external image files. 

# Current State & Problem
We have an inconsistency in how ships are rendered in the UI. 
- In combat, ships are rendered correctly with their hull outline and internal room layout.
- In the Star Map (`MapSystem.ts`), the ship icon shows the rooms but is missing the hull outline.
- In the Hangar (`HangarSystem.ts`), the ship representation is completely different.

# Goal
We need to unify the ship icons across the Hangar, Star Map, and Sector Map so they all look identical in style to the combat view (hull outline + rooms), just scaled appropriately for their UI context.

# Instructions
1. **Investigate Rendering Logic:** Look at `src/game/world/ShipIconRenderer.ts` and see how it currently generates icons. Also, check how the main combat view generates the ship's hull outline (this might be in `ShipGenerator.ts`, `RenderSystem.ts`, or `ShipComponent`).
2. **Update the Icon Renderer:** Modify `ShipIconRenderer.ts` (or the relevant utility) so that it dynamically generates an icon containing *both* the hull outline and the room layout. The outline should wrap the rooms identically to how it does in combat.
3. **Apply to Star Map:** Update `src/game/systems/MapSystem.ts` so the player indicator uses this new, complete icon (rooms + outline).
4. **Apply to Hangar:** Refactor `src/game/systems/HangarSystem.ts` to completely replace its current ship preview logic with the new unified `ShipIconRenderer` output.
5. **Apply to Sector Map:** Ensure `src/game/systems/SectorMapSystem.ts` also uses this unified rendering approach for any ship icons.
6. **Scaling:** Ensure the resulting graphic scales elegantly regardless of whether it's a small node on the Star Map or a large preview in the Hangar.

Please plan your approach, check the current implementations in the mentioned files, and then implement the unified rendering.