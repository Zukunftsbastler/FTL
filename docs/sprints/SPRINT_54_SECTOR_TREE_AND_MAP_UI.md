# SPRINT 54: Sector Tree, Sector Selection, and Map UI

## 1. Sprint Objective
**To the AI Assistant:** The overarching Sector Map (where players choose the next sector after reaching the "EXIT" beacon) is completely missing. We need to implement a full Sector Tree graph that forces path-dependent choices. Furthermore, the Star Map UI lacks consistency and visibility for the current sector information. ALL informational elements across these maps MUST now be enclosed in the existing combat UI menu frames (beveled edges).

## 2. Tasks

### A. Sector Info UI Panels (`MapSystem.ts` or `UIRenderer.ts`)
* **The Problem:** The current sector level and type are just faint gray text hidden under the fuel indicator.
* **The Fix:**
  1. Remove the old faint text rendering for the sector.
  2. At the bottom edge of the Star Map screen, draw two distinct, prominent UI panels using the existing combat menu frame renderer (the functions that draw the UI boxes with beveled/angled corners).
  3. **Panel 1:** Display "Sector: {sectorLevel}".
  4. **Panel 2:** Display the current sector's name/type (e.g., "CIVILIAN SECTOR", "NEBULA").
  5. Ensure these panels have clear, contrasting text (e.g., white or light grey) and fit seamlessly into the layout.

### B. Sector Tree Generation (`GameState.ts` & `SectorGenerator.ts`)
* **The Problem:** The game currently has no path-dependent progression map from Sector 1 to 8.
* **The Fix:**
  1. Define a `SectorNode` interface (id, level, type/template, nextNodes[]).
  2. In `GameState`, add `sectorTree: SectorNode[]` and `currentSectorNode: SectorNode`.
  3. Create a generator that builds a directed acyclic graph (DAG) representing the 8 sectors. 
     * Level 1: 1 Node (Starting Sector)
     * Levels 2-7: 2 to 3 Nodes per column. Connect them so paths branch and merge. Randomize the sector types (Civilian, Hostile, Nebula, etc.) from `data/sectors.json`.
     * Level 8: 1 Node (The Last Stand).
  4. The difficulty scaling will inherently work via our existing `EnemyScaler` using the `level` of the node.

### C. Sector Selection Screen (`SectorMapSystem.ts` & `GameState.ts`)
* **The Feature:** Reaching the EXIT beacon and jumping must open the overarching Sector Tree.
* **The Fix:**
  1. Add a new game state `SECTOR_MAP_SELECTION`.
  2. When jumping from an EXIT beacon, transition to this state instead of instantly generating a new beacon map.
  3. **Rendering:** Draw the Sector Tree. Use lines to connect the nodes. Draw circles/icons for the sectors. Highlight the nodes the player can actually travel to (the direct children of the `currentSectorNode`).
  4. **UI Enclosures:** When hovering over a node, display its details (Sector Type description) inside a *beveled combat UI panel*. Also, put the title "SECTOR MAP" in a top panel.
  5. **Interaction:** Clicking a valid next node updates `GameState.currentSectorNode`, sets `GameState.sectorLevel` to that node's level, generates the new beacon map for that specific sector type, and transitions back to `STAR_MAP`.

## 3. Success Criteria
* Sector level and type are permanently visible at the bottom of the star map inside authentic beveled UI panels.
* A complete 8-level branching Sector Tree is generated per run.
* Reaching the EXIT beacon opens a dedicated Sector Map Selection screen.
* Players can only select sectors that are connected to their current sector node.
* All UI overlays and info text on these screens use the combat menu's beveled panel design.
* No TypeScript errors.