# SPRINT 19: Advanced Ship Systems and Combat Mechanics

## Objective
Implement the missing core FTL combat mechanics: Shields, Evasion, Cloaking, Teleportation, and Beam weapon logic. This will transition the combat from a simple "trading guaranteed hits" simulation into a fully fleshed-out tactical encounter.

## Context
The current engine handles basic projectile firing and room damage but ignores defensive layers and advanced weapon types. To utilize the expanded `weapons.json` and `ships.json` data, the ECS must be upgraded to support dynamic shield layers, evasion calculations, cloaking states, cross-ship crew boarding, and instant-hit beam weapons.

---

## Tasks for AI Agent (Claude Code)

### Task 1: Implement the Shields System
Shields block incoming laser/ion projectiles but allow missiles to pierce.
1. **Create `src/game/components/ShieldComponent.ts`:**
   - Properties: `maxLayers: number`, `activeLayers: number`, `rechargeProgress: number`.
2. **Create `src/game/systems/ShieldSystem.ts`:**
   - Query for ships with a `SystemComponent` of type `SHIELDS`.
   - Calculate `maxLayers` based on the system's current power level (e.g., 2 power = 1 layer, 4 power = 2 layers).
   - Increase `rechargeProgress` over time using `Time.deltaTime`. When full, increment `activeLayers` and reset progress.
3. **Modify `src/game/systems/ProjectileSystem.ts`:**
   - Before a projectile applies impact to a room, check the target ship's `ShieldComponent`.
   - If `activeLayers > 0`:
     - `MISSILE`: Bypass shield entirely.
     - `LASER`: Destroy projectile, apply 0 damage to hull/room, decrement `activeLayers` by 1.
     - `ION`: Destroy projectile, decrement `activeLayers` by 1, and apply ion damage to the SHIELDS system itself.

### Task 2: Implement Evasion (Engines & Piloting)
Projectiles should have a chance to miss based on ship evasion.
1. **Modify `src/game/components/ShipComponent.ts`:**
   - Add `evasionChance: number` (default 0).
2. **Create `src/game/systems/EvasionSystem.ts` (or add to `PowerSystem.ts`):**
   - Calculate `evasionChance` dynamically for each ship:
     - Check power allocated to `ENGINES`.
     - Check if `PILOTING` system is operational. If unmanned/level 1, evasion might be 0 unless upgraded or manned.
     - Apply crew bonuses if Piloting and Engines are manned.
3. **Modify `src/game/systems/ProjectileSystem.ts`:**
   - Upon projectile arrival at the target, roll `Math.random()`.
   - If `Math.random() < targetShip.evasionChance`, mark the projectile as "MISSED".
   - Missed projectiles should NOT apply damage and should continue moving past the ship (or be immediately destroyed with a "MISS" floating text).

### Task 3: Implement the Cloaking System
Cloaking grants massive evasion and pauses enemy weapon charging.
1. **Create `src/game/components/CloakComponent.ts`:**
   - Properties: `isActive: boolean`, `durationTimer: number`, `cooldownTimer: number`.
2. **Create `src/game/systems/CloakingSystem.ts`:**
   - Manage the activation, duration, and cooldown of the cloak.
   - When active, add `+0.60` (60%) to the ship's `evasionChance`.
   - When active, find all enemy `WeaponComponent` entities and freeze their `chargeTimer`.
3. **Modify `src/game/systems/RenderSystem.ts`:**
   - If a ship has an active `CloakComponent`, reduce the alpha transparency of its `SpriteComponent` and its rooms to `0.3` to visualize stealth.
4. **Modify `src/game/systems/CombatSystem.ts`:**
   - If a ship fires a weapon while cloaked, immediately terminate the cloak duration (unless a specific augment prevents this).

### Task 4: Implement Teleporter and Boarding
Crew must be able to move between the player ship and the enemy ship.
1. **Modify `src/game/systems/TargetingSystem.ts` / `SelectionSystem.ts`:**
   - Add a mode for the `TELEPORTER` system. When activated, allow the user to select friendly crew in the teleporter room, and then click a valid room on the *enemy* ship.
2. **Create `src/game/systems/TeleportSystem.ts`:**
   - Handle the teleport action: Check system power, initiate teleport, and start the system cooldown.
   - Modify the `PositionComponent` of the selected `CrewComponent` entities to swap their parent `ShipComponent` reference and place them into the target room's grid.
3. **Update `src/utils/Pathfinder.ts` (if necessary):**
   - Ensure the pathfinder only calculates paths within the crew member's *current* host ship grid, preventing bugs where crew try to walk across the vacuum of space.

### Task 5: Implement Beam Weapon Logic
Beams instantly draw a line across rooms and are mitigated by shields differently.
1. **Modify `src/game/systems/TargetingSystem.ts`:**
   - If the selected weapon is `BEAM` type, implement click-and-drag logic to create a line segment that intersects multiple rooms. Store this line geometry in the `WeaponComponent`.
2. **Modify `src/game/systems/CombatSystem.ts` & `ProjectileSystem.ts`:**
   - When a beam fires, do NOT spawn a slow-moving `ProjectileComponent`.
   - Instead, instantly calculate intersections with all enemy rooms along the line.
   - **Shield Mitigation:** Reduce the beam's `damage.hull` and `damage.system` by 1 for *every* active shield layer. (e.g., A 2-damage Halberd Beam against 1 shield layer deals 1 damage to every room it touches. Against 2 layers, it deals 0).

---

## Acceptance Criteria
- [ ] Laser projectiles correctly deplete shield layers and do no hull damage if shields are active.
- [ ] Missiles bypass shields entirely.
- [ ] Projectiles occasionally "MISS" based on power routed to ENGINES and PILOTING.
- [ ] Activating the CLOAKING system makes the ship semi-transparent and pauses enemy weapon charge bars.
- [ ] Players can teleport crew from a powered teleporter room to the enemy ship, and melee combat initiates if enemy crew are in that room.
- [ ] Beam weapons hit multiple rooms instantly and have their damage reduced linearly by shield layers.