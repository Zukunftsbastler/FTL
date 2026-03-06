# SPRINT 25: Enemy AI Overhaul & Critical Bug Fixes

## 1. Sprint Objective
**To the AI Assistant:** Before adding new content, we must fix several critical bugs introduced by recent architecture changes (pacifist enemies, unconsumed ammo, and missing templates). After stabilizing the build, we will overhaul the `EnemyAISystem` and `CrewSystem` to match FTL's strict, deterministic priority logic for targeting and crew behavior.

## 2. Tasks

### A. Critical Bug Fixes
* **The "Pacifist Enemy" Bug:** In Sprint 22, we made it so weapons must explicitly draw from the `WEAPONS` system power pool. Update `EnemyAISystem.ts`: Ensure the AI actively sets `weapon.isPowered = true` for its weapons, draining its available power pool so it can actually charge and fire.
* **The "Undefined Template" Crash:** In `ShipFactory.ts`, add a strict guard clause at the start of `spawnShip`: `if (!template) throw new Error("Ship template not found: " + templateId);`. Furthermore, check `data/ships.json` and ensure that *any* ship ID referenced in `events.json` (like `pirate_fighter` or `mantis_scout`) actually exists. If not, copy the `rebel_a` data to create basic placeholders for them.
* **Missile Consumption:** Update the `CombatSystem` or `TargetingSystem`: When a player weapon of type `MISSILE` fires, it must deduct 1 from `ShipComponent.missiles`. If `missiles <= 0`, it cannot fire or target.

### B. Secondary Weapon Effects (Fires & Breaches)
* Update `ProjectileSystem.ts` and `RoomComponent.ts`.
* Rooms need to track hazards: `hasFire: boolean` and `hasBreach: boolean`.
* When a projectile hits a room, roll `Math.random()`. If it's less than the weapon's `fireChance`, set `hasFire = true`. If less than `breachChance`, set `hasBreach = true`. (We will handle the exact damage ticks of fire/breaches in a later step, just track the state and tint the room visually for now).

### C. Advanced Enemy Targeting AI (`src/game/systems/EnemyAISystem.ts`)
* **Weighted RNG Targeting:** Stop picking a completely random room. Build a priority list of player rooms:
  1. `SHIELDS` and `WEAPONS` rooms are High Priority.
  2. If player `OXYGEN` is < 50%, `OXYGEN` room becomes High Priority.
  3. Other rooms are Normal Priority.
* Roll a weighted random choice to select the `targetRoomEntity`.
* **Spread Fire Rule:** If an enemy fires a multi-projectile weapon (e.g., Burst Laser), it must NOT target the same room twice in a row. It must spread the shots across different rooms.
* **Cadence:** Do not synchronize weapons. Fire each weapon the exact frame it becomes fully charged.

### D. Enemy Crew AI Behavior
* Enemy crew currently do nothing or act like player crew. Create AI logic for them.
* **Priority 1 (Self-Preservation):** If an enemy crew's HP < 25%, their target destination becomes the Medbay (if it exists and is powered). They will abandon their current station.
* **Priority 2 (Manning):** Ensure enemy crew prioritize standing in `PILOTING` and `ENGINES` above all else if their HP is fine. If the pilot dies, another crew member must pathfind to the Piloting room immediately.
* **Priority 3 (Repair):** If Shields or Weapons have `damageAmount > 0`, idle crew should walk there to repair them.

## 3. Success Criteria
* Enemies successfully power their weapons and shoot back at the player.
* The game no longer crashes if an event triggers a missing ship ID (it fails gracefully or uses a placeholder).
* Firing missile weapons reduces the player's missile inventory.
* Enemy weapons target Shields/Weapons more often than empty rooms.
* Enemy crew dynamically run to Piloting if the cockpit is empty, or to the Medbay if dying.
* No TypeScript errors.