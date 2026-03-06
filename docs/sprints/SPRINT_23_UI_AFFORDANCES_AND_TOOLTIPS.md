# SPRINT 23: UI Affordances and Rich Tooltips

## 1. Sprint Objective
**To the AI Assistant:** The game's mechanics are deep, but the player currently has to guess what things do or whether an action is valid. The goal of this sprint is to implement FTL-style visual affordances (context-sensitive cursors, strict color-coding for power bars and damage) and "Rich Tooltips" (dense, data-driven hover cards for weapons, crew, and systems). The UI itself must become the manual.

## 2. Tasks

### A. Context-Sensitive Cursors (`src/engine/Input.ts`, `src/game/systems/`)
* We need to dynamically change the browser's cursor (`canvas.style.cursor`) based on the current game state and hover target.
* **Default:** `default` (the standard arrow).
* **Hovering interactive UI (Weapons, Systems in Dashboard):** `pointer` (the clicking hand).
* **Targeting Mode (Weapon selected):** `crosshair`.
* **Crew Selected & Hovering valid room:** `pointer` or `crosshair`.
* **Invalid Action (e.g., hovering an enemy room with crew selected without a teleporter, or a disabled weapon):** `not-allowed` (the red circle with a slash).
* *Implementation Note:* Create a `setCursor(type: string)` method in `Input.ts` or `Renderer.ts` and call it from the respective systems (`SelectionSystem`, `TargetingSystem`, etc.) every frame based on hover logic. Reset to `default` at the start of each frame.

### B. Strict Color-Coding & Power Affordances (`src/game/systems/RenderSystem.ts`)
* **Power Bars:** Update the rendering of system power in the bottom-left dashboard. 
  * Draw the total `maxCapacity` of the system as a row of hollow/empty rectangles (affording that they can be filled).
  * Draw the `currentPower` as solid bright green rectangles filling those hollow slots from left to right.
  * If the system has `damageAmount > 0`, draw the damaged capacity slots in bright red.
* **Room Colors:** Ensure rooms with active hazards (Fire, Breach) or damaged systems have a distinct red tint or red hazard border to instantly communicate danger.

### C. Rich Weapon Tooltips (`src/game/systems/RenderSystem.ts`, `src/engine/Renderer.ts`)
* Upgrade the `drawTooltip` method in `Renderer.ts` to support multi-line text or a structured "Card" format (e.g., drawing a background box that dynamically sizes to fit an array of strings).
* **Weapon Hover:** When hovering over a weapon in the UI, do not just show "Click to fire". Show its exact math:
  * Name
  * Power Required: X
  * Charge Time: X seconds
  * Damage: X (Hull), X (System)
  * Accuracy / Shield Piercing (if applicable)

### D. Rich Crew & System Tooltips
* **Crew Hover:** When hovering over a crew member's shape on the ship grid, display a tooltip card showing:
  * Name & Race (e.g., "Bex - ENGI")
  * Health: `currentHP / maxHP`
  * Skills: List their XP levels (e.g., "Repair: Level 2", "Gunnery: Level 0").
* **System Hover:** When hovering over a system console or its UI bar, show its exact function:
  * e.g., for O2: "Oxygen: Replenishes ship atmosphere at X per second."
  * e.g., for Engines: "Engines: Provides X% Evasion."

## 3. Success Criteria
* The mouse cursor dynamically changes to `crosshair`, `pointer`, or `not-allowed` depending on context.
* Power bars visually show empty capacity vs. filled capacity.
* Damaged systems visibly show red power bars.
* Hovering over weapons, crew, or systems displays a multi-line, data-rich tooltip box instead of a simple instruction string.
* No TypeScript errors.