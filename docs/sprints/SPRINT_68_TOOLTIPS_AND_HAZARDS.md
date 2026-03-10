# SPRINT 68: Expanded Tooltips & Suffocation Fix

## 1. Sprint Objective
**To the AI Assistant:** The user requested an expansion of our tooltip system to better explain game mechanics, specifically starting with the Difficulty selector in the Hangar. Additionally, there is a critical bug: at game start, a door is open, the room loses oxygen, but the human pilot inside takes no suffocation damage. We need to fix the hazard/crew logic and add a robust set of tooltips.

## 2. Tasks

### A. Suffocation Bug & Door Defaults (`HazardSystem.ts`, `CrewSystem.ts`, `ships.json`)
* **The Fix:**
  1. Check your ship templates (e.g., `data/ships.json`). Ensure no doors are inadvertently set to `open: true` by default at game start unless it's a specific design choice.
  2. Locate where environmental damage is applied to crew (likely `HazardSystem.ts` or `CrewSystem.ts`).
  3. Ensure that if `room.oxygen < 5` (or whatever your vacuum threshold is), the crew member loses health over time (e.g., `crew.health -= 5 * deltaTime`). 
  4. Ensure this hazard damage applies regardless of whether the game is in `COMBAT` or `STAR_MAP` state (crew should suffocate on the map too).
  5. Make sure oxigen vents whenever there is a breach or an open door toward the outside of the ship. Also make sure the oxigen loss creeps through all open doors from room to room, if this does not already happen. 

### B. Difficulty Tooltips (`HangarSystem.ts`)
* **The Fix:** Add hover tooltips to the Difficulty selection buttons using `UIRenderer.drawTooltip` (or your equivalent tooltip function).
  * `EASY`: "More starting resources. Increased scrap rewards. Slower Rebel Fleet. Weaker enemies."
  * `NORMAL`: "The standard experience. A balanced challenge."
  * `HARD`: "Zero starting scrap. Reduced rewards. Faster Rebel pursuit. Enemies are heavily armed."

### C. Resource & System Tooltips (`UIRenderer.ts` / `CombatSystem.ts` / `MapSystem.ts`)
* **The Fix:** Add hover tooltips for key UI elements:
  1. **Resources (Top Left):** - Fuel: "Required for interstellar jumps."
     - Missiles: "Ammunition required for missile and bomb weapons."
     - Drones: "Parts required to deploy active drones."
     - Scrap: "Currency used in stores and for ship upgrades."
  2. **Ship Systems (Bottom Left in Combat):** Hovering over the Shield, Engine, or Oxygen panels should yield a brief explanation (e.g., "Shields: Regenerates energy barriers to block lasers.", "Oxygen: Replenishes life support. Crew suffocates if empty.").
  3. **Other Important Systems:** Find other important systems (most interactable elements, such as weapons, doors, FTL-Button, etc.) that need explanation, and write appropriate tooltips to make the game more accessible for new players. 

## 3. Success Criteria
* Human crew members correctly lose health and eventually die if standing in a room with zero oxygen.
* Starting ships do not have accidentally opened airlocks.
* Hovering over difficulty settings clearly explains the mechanical changes.
* Hovering over resources, combat systems, and other interactable elements displays helpful tooltips.
* No TypeScript errors.