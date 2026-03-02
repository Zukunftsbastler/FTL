Sprints 11 and 12 were beautifully executed. The tactical depth with the crew stats, manning buffs, and shield mechanics is incredible. We now have a fully functioning combat simulation.

We are moving to Sprint 13. Please read `docs/sprints/SPRINT_13_LOOT_XP_AND_VICTORY.md`.

This sprint handles the "Aftermath" of combat. We need to reward the player for winning, handle the Game Over state if they lose, and introduce the real-time XP system for the crew.

**Execution Rules:**
1. **Generic Rewards:** In Task A, the `RewardGenerator` should return a pure, typed `Reward` object. Do not couple the generation logic directly to the ECS. We want to be able to use this exact same generator later when we build text-based Narrative Events on the Star Map.
2. **Inventory Prep:** For the Weapon drops, just add a `cargoWeapons: string[]` array to the player's `ShipComponent`. If a weapon drops, push the ID string into that array. We will build a drag-and-drop equipment screen in a future sprint.
3. **Real-time XP:** Task C is vital for the RPG feel. Ensure that XP is granted exactly when the action happens (on projectile impact, or on successful repair tick).
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the Victory screen displays accurate randomized loot, clicking collect updates the HUD, and crew members successfully gain XP during combat actions, please stage and commit all changes. Use the commit message: "feat: Sprint 13 complete - Victory state, procedural loot generation, and Crew XP system".

Please begin and let me know when the commit is successful!