# SPRINT 79: ADVANCED TUTORIAL FLOW

## Objective
Overhaul the existing tutorial system to provide a much more granular, step-by-step introduction to map navigation, combat mechanics, weapon management (powering, targeting, ammo), and inventory management. 

## Context & Motivation
The current tutorial pacing is too fast and lacks specific guidance on core mechanics like weapon power management, shield interactions, and equipping new items. By breaking down actions into micro-steps with visual indicators (arrows), the player can learn the interactions organically without being overwhelmed.

## Key Results
1. **Map Tutorial Adjustments:** Reordered map popups and split the location information from the travel instructions.
2. **Combat Initiation & Power Management:** Added explicit, multi-step instructions for powering up weapons, including power costs and mouse button controls (LMB/RMB).
3. **Targeting & Shield Mechanics:** Added specific triggers for targeting, firing, and a reactive popup when a laser hits a shield (explaining temporary deactivation).
4. **Weapon Switching & Ammo:** Created a sequence requiring the player to unpower the laser, power the Artemis missile, target shields, and learn about limited missile ammo.
5. **Inventory & Equipping:** Added a persistent tutorial trigger that detects the first looted system/weapon, points to the ship menu on the Star Map, guides the equipping process, and highlights the new item in the subsequent combat.

## Technical Tasks
* **Update `TutorialSystem.ts` Map Sequence:**
    * Swap the "Rebel Fleet" and "You are here" messages.
    * Split "You are here" into two distinct sequential messages (Location -> Travel instruction).
* **Implement Combat Step Sequence:**
    * Add pause/combat warning at the start.
    * Implement chained tutorial states for weapon powering (Energy requirement -> LMB/RMB usage).
    * Hook into targeting events to trigger the room selection step.
* **Implement Reactive Combat Triggers:**
    * Add an event listener or check in `CombatSystem.ts` or `TutorialSystem.ts` to detect when a laser collides with a shield to trigger the shield explanation.
* **Add UI Anchors and Arrows:**
    * Extend the dynamic UI anchor system to point specifically to the Burst Laser, the Artemis Missile, the "MSL" ammo counter, and the Ship Menu button.
* **Implement Loot/Equip Tutorial State:**
    * Track when the player receives their first equipment.
    * Render an arrow on the Star Map pointing to the Ship Menu.
    * Render an arrow inside the menu pointing to the new item.
    * Render an arrow on the new system's UI element during the next combat encounter.