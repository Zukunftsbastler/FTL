The event system is working perfectly, but we need to refine the core mechanics to match the true FTL experience. The current star map is too disconnected, and the weapon power allocation is architecturally flawed. Furthermore, the blue debug cursor from Sprint 2 is breaking immersion and needs to go.

Please read `docs/sprints/SPRINT_17_MAP_AND_WEAPONS.md`.

**Execution Rules:**
1. **Kill the Cursor:** Task A is a quick cleanup. Delete the dummy cursor entity we made in Sprint 2.
2. **Weapon Power:** Task B requires careful state management. The WEAPONS room power acts as a battery. Individual weapons must be turned on to draw from that battery. If the room takes damage or power is removed, weapons must automatically turn off to respect the new power limit. 
3. **Map Generation:** For Task C, you can use a simple distance-based algorithm to connect nodes (e.g., connect nodes that are within X pixels of each other, ensuring there are no orphaned nodes and there is a valid path from left to right).
4. **Rebel Fleet:** In Task D, the Rebel Fleet is the ultimate timer. Make sure the red zone renders *behind* the star nodes but is clearly visible.
5. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the debug cursor is gone, weapon power is individually toggled, the map is a connected graph with fuel costs and visited states, and the Rebel Fleet advances every jump, please stage and commit all changes. Use the commit message: "feat: Sprint 17 complete - Map graph, Rebel Fleet timer, and Weapon power refactoring".

Please begin and let me know when the commit is successful!