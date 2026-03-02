Brilliant work on Sprint 5. The A* pathfinding and door logic are functioning perfectly. The codebase is incredibly clean.

We are now moving to Sprint 6. Please read `docs/sprints/SPRINT_06_POWER_AND_TESTING.md`.

This sprint represents a maturation of our workflow. We are implementing the core mechanical loop of FTL: Reactor Power Routing. Because this involves strict mathematical constraints, we are officially bootstrapping our testing framework.

**Execution Rules:**
1. **Testing First:** Execute Task A before touching any ECS code. Install `vitest`, write the pure logic tests in `tests/game/PowerMath.test.ts`, and make them pass. 
2. **README:** Generate a clean, professional `README.md` so the repository is fully documented.
3. **Power Routing:** Keep the UI simple (Task E). We don't need clickable UI buttons on the screen yet. Use keyboard + mouse hover (checking if `Input.getMousePosition()` intersects a room's grid bounds) to trigger the allocation/deallocation.
4. Ensure zero TypeScript errors (`tsc --noEmit`) and ensure all tests pass (`npm run test`).

**Version Control Instructions:**
Once the tests pass, the README is generated, and you can successfully allocate/deallocate power to systems visually on the canvas without breaking mathematical bounds, please stage and commit all changes. Use the commit message: "feat: Sprint 6 complete - Vitest setup, README, and Reactor Power Routing".

Please begin and let me know when the commit is successful!