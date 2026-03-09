# SPRINT 63: Hangar Completion & Difficulty Settings

## 1. Sprint Objective
**To the AI Assistant:** The user wants to complete the Hangar menu by adding a Difficulty selection (Easy, Normal, Hard). Instead of tweaking base combat math (which ruins game feel), difficulty will elegantly scale through 4 existing systems: Starting Resources, Reward Multipliers, Rebel Fleet pursuit speed, and ECS Enemy System scaling. We need to implement the UI toggle in the Hangar and wire the `Difficulty` enum into our engine logic.

## 2. Tasks

### A. Difficulty Enum & State (`GameState.ts`)
* **The Fix:** 1. Export a `Difficulty` enum (`EASY`, `NORMAL`, `HARD`).
  2. Add `difficulty: Difficulty` to `GameState` (default `NORMAL`).

### B. Hangar UI Update (`HangarSystem.ts`)
* **The Fix:** Add a prominent difficulty toggle/selector to the Hangar UI (e.g., three clickable cyan pills or a cycling button). Clicking it updates the `GameState.difficulty`. Ensure the selected difficulty is visually highlighted.

### C. Starting Resources Pipeline (`GameState.ts` or `main.ts`)
* **The Fix:** When `startNewRun()` is called upon clicking "LAUNCH", apply starting resources based on difficulty:
  * `EASY`: +30 Scrap, +15 Fuel, +15 Missiles, +10 Drone Parts.
  * `NORMAL`: +10 Scrap, +10 Fuel, +10 Missiles, +5 Drone Parts.
  * `HARD`: 0 Scrap, +10 Fuel, +5 Missiles, +0 Drone Parts.

### D. Economic & Time Scaling (`RewardGenerator.ts` & `MapSystem.ts`)
* **The Fix:** 1. **Scrap:** In `RewardGenerator.ts`, multiply the final generated scrap value based on difficulty (`EASY`: x1.5, `NORMAL`: x1.0, `HARD`: x0.9).
  2. **Pursuit:** In `MapSystem.ts`, multiply the distance the Rebel Fleet advances per jump (`EASY`: x0.85, `NORMAL`: x1.0, `HARD`: x1.1).

### E. ECS Enemy Scaling (`EnemyScaler.ts`)
* **The Fix:** In `EnemyScaler.scaleEnemy`, adjust the effective `sectorLevel` used to calculate the enemy's system points and hull:
  * `EASY`: `effectiveLevel = Math.max(1, sectorLevel - 1)`
  * `NORMAL`: `effectiveLevel = sectorLevel`
  * `HARD`: `effectiveLevel = sectorLevel + 1`

## 3. Success Criteria
* The Hangar allows the player to select Easy, Normal, or Hard.
* Starting a run grants the correct starting resources.
* Scrap rewards naturally feel higher on Easy and starved on Hard.
* The Rebel Fleet advances slower on Easy and faster on Hard.
* Enemies spawn with slightly weaker systems on Easy.
* No TypeScript errors.