# SPRINT 78: UNIFIED SHIP ICON RENDERING

## Objective
Unify the visual representation of ships across the Hangar, Star Map, and Sector Map. All non-combat views of the ship must consistently display both the ship's room layout and its hull outline, accurately reflecting the combat view representation.

## Context & Motivation
Currently, ship representations are fragmented (as seen in the mismatch between Hangar, Star Map, and Combat UI). The Star Map shows rooms but lacks an outline, while the Hangar uses a completely different style. To improve visual cohesion and reduce technical debt, we need a single, scalable rendering approach for ship icons across all UI systems.

## Key Results
1. **Refactored `ShipIconRenderer`**: The utility responsible for generating ship icons accurately draws both the hull outline and the internal rooms.
2. **Unified Map Representation**: The player indicator on the Star Map utilizes the updated renderer, displaying the outline alongside the rooms.
3. **Unified Hangar Representation**: The `HangarSystem` replaces its custom preview logic with the unified `ShipIconRenderer`.
4. **Unified Sector Map Representation**: Any ship icons in the `SectorMapSystem` use the new unified rendering logic.

## Technical Tasks
* **Analyze Outline Logic**: Review how the hull outline is generated for the main combat view (likely in `ShipGenerator.ts`, `RenderSystem.ts`, or a related graphics utility).
* **Update `ShipIconRenderer.ts`**: 
    * Adapt the outline generation logic to work for scaled-down icons.
    * Ensure the renderer draws the outline first (as a background/border), followed by the room grids.
* **Refactor `HangarSystem.ts`**: Replace the current ship drawing routine with a call to `ShipIconRenderer`.
* **Refactor `MapSystem.ts`**: Update the player position indicator to use the updated icon rendering.
* **Refactor `SectorMapSystem.ts`**: Ensure consistency in the sector map UI.
* **Scale and Positioning**: Ensure the generated icons scale cleanly and maintain their aspect ratio across the different UI contexts.