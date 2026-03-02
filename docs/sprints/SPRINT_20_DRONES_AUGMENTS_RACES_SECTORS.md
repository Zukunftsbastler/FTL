# SPRINT 20: Drones, Augmentations, Crew Races, and Procedural Sectors

## Objective
Implement the remaining core mechanics detailed in the `MISSING_*.md` documents. This sprint transforms the game from a static human-only ship combat sim into a procedurally generated roguelike with diverse alien mechanics, autonomous drones, and run-defining passive augmentations.

## Context
The engine currently lacks support for the data defined in `data/drones.json`, `data/augments.json`, `data/crew_stats.json`, and `data/sectors.json`. We need to implement AI for drones, global modifiers for augments, stat overrides for different crew races, and a procedural node generator for the sector map.

---

## Tasks for AI Agent (Claude Code)

### Task 1: Procedural Map & Environmental Hazards (`MISSING_SECTOR_SYSTEMS.md`)
1. **MapGenerator Service:** Remove the hardcoded 5 waypoints. Build a utility that generates a web of connected nodes (beacons) based on `data/sectors.json` parameters.
2. **Hazards:** Implement ECS logic for `ASTEROIDS` (random rock projectiles), `SOLAR_FLARE` (random fires), `ION_STORM` (halved reactor power), and `NEBULA` (sensors disabled).

### Task 2: Alien Crew Mechanics (`MISSING_CREW_SYSTEMS.md`)
1. **Stat Modifiers:** Update `CrewComponent` to use the racial stats defined in `data/crew_stats.json`. Modify `MovementSystem`, `CrewSystem` (repairing/firefighting), and `OxygenSystem` (suffocation) to multiply base values by these stats.
2. **Special Abilities:** - Implement Zoltan power (dynamically add +1 to the system of the room they occupy).
   - Implement Lanius oxygen drain (apply negative oxygen gen to their current room).

### Task 3: Drone Subsystem (`MISSING_DRONE_SYSTEMS.md`)
1. **DroneControlSystem:** Implement the `DRONE_CONTROL` system. It must consume a `dronePart` resource to activate a drone schematic.
2. **Drone AI:** - **External:** Implement orbit logic and auto-firing for Combat/Defense drones.
   - **Internal:** Implement autonomous pathfinding for Repair and Anti-Personnel drones.
   - **Boarding:** Implement logic to launch a drone across the screen, cause a hull breach, and spawn an internal combatant on the enemy ship.

### Task 4: Augmentations (`MISSING_AUGMENT_SYSTEMS.md`)
1. **Global Modifiers:** Update the `ShipComponent` to hold active augments.
2. **Integration:** Inject conditional checks across the codebase. For example:
   - `CombatSystem`: Check for `weapon_pre_igniter` to start combat with full charge.
   - `ShieldSystem`: Check for `zoltan_shield` to grant a 5-HP super shield block layer.
   - `EventSystem`: Check for `scrap_recovery_arm` to apply a 1.1x multiplier to scrap rewards.

---

## Acceptance Criteria
- [ ] A dynamic sector map is generated upon game start.
- [ ] Zoltans provide free power to rooms, and Engi repair systems twice as fast as Humans.
- [ ] Spending a drone part spawns an autonomous entity that fights, repairs, or defends without player input.
- [ ] Passive augments (like Weapon Pre-Igniter) demonstrably change game math without throwing errors.