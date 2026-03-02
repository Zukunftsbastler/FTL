# SPRINT 10: Game Feel, Projectiles, & UI Overhaul

## 1. Sprint Objective
**To the AI Assistant:** Mechanically, the combat works, but visually, it lacks "juice". Weapons deal instant mathematical damage without visual feedback, and the UI is scattered, making it hard for the player to read the game state. 
The goal of this sprint is to physically split the screen layout, create visible traveling projectiles (rays must be instant) for weapons, add impact visual effects, and centralize the core UI (Hull, Fuel, Reactor) to the top-left of the screen.

## 2. Tasks

### A. UI Layout Overhaul (`src/game/systems/RenderSystem.ts`)
* **Screen Split:** Draw a subtle vertical divider down the exact center of the screen to visually separate the Player's domain (left) from the Enemy's domain (right).
* **Player Dashboard (Top Left):** Move the `REACTOR` display, the `HULL` display, and a new `FUEL` display (start with 15) to a clean, fixed dashboard at the top-left corner of the screen. 
* **Enemy Dashboard (Top Right):** Move the `ENEMY HULL` display to the top-right corner, mirroring the player's layout.

### B. Projectile Components & ECS (`src/game/components/`, `src/game/systems/ProjectileSystem.ts`)
* Create `ProjectileComponent` (`_type = 'Projectile'`): `{ originX: number; originY: number; targetX: number; targetY: number; speed: number; damage: number; targetRoomEntity: Entity; isEnemyOrigin: boolean; }`
* Create a new `ProjectileSystem`. Each frame, it lerps projectiles from their origin to their target based on `speed` and `Time.deltaTime`.
* When a projectile reaches its target coordinates exactly, it applies the damage to the `targetRoomEntity` and the enemy hull, and then calls `world.destroyEntity(projectile)`.

### C. Update Combat Logic (`src/game/systems/CombatSystem.ts`)
* Currently, when a weapon fires, it deals instant damage.
* **Change:** When a weapon fires, it should now `world.createEntity()` and attach a `ProjectileComponent`.
* The `originX/Y` should be the center of the room the weapon belongs to (or the center of the ship if no specific room). The `targetX/Y` is the center of the `targetRoomEntity`. 
* Ensure the weapon resets its charge back to 0 immediately after spawning the projectile.

### D. Visual Feedback & Particles (`src/game/systems/RenderSystem.ts`)
* **Projectiles:** In `RenderSystem`, query for `['Projectile', 'Position']` and draw them as bright, short, thick lines (e.g., bright red for enemy lasers, bright blue for player lasers) oriented towards their target.
* **Impact Flashes:** Keep the white room flash you built in Sprint 8, but trigger it ONLY in the exact frame the projectile is destroyed upon reaching its target, not when the weapon fires.

## 3. Success Criteria
* The canvas has a clear visual divider in the center.
* Player resources (Hull, Reactor, Fuel) are cleanly grouped in the top left.
* Enemy hull is cleanly grouped in the top right.
* Firing a weapon spawns a visible projectile that travels across the screen.
* Damage is applied *only* when the projectile visually hits the target room.
* The targeted room flashes white upon impact.
* No TypeScript errors.