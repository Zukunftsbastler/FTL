# SPRINT 11: Shields & Enemy AI

## 1. Sprint Objective
**To the AI Assistant:** The game looks great, but it's a shooting gallery. The enemy does not fight back, and neither ship has defenses. The goal of this sprint is to implement the Shield system (blocking projectiles) and a basic Enemy AI that powers its weapons and fires back at the player.

## 2. Tasks

### A. TDD: Shield Math (`tests/game/ShieldMath.test.ts`)
* FTL Shield Rule: 2 Power = 1 Shield Bubble (Layer). 4 Power = 2 Layers, etc. 1 or 3 Power yields no extra bubble.
* Create pure functions in `src/game/logic/ShieldMath.ts`:
  * `calculateMaxShields(allocatedPower)`: Returns `Math.floor(allocatedPower / 2)`.
  * `rechargeShields(currentShields, maxShields, isPowered, dt)`: If `currentShields < maxShields` and system is powered, slowly recharge (e.g., 1 bubble every 2 seconds). Return new shield level.
* Write unit tests for these calculations to ensure odd power numbers don't grant full bubbles.

### B. Shield System & ECS (`src/game/components/`, `src/game/systems/ShieldSystem.ts`)
* Create `ShieldComponent` (`_type = 'Shield'`): `{ currentLayers: number; maxLayers: number; rechargeProgress: number; }`
* Update `ShipFactory`: If a ship has a SHIELDS system, attach a `ShieldComponent` to the Ship entity (not the room, shields protect the whole ship).
* `ShieldSystem`: Each frame, read the power of the SHIELDS system, update `maxLayers` using our pure math, and recharge `currentLayers` if below max.

### C. Update Projectile Impacts (`src/game/systems/ProjectileSystem.ts`)
* Before a projectile applies damage to a room/hull, it must check if the target's Ship entity has a `ShieldComponent` with `currentLayers >= 1`.
* If YES:
  * Reduce `currentLayers` by 1.
  * Destroy the projectile immediately.
  * Apply NO damage to the room or hull.
* If NO: Apply damage as usual.

### D. Basic Enemy AI (`src/game/systems/EnemyAISystem.ts`)
* Create a simple `EnemyAISystem`.
* **Power:** Ensure the enemy ship auto-powers its SHIELDS and WEAPONS at spawn (similar to how the player auto-powers O2).
* **Targeting:** Iterate over all enemy weapons. If an enemy weapon is fully charged and lacks a `targetRoomEntity`, randomly select a room on the PLAYER's ship and assign it as the target. The `CombatSystem` will automatically fire it!

### E. Visual Feedback (`src/game/systems/RenderSystem.ts`)
* **Shield Bubbles:** Draw a large, light-blue, semi-transparent ellipse (`Renderer.drawEllipse` or similar) around the ships to represent active shield layers. If `currentLayers === 1`, draw one line. If `0`, draw nothing.
* **Shield Impact:** When a projectile hits a shield, trigger a quick visual flash on the shield bubble itself (e.g., make it brighter for 0.1s).

## 3. Success Criteria
* `npm run test` passes with Shield math logic.
* Ships spawn with a visible shield bubble if powered.
* The enemy ship automatically charges its weapons and fires projectiles at random player rooms.
* Projectiles (player and enemy) hitting a shielded ship deplete one shield layer instead of dealing hull damage.
* Shields recharge automatically over time if powered.
* No TypeScript errors.