# SPRINT 34: Hazards, Crew Damage, Repair Loop & Particle FX

## 1. Sprint Objective
**To the AI Assistant:** The combat simulation is technically functional, but it lacks the chaotic consequences and visual feedback of FTL. The goals of this sprint are: 1) Introduce a Particle System for visual impact feedback, 2) Properly render damaged system power as red bars in the UI, 3) Implement Crew damage (from suffocation, fire, and direct projectile hits), and 4) Establish the complete Repair/Hazard loop (Fires spread, Breaches drain O2, Crew can repair them).

## 2. Tasks

### A. Particle System & Impact FX (`src/game/systems/ParticleSystem.ts`)
* Create a new component `ParticleComponent` `{ life, maxLife, vx, vy, color, size }`.
* Create a `ParticleSystem` that updates particle positions and reduces their life. Render them as fading squares/circles on the canvas.
* In `ProjectileSystem`, when a projectile hits a room (or shield), spawn 10-15 small particles (orange/yellow sparks) at the impact coordinates.
* *Bonus:* Render a floating "MISS" text if a projectile misses due to evasion.

### B. Hazard Logic & Crew Damage (`src/game/systems/HazardSystem.ts` & `CrewSystem.ts`)
* **Breaches:** In `OxygenMath.ts` / `OxygenSystem.ts`, if a room has `hasBreach === true`, forcefully drain its local oxygen level to 0 over a few seconds, completely overriding the ship's O2 refill rate for that specific room.
* **Fire:** If `hasFire === true`, slowly drain local oxygen (fire consumes O2). If oxygen hits 0, the fire extinguishes itself. Fire should have a random chance to spread to an adjacent room over time.
* **Crew Suffocation/Burning:** In `CrewSystem.ts`, iterate over all crew. Check the `RoomComponent` they are standing in.
  * If `room.oxygenLevel < 5` (Vacuum), deal `1` damage per second to the crew.
  * If `room.hasFire`, deal `1.5` damage per second.
* **Direct Hit:** In `ProjectileSystem.ts`, if a projectile hits a room, deal a portion of its damage (e.g., 15 HP) to all crew currently in that room.

### C. The Repair & Extinguish Loop (`src/game/systems/RepairSystem.ts`)
* Update `RepairSystem.ts` to handle the full priority list when a crew member is in a damaged/hazardous room:
  1. **Extinguish Fire:** If `hasFire`, tick down a hidden `fireHealth` variable based on crew's repair skill. Once 0, set `hasFire = false`.
  2. **Seal Breach:** If no fire but `hasBreach`, tick down `breachHealth`. Once 0, set `hasBreach = false`.
  3. **Repair System:** If no hazards, reduce the system's `damageAmount`. Once a damage point is fully repaired, restore 1 point of `maxCapacity` to the system.

### D. Visualizing Damage in the UI (`src/game/systems/RenderSystem.ts`)
* Update the power bar rendering in the Left Pillar (System Roster).
* A system has a `level` (absolute maximum), `maxCapacity` (current unbroken maximum), and `damageAmount` (`level - maxCapacity`).
* When drawing the power segments, draw them in this order:
  1. Filled active power (`currentPower`): Neon Green.
  2. Empty but working capacity (`maxCapacity - currentPower`): Dark grey.
  3. Damaged capacity (`damageAmount`): Bright Red (`#ff3333`).
* Draw visual indicators (a flame icon or red/blue tints) on the floor of rooms that have fire or breaches.

## 3. Success Criteria
* Projectile impacts generate a burst of particles.
* Damaged systems clearly display red blocks in the system UI.
* Rooms with breaches lose oxygen; crew inside them slowly lose HP.
* Crew automatically extinguish fires and repair breaches before repairing system damage.
* No TypeScript errors.