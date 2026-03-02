The execution of Sprint 6 was flawless. The README and test coverage are exactly what a professional project needs. 

We are now moving to Sprint 7. Please read `docs/sprints/SPRINT_07_OXYGEN_AND_VENTING.md`.

In this sprint, we are connecting Power, Rooms, Doors, and Crew through the ambient simulation of Oxygen. This introduces the concept of environmental hazards and venting.

**Execution Rules:**
1. **TDD First:** Just like Sprint 6, start with Task A. Write the pure mathematical functions for O2 generation, decay, and equalization across doors in `src/game/logic/OxygenMath.ts`, and test them in `tests/game/OxygenMath.test.ts`. Make the tests pass before touching the ECS.
2. **Door Hitboxes:** In Task B, doors are rendered as thin lines on the borders of rooms. Make sure the click detection hitbox for a door is generous enough (e.g., a 15-20 pixel radius around the door's center) so the player can actually click it easily.
3. **World state reference:** Remember that the 'SPACE' outside the ship acts as an infinite vacuum with 0% O2. If a door connects a room to SPACE and is open, that room's O2 should drop extremely fast.
4. Ensure zero TypeScript errors (`tsc --noEmit`) and ensure all tests pass (`npm run test`).

**Version Control Instructions:**
Once the tests pass, doors can be clicked to toggle open/closed, O2 levels render visually as a red overlay, and crew suffocate in vacuums, please stage and commit all changes. Use the commit message: "feat: Sprint 7 complete - O2 simulation, door toggling, and crew suffocation".

Please begin and let me know when the commit is successful!