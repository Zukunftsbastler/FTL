# SPRINT 24: Advanced Star Map Topology & Fog of War

## 1. Sprint Objective
**To the AI Assistant:** The basic procedural map generation needs to be upgraded to match strict FTL rules. The goal of this sprint is to implement a mathematically rigid planar graph (no intersecting lines) for the beacon connections, and to introduce the "Information Economy" (Fog of War). The player should only see specific information based on proximity, global tags (Exit, Distress), and their installed augmentations (Long-Range Scanners).

## 2. Tasks

### A. Planar Graph Generation (`src/game/systems/MapSystem.ts` or `MapGenerator`)
* **Node Placement:** Scatter 15 to 24 nodes. Force the "START" node to the far left (e.g., `x = 50`) and the "EXIT" node to the far right (e.g., `x = canvas.width - 50`).
* **Connection Rules (Proximity & Intersection):**
  1. Define a `MAX_JUMP_RADIUS` (e.g., 200 pixels). 
  2. Attempt to connect nodes that are within this radius.
  3. **CRITICAL RULE:** Write a line-segment intersection function (`doIntersect(p1, q1, p2, q2)`). Before adding a connection between two nodes, verify that this new line does *not* cross any existing connection lines. If it intersects, discard the connection.
  4. Ensure there is at least one valid continuous path from START to EXIT (e.g., by building a minimum spanning tree first, then adding random non-intersecting edges).

### B. Fog of War / Visibility States (`src/engine/GameState.ts` & `MapSystem.ts`)
* Expand the map node data structure to include `visibility`: `'HIDDEN' | 'ADJACENT' | 'VISIBLE' | 'VISITED'`.
* **Rules for Visibility:**
  * START and EXIT nodes are always at least `VISIBLE`.
  * Nodes with "Distress" or "Quest" events are globally `VISIBLE`.
  * When the player arrives at a node, set its state to `VISITED`. Then, find all directly connected nodes and upgrade their state from `HIDDEN` to `ADJACENT`.
  * If an `ADJACENT` node contains a STORE, it automatically becomes `VISIBLE` and displays the "STORE" tag.

### C. Augmentation: Long-Range Scanners
* Read the player's `ShipComponent` to check if they have the `long_range_scanners` augment (introduced in Sprint 20).
* If they do, modify the rendering of `ADJACENT` nodes:
  * If the node's underlying event triggers combat, display a warning icon or text (e.g., `[SHIP DETECTED]`).
  * If the node's event has a `hazard` (Asteroids, Solar Flare), display a `[HAZARD]` warning.
  * If it is a safe/empty event, leave it blank.

### D. Map Rendering & Interactivity (`src/game/systems/UpgradeSystem.ts` or UI renderer)
* Render the jump paths (lines) *only* if at least one of the connected nodes is `VISITED` or `ADJACENT`.
* Only allow the player to click and travel to nodes that are `ADJACENT` to the `currentNode`.
* Apply a visual style difference between visited nodes (e.g., faint green circle) and unexplored adjacent nodes.

## 3. Success Criteria
* The map generates 15-24 nodes with a guaranteed path from left to right.
* Jump paths (lines) **never** cross or intersect each other.
* Fog of war hides the identity of nodes until they are adjacent.
* Stores reveal themselves when adjacent.
* The Long-Range Scanners augment correctly leaks information (Ship/Hazard) for adjacent nodes.
* No TypeScript errors.