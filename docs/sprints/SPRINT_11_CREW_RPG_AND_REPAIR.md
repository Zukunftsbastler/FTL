# SPRINT 11: Crew RPG, Repair Mechanics & Weapon Accuracy

## 1. Sprint Objective
**To the AI Assistant:** We are pausing the escalation of enemy AI to add crucial depth to the player's ship. The goal of this sprint is to transform the Crew from simple green circles into distinct RPG entities with Races, Classes, Skills, and XP. We will also implement the ability for crew to repair damaged systems, man stations for buffs, and introduce accuracy/evasion math to projectiles so shots can miss.


## 2. Tasks

### A. Data Schema Updates (`docs/api/DATA_SCHEMA.md`)
* **Crew Schema:** Add `Race` (e.g., 'HUMAN', 'ENGI', 'MANTIS') and `Class` (e.g., 'ENGINEER', 'GUNNER', 'PILOT', 'SECURITY'). 
* **Skills:** Add a `Skills` object to crew containing: `piloting`, `engineering`, `gunnery`, `repair`, `combat`. (Values from 0 to 2, representing skill levels/XP).
* **Weapon Schema:** Update `WeaponTemplate` to include `accuracy` (0.0 to 1.0) and a flag `neverMisses` (boolean, true for Beam weapons).
* Update `data/ships.json` and `data/weapons.json` to reflect these new schemas. Make sure the 3 starting crew members have different races and classes.
* The initial loadout should be randomized based on a run-specific seed value. 

### B. RPG Stats & UI (`src/game/components/`, `src/game/systems/RenderSystem.ts`)
* **CrewComponent:** Update to store the new stats, race, class, and an `xp` object.
* **Visual Identity:** Render crew differently based on Race/Class (e.g., Humans are blue circles, Engi are grey squares, Mantis are green triangles). Add a small initial/icon for their class.
* **Crew Tooltip/UI:** When a crew member is selected (Left Click), draw a detailed "Skill Sheet" UI panel on the left side of the screen (below the resource dashboard) showing their Name, Race, Class, Health bar, and their Skill levels.

### C. System Repair & Medbay (`src/game/systems/RepairSystem.ts`)
* **System Damage:** (Preparation) Systems need a way to track physical damage. Update `SystemComponent` to have `damageAmount`.
* **Repairing:** If a crew member is in a room with a damaged system, they automatically reduce `damageAmount` over time.
* **Skill Influence:** The speed of repair is multiplied by their `repair` skill and Race modifiers (e.g., Engi repair twice as fast). 
* **Medbay:** If a crew member is in the MEDBAY room and it is powered, they slowly regain `health`.

### D. Manning Stations (`src/game/systems/ManningSystem.ts`)
* If a crew member is standing in specific rooms (PILOTING, ENGINES, WEAPONS, SHIELDS) and the system is functional, they "man" the station.
* **Buffs:** Apply buffs based on their skills. 
  * *Gunnery* skill -> Increases weapon charge speed.
  * *Piloting/Engineering* -> Adds to a global `ShipComponent.evasion` stat.

### E. Accuracy & Evasion Math (`src/game/systems/ProjectileSystem.ts`)
* Before dealing damage, calculate a hit/miss chance: `Hit Chance = Weapon Accuracy - Target Ship Evasion`.
* If the weapon has `neverMisses: true`, bypass this check.
* If the shot **MISSES**: Do not apply damage. Render a "MISS" floating text over the target room. Allow the projectile line to visually fly *past* the enemy ship into the void (update targetX/Y to overshoot the canvas).
* Near Misses: Shots that hit the enemy target with a small chance may produce near misses, where the designated room is missed, but another one is hit instead. Doors can also be hin in this way. 

## 3. Success Criteria
* Crew members look visually distinct based on Race/Class.
* Selecting a crew member displays a detailed RPG stat sheet in the UI.
* Crew automatically heal in a powered Medbay.
* Crew automatically repair damaged systems (with speed scaling by their repair skill).
* Manning the weapons console makes weapons charge faster.
* Projectiles can now miss the target, displaying a "MISS" text and flying off-screen.
* Near Misses damage other rooms than intended.
* No TypeScript errors.