# SPRINT 73: Tutorial Triggers & Contextual Help

## 1. Sprint Objective
**To the AI Assistant:** We have built the `TutorialSystem` and the hazard UI. Now we need to inject the actual `showTutorial` triggers across the game's systems. The tutorials must trigger contextually the first time a player encounters a specific situation (e.g., first combat, first fire, first damaged system). We will utilize the 'INFO', 'WARNING', and 'CRITICAL' (Hazard) visual styles.

## 2. Tasks

### A. Initialization & Map Triggers (`MapSystem.ts` or `GameState.ts`)
* **The Fix:** When the player enters the `STAR_MAP` for the first time:
  1. **Pause:** `showTutorial("tut_pause", "CRITICAL: Press SPACE to pause the game. You must pause frequently during combat and crises to issue orders!", "CRITICAL")`
  2. **Rebel Fleet:** `showTutorial("tut_fleet", "WARNING: The Rebel Fleet is pursuing you. The red circle on the map shows their advance. Do not get caught!", "WARNING")`
  3. **Power:** `showTutorial("tut_power", "INFO: Use the reactor (bottom left) to allocate power to your systems. Unpowered systems do not function.", "INFO")`

### B. Combat & Weapons Triggers (`CombatSystem.ts` & `TargetingSystem.ts`)
* **The Fix:** 1. **Combat Start:** When entering `COMBAT` state: 
     `showTutorial("tut_combat", "WARNING: Hostile ship detected! They will attack. Check your Shields and power your Weapons.", "WARNING")`
  2. **Weapon Targeting:** When the player clicks a weapon to power/select it:
     `showTutorial("tut_weapons", "INFO: Weapons must charge. Once fully charged, you MUST manually click on a specific enemy room to target and fire!", "INFO")`
  3. **Sensors/Enemy Crew:** When the player targets a room:
     `showTutorial("tut_sensors", "INFO: The enemy ship is manned by a crew. Upgrading your Sensors will allow you to see their movements and target them directly.", "INFO")`

### C. Hazards & Damage Triggers (`HazardSystem.ts` & `CombatSystem.ts`)
* **The Fix:** Inject checks during the update loop for hazards. If detected, fire the tutorial:
  1. **Fire:** If `room.fire > 0`: 
     `showTutorial("tut_fire", "CRITICAL: Fire detected! It will destroy systems and consume oxygen. Open airlocks and inner doors to vent the oxygen to space, or send crew to extinguish it!", "CRITICAL")`
  2. **Breach:** If `room.breach > 0`:
     `showTutorial("tut_breach", "CRITICAL: Hull Breach! A hole in your ship is venting oxygen into the void. Send crew to repair the breach immediately!", "CRITICAL")`
  3. **System Damage:** If `system.level < system.maxLevel` (or health is reduced):
     `showTutorial("tut_damage", "WARNING: System damaged! It operates at reduced capacity or is offline entirely. Select a crew member and right-click the room to repair it.", "WARNING")`

### D. Upgrades & Store Triggers (`UpgradeSystem.ts` or `StoreSystem.ts`)
* **The Fix:** When opening the Ship Upgrade menu:
  `showTutorial("tut_upgrades", "INFO: Buy system upgrades here using Scrap. NOTE: Upgrading a system does NOT provide the reactor power needed to run it. Upgrade your reactor separately!", "INFO")`

## 3. Success Criteria
* Starting a new run immediately displays the Pause, Fleet, and Power tutorials contextually.
* Entering combat explains the targeting sequence.
* A fire, breach, or system damage event instantly triggers a highly visible hazard/warning tutorial providing instructions.
* Tutorials only show once per run/save (handled by the system built in Sprint 72).
* No TypeScript errors.