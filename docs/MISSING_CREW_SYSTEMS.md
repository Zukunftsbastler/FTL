# MISSING_CREW_SYSTEMS.md

Your current `CrewComponent` assumes all crew members are identical humans with 100 health. Implementing the diverse races of FTL requires injecting stat multipliers into almost every system that interacts with crew.

## 1. Schema & Component Updates
* **AssetLoader:** Needs to load and cache `crew_stats.json`.
* **CrewComponent:** Needs to be updated to store `race: string`. Upon spawning a crew entity, the engine must look up their race in the stats dictionary and initialize their `maxHealth`, `health`, and a reference to their racial multipliers.

## 2. System Modifications

### `MovementSystem`
* **Speed Modifiers:** When calculating the time it takes to traverse between waypoints, the system must multiply the base traversal speed by the crew member's `movementSpeed` (e.g., Mantis moves 20% faster, Rockmen move 50% slower).

### `CrewSystem`
* **Repairing Systems:** When an Engi (repair x2.0) and a Mantis (repair x0.5) are in the same room repairing a system, `CrewSystem` must sum up their modified repair contributions per tick rather than using a flat rate.
* **Firefighting:** Similar to repairing, crew extinguish fires at a rate determined by their `repairSpeed`.

### `CombatSystem` (Melee Combat)
Your engine does not currently have crew-vs-crew melee combat. When implemented:
* **Damage Calculation:** `CrewSystem` or a new `MeleeCombatSystem` must calculate damage dealt per tick by multiplying base melee damage by the attacker's `combatDamage`.
* **Death Handling (Zoltan):** If a crew member dies, check for the `EXPLODES_ON_DEATH` ability. If present, instantly deal 15 damage to all enemy crew in the same room.

### `OxygenSystem`
* **Suffocation:** When a room's oxygen drops below 5%, crew start taking suffocation damage. Multiply this damage by `suffocationMultiplier` (Lanius take 0, Crystal take half).
* **Lanius Oxygen Drain:** `OxygenSystem` must scan all rooms for Lanius crew members. For every Lanius present, apply a severe negative oxygen generation rate to that specific room, overpowering standard life support refilling.

### `PowerSystem`
* **Zoltan Power:** The most complex racial ability to implement. 
  * Whenever a Zoltan enters a room with a powered system (e.g., Shields, Weapons), `PowerSystem` must dynamically grant +1 "free" power to that system.
  * This free power cannot be removed by the player and overrides standard reactor power limits.
  * When the Zoltan leaves the room or dies, the free power must be immediately revoked. If this causes the system to drop below its required power, the system must depower accordingly.

### `HazardSystem` (Fires)
* **Fire Damage:** When calculating damage dealt to crew by active fires, multiply the damage by `fireDamageMultiplier` (Rockmen take 0 damage from fire).

### `SkillSystem` (New)
* Though not explicitly in the stats JSON, humans in FTL learn skills 10% faster. You will need a `SkillSystem` to track crew proficiency in Piloting, Engines, Shields, Weapons, Repair, and Combat, and apply human bonuses to the XP gain rates.