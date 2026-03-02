# MISSING_DRONE_SYSTEMS.md

Implementing drones introduces a completely new layer of AI, pathfinding, and dynamic entity spawning that your current engine does not yet handle.

## 1. Drone Schema & Sub-systems
* **DroneTemplate & DroneType:** You must define these interfaces in `src/game/data/` to type-check the JSON above. Types should include `EXTERNAL_COMBAT`, `EXTERNAL_DEFENSE`, `INTERNAL_SUPPORT`, `INTERNAL_COMBAT`, and `BOARDING`.
* **DroneControlSystem:** This new system manages the `DRONE_CONTROL` room.
  * **Resource Consumption:** When a player activates a drone schematic, the system must check if `ShipComponent.resources.droneParts >= 1`. If so, decrement it by 1 and spawn the drone entity.
  * **Power Linking:** Drones are only active as long as the `DRONE_CONTROL` system has sufficient power routed to it. If power is removed or the system is damaged, active drones power down (external drones freeze in place, internal drones stop moving).

## 2. External Drones (Combat & Defense)
External drones fly in a rough orbit around their parent or target ship.
* **Movement AI:** A `DroneOrbitComponent` needs to track the orbit radius, speed, and current angle. An `OrbitMovementSystem` updates their `PositionComponent` dynamically relative to the ship's center.
* **Combat Drone Targeting:** `CombatDroneAI` will periodically pick a random room on the enemy ship, aim, and trigger `CombatSystem.fireWeapon` using the drone's assigned `weaponId`.
* **Defense Drone Interception:** `DefenseDroneAI` needs to constantly scan all active `ProjectileComponent` entities approaching the ship. 
  * If a projectile matches its interception profile (e.g., Mark I only targets MISSILE types), it calculates the intersection point.
  * The drone rotates, fires a fast invisible/utility projectile, and destroys the incoming missile before it hits the shield/hull perimeter.

## 3. Internal Drones (Repair & Anti-Personnel)
Internal drones behave essentially like autonomous crew members with distinct rules.
* **Component Mapping:** Internal drones should be spawned with `CrewComponent` (to utilize existing health and movement mechanics) but need a tag like `IsDroneComponent` to prevent players from directly controlling them.
* **AI Behavior Trees (or State Machines):**
  * **Repair Drone AI:** Scans all ship rooms for damaged systems. Uses `Pathfinder` to move to the closest one and triggers the repair logic. If no systems are damaged, it returns to the Drone Control room.
  * **Anti-Personnel AI:** Scans the ship for entities with a hostile `FactionComponent`. Uses `Pathfinder` to intercept and engage in melee combat.
* **Healing Mechanics:** Unlike biological crew, internal drones do not heal in the `MEDBAY`. Instead, they slowly heal over time when idle, or explode when their health reaches 0 (requiring the player to spend another drone part to respawn them).

## 4. Boarding Drones
The most complex drone type, requiring a hybrid of external and internal logic.
* **Phase 1 (External):** Acts as a projectile. Spawns, flies across the screen toward a randomly selected room on the enemy ship. Can be shot down by Defense Drones.
* **Phase 2 (Impact):** Upon collision, applies an automatic Hull Breach to the target room (`BreachComponent`).
* **Phase 3 (Internal):** Spawns an internal drone inside the breached room with hostile `FactionComponent` and Anti-Personnel AI to attack the enemy crew.