# Context
We are developing an FTL clone using an ECS architecture. We need to completely overhaul our `TutorialSystem.ts` (and any related event/UI triggers) to provide a much more granular, step-by-step tutorial experience for the player.

# Instructions
Please update the tutorial logic to implement the following flow exactly as described. You will likely need to add new tutorial states, update message sequences, and use our dynamic UI anchor system to draw arrows pointing to specific UI elements.

## 1. Map Navigation Sequence
- Change the order of the first messages: "Rebel Fleet" must appear *before* "You are here".
- Split the "You are here" message into two separate, sequential steps:
  1. "You are here."
  2. "Click on a nearby location to travel there. This will cost 1 fuel."

## 2. First Combat: Basics & Powering
- When the first combat starts, display a warning that combat has begun and explicitly mention that the player can press Pause.
- Next, warn that weapons need to be activated. Split this into two steps:
  1. Explain that sufficient reactor power must be available to activate weapons.
  2. Explain *how* to route power: Click with LMB on a weapon to power it (RMB to unpower). Note that weapons require different amounts of power.
- As soon as the player clicks to power the weapon, show a message to activate the targeting system (LMB on the activated weapon).
- Once targeting is active, show a message instructing them to select a target: A room inside the enemy ship.

## 3. First Combat: Shields & Weapon Switching
- **Reactive Trigger:** When the laser collapses the enemy's shield for the first time, immediately show a message explaining that lasers do not pierce shields, but merely deactivate them temporarily.
- Follow up with a message instructing the player to deactivate the laser. (Display a visual arrow pointing to the Laser UI element). Instruction: RMB.
- Next, instruct the player to activate the Artemis Missile. (Display a visual arrow pointing to the Artemis Missile). Instruction: LMB.
- Once clicked, instruct to activate targeting (LMB on the Artemis).
- Once targeting is active, instruct to select a target room. Add the hint: "Tip: SHIELDS".
- **Reactive Trigger:** When the enemy shields take damage, show a warning that missiles use limited ammo. (Display a visual arrow pointing to the 'MSL' ammo counter).
- Suggest switching back to the laser since the shield is down and the path is clear.
- Provide final instructions for this phase: Deactivate the missiles, activate the Burst Laser, and target an enemy room.

## 4. Looting & Equipping (First Time Only)
- When a weapon or system is looted/found for the first time, set a tutorial flag.
- When the player returns to the Star Map, display an arrow pointing to the "Ship Menu" button.
- When the menu is opened, display an arrow pointing to the newly acquired system/weapon, with a message that it can now be equipped.
- If the player equips it, during the *next* combat encounter, display an arrow highlighting the newly equipped system on the combat UI, with a message stating that it is now available and can be used if provided with power.

Please analyze `src/game/systems/TutorialSystem.ts` and the UI rendering logic, then implement these chained states, reactive triggers, and visual arrows.