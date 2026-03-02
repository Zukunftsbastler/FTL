# MISSING_SECTOR_SYSTEMS.md

Currently, your `JumpSystem` and `main.ts` rely on a hardcoded array of 5 coordinates to represent the star map. To implement real FTL progression, you need a procedural generation pipeline and new map states.

## 1. Map Generation Service
Instead of hardcoding the map, you need a `MapGenerator` utility that runs when a player enters a new sector.
* **Node Generation:** Randomly scatter nodes (beacons) across a 2D grid, ensuring they don't overlap.
* **Path Generation:** Connect these nodes using a Delaunay triangulation or a simple branching tree algorithm from a "Start" node on the left to an "Exit" node on the right.
* **Population:** Iterate through the generated nodes and assign properties based on the current `SectorTemplate`:
  * Place exactly `storeCount` stores.
  * Roll `Math.random()` against `hazardChance` to assign Asteroid Fields, Sun Flares, or Ion Pulsars.
  * Roll `Math.random()` against `nebulaChance` to make specific nodes hide information and disable sensors.

## 2. The Rebel Fleet Advancement
A core mechanic of FTL is the encroaching Rebel fleet that forces the player forward.
* **Fleet Tracker:** A background system or variable in `GameState` that tracks the "X-coordinate" of the Rebel fleet.
* **Advancement Logic:** Every time the player jumps, the fleet advances by a fixed amount. If the sector is a `NEBULA` (or the specific beacon is a nebula), the advancement is halved.
* **Danger Zone:** If the player jumps to a node whose X-coordinate has been overtaken by the fleet, they must fight an Elite Rebel Fighter, the Anti-Ship Battery (ASB) hazard is active, and the reward is strictly 1 fuel.

## 3. Sector Map UI & Progression
* **Beacon State:** The UI needs to show a map screen. Nodes need states: `VISITED`, `CURRENT`, `REACHABLE` (connected to current), and `HIDDEN`.
* **Sector Tree:** When the player reaches the "Exit" node of the current sector, a new UI must pop up showing a branching path of upcoming sectors (e.g., choose between a Civilian Sector or a Mantis Controlled Sector).

## 4. Environmental Hazards
The `hazardChance` introduces environmental effects that must hook into your ECS:
* **Asteroid Field:** Periodically spawns a `ProjectileComponent` with a rock sprite aimed at a random room on either the player or enemy ship.
* **Sun/Solar Flare:** Periodically starts fires (`FireComponent`) in random rooms on both ships.
* **Plasma Storm:** Instantly reduces the `ReactorComponent.maxPower` of both ships by 50% for the duration of the encounter.
* **Nebula:** Forces the `SENSORS` system to level 0 (or completely disables it), removing visibility into the enemy ship regardless of upgrades.