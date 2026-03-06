# SPRINT 28: Data Balancing, Crew Addition & System Damage

## 1. Sprint Objective
**To the AI Assistant:** The game is mathematically preventing enemies from attacking and repairing due to data configuration errors in the JSON and a hardcoded damage bug in the ECS. We need to fix the ship templates so enemies have enough weapon capacity and crew to repair systems, and fix the projectile system to deal correct system damage.

## 2. Tasks

### A. Fix Enemy Weapon Capacity (`data/ships.json`)
* Open `data/ships.json`.
* For `rebel_a` and `rebel_fighter`: Their `startingWeapons` includes `"burst_laser_1"`, which costs 2 power. 
* You MUST change their `WEAPONS` system `"level"` from 1 to 2.
* Ensure their `startingReactorPower` is at least equal to the sum of their SHIELDS, WEAPONS, and ENGINES levels (e.g., 2 + 2 + 1 = 5).

### B. Add Enemy Crew for Repairs (`data/ships.json`)
* Enemies currently cannot repair damaged shields because they have no crew.
* For `rebel_a`, `rebel_fighter`, and `slug_cruiser`, add at least one crew member to their `startingCrew` array.
* Format must match `kestrel_a`:
  `{ "name": "Guard", "race": "HUMAN", "crewClass": "ENGINEER", "skills": { "piloting": 0, "engineering": 0, "gunnery": 0, "repair": 1, "combat": 0 }, "roomId": 0 }`
* Place them in `roomId: 0` (which is typically the SHIELDS room).

### C. Fix Projectile System Damage (`src/game/systems/ProjectileSystem.ts`)
* In `applyImpact`, the physical damage currently hardcodes `-= 1` to `system.maxCapacity`.
* Change this to scale with the weapon's actual damage:
  ```typescript
  if (proj.damage > 0 && system !== undefined && system.maxCapacity > 0) {
    const sysDmg = Math.min(system.maxCapacity, proj.damage);
    system.maxCapacity -= sysDmg;
    system.damageAmount += proj.damage;
    if (system.currentPower > system.maxCapacity) {
      system.currentPower = system.maxCapacity;
    }
  }
  ```
  
###  3. Success Criteria
* Enemy ships spawn with WEAPONS level 2, allowing them to power and fire the Burst Laser.
* Enemy ships spawn with crew members who actively run to repair damaged systems.
* Weapons with >1 damage properly deal >1 damage to systems.
* No TypeScript errors.