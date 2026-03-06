# SPRINT 43: Power Leak Fix & Projectile VFX Enforcement

## 1. Sprint Objective
**To the AI Assistant:** The user is experiencing a permanent loss of reactor power when systems take damage, and projectile visual effects were not implemented properly in Sprint 40. We must fix the "Power Leak" by refunding energy to the reactor when a system's `currentPower` is clipped by damage. Second, we must strictly extract projectile rendering into a dedicated `ProjectileRenderSystem` and implement true procedural VFX using `ctx.shadowBlur` (for lasers) and history-based fading paths (for missile trails).

## 2. Tasks

### A. The Power Leak Bug (`src/game/systems/ProjectileSystem.ts`)
* **The Bug:** When a projectile damages a system, its `maxCapacity` decreases. If `currentPower > maxCapacity`, the power is simply discarded.
* **The Fix:** In `ProjectileSystem` (and `HazardSystem` if fire causes damage), whenever you must reduce a system's `currentPower`, you MUST find the ship's `ReactorComponent` and refund the difference!
  ```typescript
  if (system.currentPower > system.maxCapacity) {
    const lostPower = system.currentPower - system.maxCapacity;
    system.currentPower = system.maxCapacity;
    // Find the ReactorComponent for this ship and add back the power!
    const reactor = world.getComponent<ReactorComponent>(shipEntity, 'Reactor');
    if (reactor) reactor.freePower += lostPower;
  }```

###  B. Projectile Component Expansion (src/game/components/ProjectileComponent.ts)

* Ensure the component properly tracks history. Add:
history: {x: number, y: number}[]
* Ensure it tracks the visual type: visualType: string (e.g., 'LASER', 'MISSILE', 'ION').
* In CombatSystem.ts, initialize history: [] and set the correct visualType from the WeaponTemplate when firing.
* In ProjectileSystem.ts, every frame, push the current x, y into history. If history.length > 8, shift() the oldest entry.

### C. The Projectile Render System (src/game/systems/ProjectileRenderSystem.ts)

* You MUST create this new file and move projectile rendering out of RenderSystem.ts.
* Inject it into the render loop in main.ts just before rendering explosions.
* **MISSILE (Trails):** Iterate through the history array. Draw a ctx.lineTo() path connecting the history points. Set ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)' and make the lineWidth scale down based on the history index (fading tail). Draw a small metal rectangle at the current position.
* **LASER (Neon Shader):** * Draw a white line from history[0] (or slightly behind current pos) to current pos.
    * Critical VFX: Set ctx.shadowBlur = 12 and ctx.shadowColor = faction === 'PLAYER' ? '#39ff14' : '#ff3333'. Then draw the stroke().
    * Reset ctx.shadowBlur = 0 immediately after!
* **ION (Plasma Pulse):**
    * Set ctx.shadowBlur = 15; ctx.shadowColor = '#00ffff';
    * Draw a white circle. Draw an outer cyan ring whose radius oscillates using Math.sin(Date.now() / 150).
    * Reset ctx.shadowBlur = 0.

## 3. Success Criteria
* When a system takes damage and loses a powered slot, the energy is successfully returned to the Reactor's free power.
* A new ProjectileRenderSystem exists and actively handles drawing.
* Lasers visibly glow using shadowBlur.
* Missiles leave a fading procedural line trail behind them.
* No TypeScript errors.