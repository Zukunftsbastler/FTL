import { AssetLoader }   from '../../utils/AssetLoader';
import { GameStateData } from '../../engine/GameState';
import type { StoryBeat, StoryTemplate } from '../data/StoryTemplate';

/** All story IDs available in the game.  Each maps to a key in AssetLoader. */
export const ALL_STORY_IDS: readonly string[] = [
  'story_quarantine',
  'story_baddies',
  'story_simulation',
  'story_relativity',
  'story_trojan',
  'story_bait',
  'story_omelas',
  'story_paradox',
  'story_zoo',
  'story_amnesia',
] as const;

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
   *   3. General pool (all other loaded stories, for ambient/shared beats).
   *
   * @returns An event ID to inject, or null to proceed with normal dispatch.
   */
  static intercept(): string | null {
    const storyId     = GameStateData.currentStoryId;
    const activeStory = storyId !== null
      ? AssetLoader.getJSON<StoryTemplate>(storyId) ?? null
      : null;

    // ── 1. introEvent ────────────────────────────────────────────────────────
    if (
      activeStory?.introEvent !== undefined &&
      GameStateData.sectorNumber      === 1 &&
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

    // ── 3. General story pool ─────────────────────────────────────────────────
    for (const id of ALL_STORY_IDS) {
      if (id === storyId) continue; // already checked
      const story = AssetLoader.getJSON<StoryTemplate>(id);
      if (story === undefined) continue;
      const result = NarrativeSystem.checkStory(story);
      if (result !== null) return result;
    }

    return null;
  }

  /** Reset per-sector tracking. Call this at the start of every new sector. */
  static onSectorStart(): void {
    GameStateData.jumpsInCurrentSector = 0;
    GameStateData.distanceToExit       = 99;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private static checkStory(story: StoryTemplate): string | null {
    const jumps    = GameStateData.jumpsInCurrentSector;
    const sector   = GameStateData.sectorNumber;
    const distance = GameStateData.distanceToExit;

    for (const beat of story.beats) {
      if (beat.sectorLevel !== undefined && beat.sectorLevel !== sector) continue;
      if (!NarrativeSystem.conditionMet(beat, jumps, distance)) continue;

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
      case 'JUMP_COUNT':        return jumps    === condition.jumps;
      case 'DISTANCE_TO_EXIT':  return distance === condition.distance;
      case 'RANDOM_MAP_INJECT': return false;
    }
  }
}
