It is time to populate our Tutorial System with contextual triggers. We need the game to watch for specific events (like a fire breaking out, or the first combat starting) and throw the appropriate tutorial pop-ups.

Please carefully read the required triggers in `docs/sprints/SPRINT_73_TUTORIAL_TRIGGERS.md`.

**Execution Rules:**
1. **Map Triggers (Task A):** Inject the calls for `tut_pause`, `tut_fleet`, and `tut_power` when the Star Map is first initialized or rendered.
2. **Combat Triggers (Task B):** Open `CombatSystem.ts` and/or `TargetingSystem.ts`. Add triggers for combat start, weapon targeting, and enemy crew awareness. Emphasize that weapons require manual targeting.
3. **Hazard Triggers (Task C):** Open `HazardSystem.ts` or wherever damage and fires are processed. Add checks: if a room has fire, trigger `tut_fire`. If a room has a breach, trigger `tut_breach`. If a system takes damage, trigger `tut_damage`. Use 'CRITICAL' and 'WARNING' severity.
4. **Upgrade Triggers (Task D):** Ensure opening the upgrade screen warns the player about reactor power vs system power.
5. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once all triggers are placed in the appropriate systems and successfully display the modals upon encountering those situations, stage and commit the changes.
Use the commit message: "feat: Sprint 73 complete - Implemented contextual tutorial triggers for map, combat, hazards, and damage".

Please begin by injecting the Map and Combat triggers. Let me know when the commit is successful!