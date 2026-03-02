The combat foundation in Sprint 8 is solid, but the playability is currently suffering. The player is suffocating before they can figure out the controls, and we are missing the core roguelike loop (Map -> Combat -> Map).

Please read `docs/sprints/SPRINT_09_GAME_STATE_AND_QOL.md`.

In this sprint, we are shifting focus from complex simulation to Quality of Life (QoL) and Game Flow. 

**Execution Rules:**
1. **Auto-Power:** Task A is critical. The player's ship must initialize with power automatically routed to O2. You can achieve this by calling your `allocatePower` function in the `ShipFactory` right after spawning the systems, if the reactor has enough juice.
2. **State Machine:** Keep the `STAR_MAP` state extremely simple for now. Just draw a few circles on the canvas representing stars. Clicking one triggers the transition to `COMBAT`. Don't build procedural generation for the map yet; just get the transition working.
3. **Memory Management:** In Task D, when returning to the Star Map, ensure you properly clean up the ECS. Destroy the ENEMY ship entity and all its associated rooms, systems, and crew so we don't leak memory or have ghosts in the next combat encounter. Do NOT destroy the PLAYER ship.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the game starts on a map screen, transitions to combat, auto-powers the oxygen, displays tooltips, and allows jumping back to the map after a victory, please stage and commit all changes. Use the commit message: "feat: Sprint 9 complete - Game states, auto-power QoL, and tooltips".

Please begin and let me know when the commit is successful!