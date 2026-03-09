# SPRINT 47: Enemy Variety and Combat UI

## 1. Sprint Objective
**To the AI Assistant:** The game currently suffers from a lack of enemy variety because most combat events hardcode the `rebel_a` ship ID. We need to introduce new enemy ship templates, map them correctly to their thematic events, and update the combat UI to display the name of the enemy ship you are fighting.

## 2. Tasks

### A. New Enemy Ship Templates (`data/ships.json`)
* **The Problem:** Only a few enemy types exist, leading to repetitive encounters.
* **The Fix:** Add at least 3 new enemy ship templates to `data/ships.json`:
  1. `"pirate_interceptor"` (Pirate theme, mix of weapons, ~8 base Hull)
  2. `"mantis_scout"` (Mantis theme, heavy boarding/weapons focus, ~8 base Hull)
  3. `"auto_assault"` (Advanced automated ship, heavy shields, ~10 base Hull)
* Ensure their layouts, systems, and starting power are balanced for early/mid-game encounters similar to the existing `rebel_a` and `auto_scout`.

### B. Event Mapping Correction (`data/events.json`)
* **The Problem:** Almost all combat events trigger `"rebel_a"`.
* **The Fix:** Update the `triggerCombatWithShipId` field in `data/events.json` to match the thematic context of the event:
  * `pirate_ambush` -> `"pirate_interceptor"`
  * `slaver_start` -> `"pirate_interceptor"` (or a specific slaver ship if you want to create one)
  * `asteroid_miner` -> `"pirate_interceptor"`
  * `nebula_ambush` -> `"auto_assault"` or `"slug_cruiser"`
  * `stranded_mantis` (attacks outcome) -> `"mantis_scout"`
* Ensure standard Rebel events still point to `"rebel_a"` or `"rebel_fighter"`.

### C. Combat UI Enemy Name (`ShipComponent.ts`, `ShipFactory.ts`, `RenderSystem.ts` / UI)
* **The Problem:** The player doesn't know what ship class they are fighting.
* **The Fix:** 1. Add `name: string` to the `ShipComponent` interface.
  2. In `ShipFactory.spawnShip`, read `template.name` and assign it to the new `name` property of the `ShipComponent`.
  3. In the render loop (likely `RenderSystem.ts` or wherever combat UI like the FTL jump button is drawn), if the game is in the `COMBAT` state and an enemy ship exists, draw the enemy's `ship.name` prominently at the top center of the screen (e.g., in a bold, uppercase monospace font, colored red or light grey).

## 3. Success Criteria
* `data/ships.json` contains at least 3 new, functional enemy templates.
* Thematic events correctly spawn these new templates instead of just Rebels.
* `ShipComponent` successfully stores the ship's name.
* The enemy ship's name is prominently displayed at the top of the screen during combat. Does not overlap with existing info elements. 
* No TypeScript errors.