# MISSING_SHIP_SYSTEMS.md

Integrating diverse player ships and specialized enemies requires expanding the ECS engine to support advanced room systems and unique racial mechanics.

## 1. Drones & Drone Control (`DRONE_CONTROL`)
The Engi Cruiser relies heavily on drones. Currently, the engine only tracks `droneParts` as a static number.
* **DroneSystem:** A new system that handles power allocation to active drones.
* **Drone Entities:** Activating a drone must spawn a new entity with an AI component (either flying outside the ship to shoot/defend, or moving inside the ship to repair/fight).
* **Resource Check:** Activating a drone must consume 1 `dronePart` from `ShipComponent.resources`.

## 2. Teleporter & Boarding (`TELEPORTER`)
The Mantis Cruiser A requires a functioning Teleporter system to board enemy ships.
* **Cross-Ship Pathfinding:** Currently, `Pathfinder.ts` only works within a single ship's local grid. It must be updated to allow moving a `CrewComponent` from one `ShipComponent` to another.
* **Teleporter Logic:** A new `TeleportSystem` must track the cooldown of the teleporter room, read its current power level to determine allowed return-trip speed, and handle the logic of selecting crew members inside the teleporter room and placing them in an enemy room.

## 3. Unmanned Auto-Ships
The `auto_scout` template has no `OXYGEN` system and no crew.
* **System Auto-Repair:** In real FTL, systems on auto-ships slowly repair themselves automatically over time. A `SystemRepairSystem` (or an update to `CombatSystem`) needs to identify unmanned ships and increment system health passively.
* **Breach & Fire Interaction:** Auto-ships cannot have fires (no oxygen) but breaches still cause system damage without needing oxygen depletion. The `OxygenSystem` must safely handle ships where max oxygen capacity is permanently 0.
* **Evasion:** Auto-ships calculate evasion based on `ENGINES` and `PILOTING` without requiring a crew member in the Piloting room. `EvasionSystem` must account for the `isUnmanned` flag.

## 4. Sub-Systems
Your schema currently lists primary systems, but FTL separates core systems from subsystems (which don't consume reactor power).
* **Doors:** `DoorSystem` needs to lock doors against enemy boarders and fire spread. Upgrading the system increases the "health" of doors.
* **Sensors:** Needs to control UI visibility. Level 1 shows enemy rooms, Level 2 shows enemy crew, Level 3 shows enemy weapon charge.
* **Piloting:** Must be manned to provide evasion (unless upgraded). 

## 5. Cloaking (`CLOAKING`)
Used by Stealth cruisers and the Rebel Flagship.
* **CloakingSystem:** When activated, adds +60% to ship Evasion and pauses the weapon charge bars of the enemy ship.
* **Visuals:** Must interact with `RenderSystem` to adjust the alpha transparency of the `SpriteComponent` for the ship.

## 6. Crew Racial Abilities
Currently, all crew share the exact same template. You must implement specific modifiers based on the `race` field in `startingCrew`:
* **Mantis:** Movement speed x1.2, Combat damage x1.5, Repair speed x0.5.
* **Engi:** Repair speed x2.0, Combat damage x0.5.
* **Zoltan:** `PowerSystem` must dynamically grant +1 free reactor power to whichever room the Zoltan is currently standing in. Max health lowered to 70.
* **Rockman:** Immune to fire damage, Movement speed x0.5, Max health raised to 150.