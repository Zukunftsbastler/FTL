# SPRINT 22: UI Interaction Paradigm Overhaul

## 1. Sprint Objective
**To the AI Assistant:** The game's current interaction model is fragmented (using keyboard arrows for power, and mouse for targeting). FTL relies on a strict, muscle-memory-driven paradigm: **Left-Click = Select/Activate/Increase. Right-Click = Command/Cancel/Decrease.**
The goal of this sprint is to completely overhaul the input handling for Power Management and Weapon Control to adhere to this paradigm. Crucially, we must disable the default browser right-click context menu over the game canvas to make this playable.

## 2. Tasks

### A. Disable Browser Context Menu (`src/engine/Input.ts` / `src/main.ts`)
* Add an event listener for `contextmenu` on the canvas (or window).
* Call `e.preventDefault()` inside the listener to stop the browser's default right-click menu from appearing.
* Ensure `Input.ts` correctly registers Right-Click as button index `2` in the `isMouseJustPressed` logic.

### B. Power Management Overhaul (`src/game/systems/PowerSystem.ts`)
* **Remove Old Input:** Delete the logic that listens for `ArrowUp` and `ArrowDown` while hovering over rooms.
* **New UI Hitboxes:** The system icons/bars are currently drawn in the bottom-left dashboard (Player Dashboard). We need to register bounding boxes for these UI elements.
* **New Interaction:**
  * If the player **Left-Clicks** a system's UI element in the dashboard: Call `allocatePower(reactor, system)`.
  * If the player **Right-Clicks** a system's UI element: Call `deallocatePower(reactor, system)`.
* *Note:* You will need to calculate or store the screen coordinates of the system HUD elements in `RenderSystem.ts` so `PowerSystem.ts` knows where to check for clicks.

### C. Weapon Interaction Overhaul (`src/game/systems/TargetingSystem.ts` or `WeaponSystem.ts`)
Weapons now have a three-tier interaction model based on the UI boxes at the bottom of the screen.
* **Left-Click Weapon UI:**
  * If the weapon is *unpowered*: Attempt to draw power from the `WEAPONS` system's current power pool to meet the weapon's `powerRequired`. If successful, set `isPowered = true`.
  * If the weapon is *powered*: Enter Targeting Mode (turn cursor to crosshair, wait for target selection).
* **Right-Click Weapon UI:**
  * Instantly set `isPowered = false`, returning its consumed power back to the `WEAPONS` system pool. Cancel Targeting Mode if it was active for this weapon.
* **Right-Click anywhere during Targeting:**
  * If the player is in Targeting Mode (crosshair active) and Right-Clicks anywhere on the canvas, cancel Targeting Mode and revert the cursor.

### D. Paradigm Validation
* **Crew:** Verify that Crew selection is still Left-Click, and moving them is Right-Click (handled in `SelectionSystem` / `MovementSystem`).
* **Doors:** Verify that opening/closing doors is still a Left-Click toggle (`DoorSystem`).

### E. Pause Toggle
Implement a time control that can be toggled via the space bar to enter pause mode. This should be a "true" tactical pause, meaning virtually zero interactions are prohibited. You can reroute power, target weapons, deploy drones, activate cloaking, open doors, and issue crew orders all while the clock is completely stopped.
However, there is a fundamental difference between issuing a command and executing it, along with a few strict rules about what you cannot do during combat in general.
During the pause, time is stopped, thus you cannot: 
* Execute an FTL jump
* Load weapons
* Resolve Actions

## 3. Success Criteria
* Right-clicking anywhere on the game canvas does NOT open the browser's context menu.
* Power can be routed into systems by Left-Clicking their names/bars in the bottom-left UI, and removed by Right-Clicking.
* Hovering over a system room and pressing UP/DOWN no longer does anything.
* Weapons are powered ON via Left-Clicking their UI box, targeted by Left-Clicking again, and powered OFF by Right-Clicking their UI box.
* Right-clicking while targeting aborts the targeting crosshair.
* Space bar toggles pause mode. 
* No TypeScript errors.