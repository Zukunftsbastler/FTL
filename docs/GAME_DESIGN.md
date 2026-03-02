# GAME_DESIGN.md: Core FTL Mechanics & Ruleset

## 1. Document Purpose
**To the AI Assistant:** This document defines the core gameplay mechanics, mathematical formulas, and system interactions for this FTL clone. When implementing systems (e.g., `CombatSystem`, `OxygenSystem`), strictly adhere to the rules defined here. Do not invent new mechanics or balance tweaks unless explicitly instructed.

## 2. Ship Infrastructure: The Grid
The game takes place on a 2D grid representing the ship's interior.
* **Tiles:** The smallest unit of space. A tile can contain crew, fire, or a hull breach.
* **Rooms:** Rectangular collections of contiguous tiles (e.g., 2x1, 2x2). A room can house exactly ONE internal System (e.g., Shields, Weapons).
* **Doors:** Connect rooms or vent to the outside (space). Doors have states: Open, Closed, Locked (Blast Doors). 


## 3. The Reactor & Power Routing
Power management is the core mechanic of the game.
* **Reactor Power:** A global integer representing the total available energy on the ship.
* **System Capacity:** Each system has a maximum power capacity (upgradeable).
* **Routing:** Power can be dynamically allocated and de-allocated from systems at any time by the player, provided the system is not damaged or ionized.
* *Rule:* `Sum of allocated power <= Total Reactor Power`

## 4. Primary Ship Systems
Systems are components attached to ship entities. They require power to function.
* **Shields:** Generates bubbles that block 1 incoming projectile (excluding missiles) per layer. Takes 1 power per half-layer (requires 2 power for 1 active shield bubble). Recharges over time.
* **Engines:** Provides evasion base chance and enables FTL jumping. Requires power.
* **Weapons:** Powers weapon slots. If a weapon requires 2 power, the Weapons system must have at least 2 power allocated to it to charge that weapon.
* **Oxygen (O2):** Slowly replenishes oxygen in all rooms. If unpowered or broken, ship oxygen depletes.
* **Medbay:** Heals crew members standing inside its room. Requires power to function.

## 5. Sub-Systems
Sub-systems do not require reactor power, but provide passive benefits based on their upgrade level.
* **Piloting:** Required for the ship to have any evasion. Must be manned by a crew member.
* **Sensors:** Reveals interior of enemy ship.
* **Doors:** Upgrades blast doors to slow down fires and intruders.

## 6. Crew Interactions
Crew members are entities that move along the tile grid.
* **Stats:** Health (100 base), move speed, repair speed, combat damage.
* **Manning:** If a crew member stands at a designated console tile in a specific room (Piloting, Engines, Weapons, Shields), they "man" the system, granting a bonus (e.g., +5% Evasion, +10% Weapon Charge speed).
* **Repairing:** If a system is damaged (capacity reduced below max), crew in the room will automatically repair it over time.
* **Hazards:** Crew slowly lose health in rooms with low Oxygen (< 5%) or active Fire.

## 7. Combat & Damage Math

* **Evasion:** Calculated as: `Base Engine Evasion + Piloting Bonus + Manning Bonus`. Evasion is a percentage chance (0-100%) to completely dodge an incoming projectile.
* **Damage Types:**
    * *System Damage:* Reduces a system's capacity, forcing power to de-allocate.
    * *Hull Damage:* Reduces the global ship health. Game Over at 0.
    * *Ion Damage:* Temporarily locks power in a system, making it unusable.
    * *Crew Damage:* Damages crew directly.
* **Weapon Types:**
    * *Lasers:* Blocked by shields. Deals 1 System/1 Hull damage per shot.
    * *Missiles:* Bypasses shields entirely. Consumes 1 Missile resource.
    * *Beams:* Never miss (cannot be evaded). Draws a line across rooms. Blocked by shields (Shield level reduces beam damage by 1 per layer).

## 8. Environmental Hazards
* **Fire:** Spreads to adjacent tiles. Damages systems and crew. Extinguished by venting the room to space (removing oxygen).
* **Breaches:** Holes in the hull. Instantly drains oxygen from the room. Must be repaired by crew before the room can hold oxygen again.