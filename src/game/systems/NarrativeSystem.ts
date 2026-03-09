import { AssetLoader }   from '../../utils/AssetLoader';
import { GameStateData } from '../../engine/GameState';
import type { StoryBeat, StoryTemplate } from '../data/StoryTemplate';

/**
 * Intercepts player jumps and dynamically injects story events based on pacing.
 *
 * All methods are static — NarrativeSystem is a pure utility module.
 */
export class NarrativeSystem {
  /**
   * Called by MapSystem.jump() after the jump counter is incremented.
   *
   * Priority order:
   *   1. Intro event (active story, sector 1, first jump, not yet seen).
   *   2. Active story beats (filtered by sectorLevel + condition).
   *   3. General stories pool (data/stories.json entries without currentStoryId).
   *
   * @returns An event ID to inject, or null to proceed with normal dispatch.
   */
  static intercept(): string | null {
    const stories = AssetLoader.getJSON<StoryTemplate[]>('stories') ?? [];

    // Resolve the active story (set by currentStoryId).
    const activeStory = GameStateData.currentStoryId !== null
      ? stories.find((s) => s.id === GameStateData.currentStoryId) ?? null
      : null;

    // ── 1. introEvent — fires once at the very start of a run ────────────────
    if (
      activeStory?.introEvent !== undefined &&
      GameStateData.sectorNumber === 1 &&
      GameStateData.jumpsInCurrentSector === 1
    ) {
      const introFlag = `__intro_${activeStory.id}`;
      if (!GameStateData.narrativeFlags.includes(introFlag)) {
        GameStateData.narrativeFlags.push(introFlag);
        return activeStory.introEvent;
      }
    }

    // ── 2. Active story beats ─────────────────────────────────────────────────
    if (activeStory !== null) {
      const result = NarrativeSystem.checkStory(activeStory);
      if (result !== null) return result;
    }

    // ── 3. General pool (all other loaded stories) ────────────────────────────
    for (const story of stories) {
      if (story.id === GameStateData.currentStoryId) continue; // already checked
      const result = NarrativeSystem.checkStory(story);
      if (result !== null) return result;
    }

    return null;
  }

  /** Reset the sector jump counter. Call this at the start of every new sector. */
  static onSectorStart(): void {
    GameStateData.jumpsInCurrentSector = 0;
    GameStateData.distanceToExit       = 99;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /**
   * Checks a single story's beats against the current game state.
   * Returns the first matching unseen beat's eventId, or null.
   */
  private static checkStory(story: StoryTemplate): string | null {
    const jumps    = GameStateData.jumpsInCurrentSector;
    const sector   = GameStateData.sectorNumber;
    const distance = GameStateData.distanceToExit;

    for (const beat of story.beats) {
      // Filter by sector level when specified.
      if (beat.sectorLevel !== undefined && beat.sectorLevel !== sector) continue;

      // Evaluate trigger condition.
      if (!NarrativeSystem.conditionMet(beat, jumps, distance)) continue;

      // Gate with a per-run seen-flag.
      const seenFlag = `__beat_${story.id}_${beat.eventId}`;
      if (GameStateData.narrativeFlags.includes(seenFlag)) continue;

      GameStateData.narrativeFlags.push(seenFlag);
      return beat.eventId;
    }
    return null;
  }

  private static conditionMet(
    beat:     StoryBeat,
    jumps:    number,
    distance: number,
  ): boolean {
    const { condition } = beat;
    switch (condition.type) {
      case 'JUMP_COUNT':       return jumps    === condition.jumps;
      case 'DISTANCE_TO_EXIT': return distance === condition.distance;
      case 'RANDOM_MAP_INJECT': return false; // handled during map generation
    }
  }
}
