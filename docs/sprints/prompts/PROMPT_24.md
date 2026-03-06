The combat systems and interaction paradigms from the previous sprints are working perfectly. We are now drastically improving the roguelike progression mechanics by overhauling the Star Map topology.

Please read `docs/sprints/SPRINT_24_STAR_MAP_TOPOLOGY.md`.

**Execution Rules:**
1. **Line Intersection Math:** For Task A, you MUST implement a rigorous 2D line intersection check (e.g., using cross products / orientation testing). FTL maps are planar graphs; jump lines must never form an "X" by crossing each other.
2. **Path Guarantee:** Ensure the algorithm doesn't accidentally isolate the EXIT node. You might want to generate a main path from left to right first, and then build the planar web around it.
3. **Information Economy:** For Task B and C, the node's underlying event data must remain secret unless the strict visibility rules or the `long_range_scanners` augment expose them. Query the player's `ShipComponent` to check for active augments.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the map generates strictly planar graphs (no crossed lines), the Fog of War obscures distant nodes, and Long-Range Scanners correctly preview adjacent hazards, please stage and commit all changes. Use the commit message: "feat: Sprint 24 complete - Planar map topology, Fog of War, and Long-Range Scanners".

Please begin and let me know when the commit is successful!