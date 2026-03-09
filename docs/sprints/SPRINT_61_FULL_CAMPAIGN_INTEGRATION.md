# SPRINT 61: Full Narrative Campaign Integration

## 1. Sprint Objective
**To the AI Assistant:** The user has manually authored 9 additional narrative campaigns (making 10 in total). The events are already in `data/events.json` and the story configurations are in `data/stories/`. Currently, the engine hardcodes `"story_quarantine"` at the start of a run. We need to update the asset loading pipeline to load all 10 story files and implement a random selection mechanism so every new run features a unique overarching storyline.

## 2. Tasks

### A. Asset Loading (`AssetLoader.ts` or equivalent)
* **The Fix:** Ensure that all 10 story JSON files are fetched and registered in the game's data dictionary during startup.
* **The Files:**
  1. `story_quarantine.json`
  2. `story_baddies.json`
  3. `story_simulation.json`
  4. `story_relativity.json`
  5. `story_trojan.json`
  6. `story_bait.json`
  7. `story_omelas.json`
  8. `story_paradox.json`
  9. `story_zoo.json`
  10. `story_amnesia.json`

One of the stories (story_quarantine.json) is still in the data/ folder. Copy it to data/stories/ and rename it appropriately. Make sure to update all references to it. 

### B. Randomized Story Initialization (`GameState.ts` or `main.ts`)
* **The Fix:** Locate the code from Sprint 60 where `GameState.currentStoryId` is initialized to `"story_quarantine"`.
* Replace this hardcoded string with a dynamic random selection from the pool of available story IDs:
  ```typescript
  const availableStories = [
    "story_quarantine", "story_baddies", "story_simulation", 
    "story_relativity", "story_trojan", "story_bait", 
    "story_omelas", "story_paradox", "story_zoo", "story_amnesia"
  ];
  const randomStoryId = availableStories[Math.floor(Math.random() * availableStories.length)];
  Assign randomStoryId to the state so the Narrative Director uses it for the current run.
    ```

## 3. Success Criteria

* All 10 story JSON files are successfully loaded without fetch errors.
* Starting a new run assigns a randomly chosen story ID to the game state.
* No TypeScript errors.