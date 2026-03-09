# SPRINT 60: Story Integration - "The Quarantine Protocol"

## 1. Sprint Objective
**To the AI Assistant:** The user has manually authored the story campaign "The Quarantine Protocol" and saved the data in `data/stories/story_quarantine.json` and `data/events.json`. Your task is to wire up the engine so this story is loaded into memory and actively triggered when a new game run starts.

## 2. Tasks

### A. Asset Loading (`AssetLoader.ts` or equivalent)
* **The Fix:** Ensure that `data/stories/story_quarantine.json` is loaded into the game's data dictionary during startup alongside other assets (like ships, weapons, and events).
* *Hint:* Depending on how stories are fetched in the `AssetLoader`, ensure this specific file/ID is parsed and made available to the `NarrativeSystem`.

### B. Game Initialization (`GameState.ts` or `main.ts`)
* **The Fix:** When a new run starts (where `GameStateData` is initialized or reset), explicitly set `currentStoryId = "story_quarantine"`.
* This ensures the `NarrativeSystem` immediately begins tracking the jump counts and injecting the `sq_beat_*` events right from the start of Sector 1.

## 3. Success Criteria
* `story_quarantine.json` is loaded without fetch errors.
* `GameState` initializes with the quarantine story active.
* No TypeScript errors.