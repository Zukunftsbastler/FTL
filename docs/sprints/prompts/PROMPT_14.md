Sprint 13 was perfectly executed. The pure RewardGenerator and the real-time XP system add exactly the right roguelike RPG feel.

We are now moving to Sprint 14. Please read `docs/sprints/SPRINT_14_UPGRADES_AND_SHOP.md`.

Currently, the player is trapped in an endless loop where they earn Scrap but cannot spend it to increase their power. We need to implement the Upgrade economy.

**Execution Rules:**
1. **UI Pragmatism:** For Tasks A and C (the Upgrade Screen and Inventory), keep the UI interaction simple. Do not attempt complex drag-and-drop logic for weapons. Clicking a weapon in the "Cargo" list should simply move it to the "Equipped" list (if there is space), and vice versa. 
2. **Upgrade Scaling:** For Task B, you can use a simple scaling formula for system upgrade costs, e.g., `cost = currentLevel * 15`.
3. **Store Logic:** In Task D, the Store doesn't need to sell weapons or crew yet. Just getting the basic resource exchange (Scrap for Fuel/Hull/Missiles) working is enough to close the economic loop.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the Upgrade screen allows spending scrap on system/reactor capacity, weapons can be swapped, and the Store node allows purchasing basic resources, please stage and commit all changes. Use the commit message: "feat: Sprint 14 complete - Upgrade screen, weapon equipping, and Store node".

Please begin and let me know when the commit is successful!