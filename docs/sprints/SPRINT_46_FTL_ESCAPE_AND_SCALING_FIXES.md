# SPRINT 46: FTL Escape Button & Authentic Hull Scaling

## 1. Sprint Objective
**To the AI Assistant:** We need to fix the FTL escape mechanics to match the original game precisely. This includes a prominent, always-visible FTL jump button during combat, and an exact recreation of the original charge time math (dependent on Engine power and Piloting). Secondly, enemy hull scaling needs to be strictly authentic to the original game (+1 HP per sector, rather than massive jumps).

## 2. Tasks

### A. Original FTL Charge Mechanics (`CombatSystem.ts`, `JumpSystem.ts` or `MovementSystem.ts`)
* **The Logic:** The FTL drive does NOT charge at a flat rate. It requires strict conditions based on the original game:
  1. **Piloting Check:** `ftlCharge` (0.0 to 1.0) ONLY increases if a crew member is in the 'PILOTING' room (or if the Piloting system level is >= 2 for autopilot).
  2. **Engine Power Scaling:** The base charge time is determined by the active power in the 'ENGINES' system. Use this exact mapping:
     - 1 Power: 68 seconds
     - 2 Power: 53 seconds
     - 3 Power: 44 seconds
     - 4 Power: 37 seconds
     - 5 Power: 32 seconds
     - 6 Power: 28 seconds
     - 7 Power: 25 seconds
     - 8 Power: 23 seconds
  3. **Manning Bonus:** If a crew member is manning the 'ENGINES' room, increase the charge rate by 10% (multiply the base time by ~0.9).

### B. FTL Escape UI & Transition (`JumpSystem.ts`)
* **The UI Update:** 1. The "FTL JUMP" button must be ALWAYS visible during combat.
  2. Draw a highly visible yellow progress bar behind or inside the button representing `ship.ftlCharge`.
  3. The button must be disabled (unclickable/greyed out) until `ftlCharge >= 1.0`.
* **The Escape Transition:** When clicked with a full charge, escape the combat (e.g., call `onJump()` to transition to `STAR_MAP`). Do NOT call `destroyEnemyShip` when escaping.

### C. Authentic Hull Scaling (`EnemyScaler.ts`)
* **The Problem:** Enemy ships currently have too much health early on and scaling is incorrect. In the original game, a Rebel Fighter starts at 10 HP and scales to 17 HP by Sector 8. 
* **The Fix:** In `EnemyScaler.scaleEnemy`, do not hardcode a massive HP increase. Instead, take the template's base `maxHull` and simply add `sector - 1` to it. 
  * `template.maxHull = template.maxHull + (sector - 1)`
  * `template.currentHull = template.maxHull`

## 3. Success Criteria
* FTL drive only charges if Piloting is manned/active.
* FTL charge speed accurately reflects the 68s to 23s scale based on Engine power.
* A prominent FTL Jump button is visible during combat with a yellow charging bar.
* The player can click the button when fully charged to escape combat without destroying the enemy.
* Enemy hull points strictly scale by +1 per sector.
* No TypeScript errors.