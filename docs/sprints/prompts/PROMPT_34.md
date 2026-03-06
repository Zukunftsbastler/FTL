We are adding the critical "juice" and chaos to the combat simulation. Currently, damage is just abstract math. We need visible red damage bars, spreading fires, hull breaches that drain oxygen, crew suffocation, and a slick particle system for impacts.

Please read `docs/sprints/SPRINT_34_HAZARDS_REPAIR_AND_PARTICLES.md`.

**Execution Rules:**
1. **Red Damage Bars:** In Task D, this is crucial. If a system is Level 3, and takes 1 damage, it should draw 2 grey/green bars and 1 RED bar. The total drawn bars must always equal the system's absolute `level`, with `damageAmount` represented as red at the far right.
2. **O2 Drain:** In Task B, ensure that a hull breach completely overwhelms the O2 system for that specific room, pulling it to 0. 
3. **Crew Damage:** Add a basic health check. If a Crew entity's HP reaches 0, destroy the entity so they disappear from the UI and ship.
4. **Particle System:** Keep it lightweight. Just an array of entities with a position, velocity, and a lifespan that ticks down every frame. Draw them using standard Canvas `fillRect` or `arc`.
5. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the particle system works, hazards damage the crew, repairs prioritize fires/breaches, and damage is visualized as red UI bars, please stage and commit all changes. Use the commit message: "feat: Sprint 34 complete - Particle impacts, UI damage bars, hazards, and crew damage".

Please begin and let me know when the commit is successful!