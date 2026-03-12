# SPRINT 44: Combat Pacing, Repair UI, and FTL Mechanics

## 1. Sprint Objective
**To the AI Assistant:** The user wants to improve combat pacing, fix repair visibility, audit hazard/repair mechanics, and implement missing core FTL features. Early game fights take too long, so enemy hull points need to scale with sectors. Player repairs lack UI feedback. We also need to introduce the "Crew Kill" victory condition and lay the groundwork for FTL jumping/escaping during combat.

## 2. Tasks

### A. Audit AI Repairs & Fire Spread (`HazardSystem.ts`, `RepairSystem.ts`, `EnemyAISystem.ts`)
* **Task:** Verify that enemy AI successfully targets damaged systems and that `RepairSystem` fully restores system functionality once `repairProgress` reaches its threshold.
* **Task:** Verify `HazardSystem` logic for fires. Ensure fires:
  1. Periodically deal damage to the room's system (if any) and the ship's global Hull.
  2. Spread to adjacent rooms if left unextinguished for too long.

### B. Repair Progress UI (`UIRenderer.ts` or equivalent System UI)
* **The Problem:** The user cannot see how long a repair will take on their own ship.
* **The Fix:** When rendering system icons or room overlays, if a system is damaged and a crew member is repairing it (or if there is an active `repairProgress` > 0), draw a small loading bar (e.g., a green horizontal rectangle over a dark background) at the bottom of the room or system icon to visually indicate the progress.

### C. Combat Pacing: Hull Scaling (`EnemyScaler.ts` / `ShipFactory.ts`)
* **The Problem:** Enemy ships have too much Hull early on, making fights tedious.
* **The Fix:** Set the base enemy Hull to a lower value (e.g., 8) in early sectors. Scale the `maxHull` and `currentHull` dynamically based on the current sector depth (e.g., `8 + (sectorLevel * 5)`).

### D. Crew Kill Victory Condition (`VictorySystem.ts` & `CombatSystem.ts`)
* **The Feature:** In FTL, killing the entire enemy crew instantly wins the battle.
* **The Fix:** In `VictorySystem` (or wherever combat end state is evaluated), add a check: if the enemy ship has 0 crew members left, trigger a victory. Provide slightly higher loot multipliers for a "Crew Kill" compared to a standard hull destruction.

### E. FTL Drive Charging & Escape (`ShipComponent.ts`, `JumpSystem.ts`)
* **The Feature:** Players and enemies need to be able to escape combat.
* **The Fix:** 1. Add `ftlCharge: number` (0 to 1) to `ShipComponent`.
  2. In `JumpSystem`, if the ship is in combat, increase `ftlCharge` over time based on the active power in the 'Engines' system and if 'Piloting' is functional/manned.
  3. UI: Add an FTL Charge bar to the top UI. When `ftlCharge >= 1`, enable the "JUMP" button to allow opening the map and escaping.

## 3. Success Criteria
* Enemy hull starts around 8 in Sector 1 and scales up.
* A visible progress bar appears on player systems during repairs.
* AI correctly repairs systems to 100%, and fires spread/damage the hull.
* Combat ends immediately in victory if the enemy crew is eliminated.
* Ships track an FTL charge during combat, and a UI element displays this charge.
* No TypeScript errors.