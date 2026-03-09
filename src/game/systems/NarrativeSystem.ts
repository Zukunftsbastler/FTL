import { AssetLoader }    from '../../utils/AssetLoader';
import { GameStateData }  from '../../engine/GameState';
import type { StoryTemplate } from '../data/StoryTemplate';

/**
 * Intercepts player jumps and dynamically injects story events based on pacing conditions.
 *
 * All methods are static — NarrativeSystem is a pure utility module.
 */
export class NarrativeSystem {
  /**
   * Called by MapSystem.jump() after the jump counter is incremented.
   *
   * Scans the loaded story templates for any JUMP_COUNT beat whose trigger
   * matches the current sector jump count.  If found (and not already seen
   * this run), marks the beat as seen and returns the beat's eventId so the
   * caller can inject it instead of the normal node event.
   *
   * @returns An event ID to inject, or null if no beat fires.
   */
  static intercept(): string | null {
    const stories = AssetLoader.getJSON<StoryTemplate[]>('stories');
    if (stories === undefined || stories.length === 0) return null;

    const jumps = GameStateData.jumpsInCurrentSector;

    for (const story of stories) {
      for (const beat of story.beats) {
        if (beat.condition.type !== 'JUMP_COUNT') continue;
        if (beat.condition.jumps !== jumps) continue;

        // Gate behind a per-run seen-flag so each beat fires at most once.
        const seenFlag = `__beat_${story.id}_${beat.eventId}`;
        if (GameStateData.narrativeFlags.includes(seenFlag)) continue;

        GameStateData.narrativeFlags.push(seenFlag);
        return beat.eventId;
      }
    }
    return null;
  }

  /** Reset the sector jump counter.  Call this at the start of every new sector. */
  static onSectorStart(): void {
    GameStateData.jumpsInCurrentSector = 0;
  }
}
