# SPRINT 58: Narrative Engine & Event Flags

## 1. Sprint Objective
**To the AI Assistant:** Static placement of story events on the map leads to missed plot beats if the player chooses a different path. We need to implement a dynamic "Narrative Director" that intercepts player jumps and injects story events based on pacing conditions (e.g., "2nd jump in sector", "2 jumps away from exit"). Furthermore, our event schema needs a massive upgrade: choices must be able to conditionally appear based on the ship's current context (Systems installed, Crew races aboard, specific Resources, and previous narrative Flags).

## 2. Tasks

### A. Extended Event Choice Schema (`EventTemplate.ts`)
* **The Fix:** Upgrade the `EventChoice` interface to support complex, FTL-style "Blue Options" (contextual choices). Add an optional `requirement` object:
  ```typescript
  interface ChoiceRequirement {
    flags?: string[]; // Must have these narrative flags
    system?: { type: SystemType, minLevel: number }; // E.g., TELEPORTER lvl 2
    crewRace?: CrewRace; // E.g., requires at least 1 ENGI
    resource?: { scrap?: number, fuel?: number, missiles?: number, droneParts?: number };
    maxHullPercent?: number; // Only triggers if hull is below X%
  }
  ```
UI Update: In EventSystem.ts or the UI renderer, if a choice is available because of a system or crewRace requirement, prefix the text with [<System/Race Name>] and color the text blue, matching original FTL mechanics.

### B. Story Arc Schema (StoryTemplate.ts)

The Fix: Define how a story arc dictates its pacing. Create an interface for StoryTrigger:

TypeScript
type TriggerCondition = 
  | { type: 'JUMP_COUNT', jumps: number } // Triggers exactly on the N-th jump in the sector
  | { type: 'DISTANCE_TO_EXIT', distance: number } // Triggers when N connected jumps away from EXIT
  | { type: 'RANDOM_MAP_INJECT' }; // Actually placed on a random node during generation (can be missed)

interface StoryBeat {
  eventId: string;
  condition: TriggerCondition;
}
### C. The Narrative Director (NarrativeSystem.ts & MapSystem.ts)

The Fix: 1. Create a NarrativeSystem (or manage this inside MapSystem.ts / GameState).
2. Track jumpsInCurrentSector: number in GameState.
3. The Interceptor: When the player clicks a node to jump to it, before moving the ship and showing the event, the Narrative Director checks the active StoryBeats for the current sector.
4. If a beat's condition is met (e.g., jumpsInCurrentSector === 2), the Director overrides the target node's eventId with the story's eventId. This guarantees the player experiences the story regardless of the physical path they took.

### D. Blueprint Implementation

The Fix: Create one dummy story in data/stories/test_story.json that uses a JUMP_COUNT: 2 trigger, and an event choice that requires a TELEPORTER to be installed. Ensure the logic holds up in-game.

## 3. Success Criteria
* Event choices can now be hidden/shown based on installed systems, crew races, resources, or narrative flags.
* Context-specific choices (e.g., System checks) render in blue text.
* A Narrative Director intercepts jumps and can dynamically overwrite a map node's event to guarantee story delivery based on pacing (jump count).
* No TypeScript errors.