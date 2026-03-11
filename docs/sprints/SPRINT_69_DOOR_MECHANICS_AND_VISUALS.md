# SPRINT 69: FTL-Accurate Door Mechanics & Visuals

## 1. Sprint Objective
**To the AI Assistant:** The user is confused by the current door rendering (using red and gray colors which are inconsistent between inner and outer doors). Furthermore, friendly crew should not be blocked by closed doors. We need to implement the authentic FTL door paradigm: rendering doors geometrically (solid lines for closed, empty gaps with stubs for open) and ensuring pathfinding allows friendly crew to seamlessly walk through closed internal doors.

## 2. Tasks

### A. Geometric Door Rendering (`RenderSystem.ts` or `ShipRenderSystem`)
* **The Fix:** Completely remove the red/gray color-coding for doors based on their open/closed state.
* Implement structural rendering based on the door's orientation (horizontal/vertical) and state (`isOpen`).
* **If CLOSED (`!isOpen`):** Draw a solid, thick rectangle spanning the entire door gap. Use a clear, mechanical color (e.g., solid gray `#8899A6` with a darker border).
* **If OPEN (`isOpen`):** Do not draw the center. Only draw two small "stubs" (e.g., 20% of the door's length) on either side of the gap, leaving the middle visually empty to clearly indicate air and crew can pass through.
* Outer doors (airlocks) must use the exact same visual logic as inner doors.

### B. Friendly Crew Pathfinding (`Pathfinder.ts` or `MovementSystem.ts`)
* **The Fix:** In original FTL, friendly crew walk through closed doors automatically (they open/close dynamically as the crew passes).
* Modify the pathfinding logic. When calculating a route for a crew member:
  * If the crew member belongs to the player (or matches the ship's faction), **treat all doors (open or closed) as walkable paths**. Closed doors should NOT block friendly pathfinding.
  * *(Optional for later/if applicable: Enemy crew should treat closed doors as obstacles with high movement penalties, but for this sprint, just ensure the player's crew is never blocked).*

### C. Door Interaction State (`SelectionSystem.ts` / `DoorSystem.ts`)
* **The Fix:** Ensure clicking a door permanently toggles its `isOpen` state (which is used for venting oxygen and stopping fires). The geometric rendering from Task A will immediately reflect this toggle.

## 3. Success Criteria
* Doors are no longer color-coded red/gray to indicate state.
* Closed doors appear as solid barricades.
* Open doors appear as physical gaps with retracted door panels.
* The player can click doors to toggle them open/closed.
* The player's crew can be ordered to walk into a room behind a closed door, and they will route through it without being blocked.
* No TypeScript errors.